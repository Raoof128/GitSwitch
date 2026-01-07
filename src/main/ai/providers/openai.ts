import type { AiContext, AiProvider, CommitMessage } from '../interfaces'
import { buildUserPrompt, CYBERSECURITY_INSTRUCTION, SYSTEM_PROMPT } from '../prompts'
import { parseAiResponse } from '../helpers'

export class OpenAIProvider implements AiProvider {
  async generate(
    context: AiContext,
    apiKey: string,
    model: string,
    timeoutMs: number
  ): Promise<CommitMessage | null> {
    const instruction = context.persona === 'cybersecurity' ? CYBERSECURITY_INSTRUCTION : ''
    const userContent = buildUserPrompt(context) + instruction

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent }
          ],
          temperature: 0.2,
          max_tokens: 512,
          // Valid JSON object output for newer models
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        console.error('OpenAI API error:', response.status, await response.text())
        return null
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      return parseAiResponse(data.choices?.[0]?.message?.content || '')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`OpenAI generation failed: ${message}`, error)
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}
