import type { AiContext, AiProvider, CommitMessage } from '../interfaces'
import { buildUserPrompt, CYBERSECURITY_INSTRUCTION, SYSTEM_PROMPT } from '../prompts'
import { parseAiResponse } from '../helpers'

/** Default Ollama endpoint for local AI generation */
const DEFAULT_OLLAMA_URL = 'http://localhost:11434/api/generate'

export class LocalProvider implements AiProvider {
  // Config usually includes the base URL
  constructor(private baseUrl: string = DEFAULT_OLLAMA_URL) {}

  async generate(
    context: AiContext,
    _apiKey: string, // Not used for local
    model: string,
    timeoutMs: number
  ): Promise<CommitMessage | null> {
    const instruction = context.persona === 'cybersecurity' ? CYBERSECURITY_INSTRUCTION : ''
    const userContent = buildUserPrompt(context) + instruction

    // Check if it's Ollama or OpenAI-compatible local (like LM Studio)
    // Heuristic: Ollama typically uses /api/generate or /api/chat. LM Studio uses /v1/chat/completions.
    // The previous implementation inferred this from URL.

    const isOllamaGenerate = this.baseUrl.includes('/api/generate')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      let response: Response
      if (isOllamaGenerate) {
        // Ollama raw generation
        response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || 'qwen2.5-coder:7b',
            prompt: `${SYSTEM_PROMPT}\n${userContent}`,
            stream: false,
            // Force JSON mode if supported (Ollama supports format: 'json')
            format: 'json'
          }),
          signal: controller.signal
        })
      } else {
        // OpenAI compatible (LM Studio, etc)
        response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || 'local-model',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userContent }
            ],
            temperature: 0.2
          }),
          signal: controller.signal
        })
      }

      if (!response.ok) {
        console.error(`Local AI request failed with status ${response.status}`)
        return null
      }

      let data: { response?: string; choices?: Array<{ message?: { content?: string } }> }
      try {
        data = (await response.json()) as typeof data
      } catch (parseError) {
        console.error('Failed to parse local AI response as JSON:', parseError)
        return null
      }

      let rawText = ''

      if (isOllamaGenerate) {
        rawText = data.response || ''
      } else {
        rawText = data.choices?.[0]?.message?.content || ''
      }

      return parseAiResponse(rawText || '')
    } catch (error) {
      // Log meaningful error context for debugging
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`Local AI request timed out after ${timeoutMs}ms`)
      } else {
        console.error('Local generation failed:', error)
      }
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}
