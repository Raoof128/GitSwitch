
import type { AiContext, AiProvider, CommitMessage } from '../interfaces'
import { buildUserPrompt, CYBERSECURITY_INSTRUCTION, SYSTEM_PROMPT } from '../prompts'
import { parseAiResponse } from '../helpers'

export class LocalProvider implements AiProvider {
  // Config usually includes the base URL
  constructor(private baseUrl: string = 'http://localhost:11434/api/generate') {}

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

      if (!response.ok) return null
      
      const data = await response.json() as any
      let rawText = ''
      
      if (isOllamaGenerate) {
        rawText = data.response
      } else {
        rawText = data.choices?.[0]?.message?.content
      }

      return parseAiResponse(rawText || '')
    } catch (error) {
      console.error('Local generation failed:', error)
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}
