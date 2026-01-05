import type { AiContext, AiProvider, CommitMessage } from '../interfaces'
import { buildUserPrompt, CYBERSECURITY_INSTRUCTION, SYSTEM_PROMPT } from '../prompts'
import { parseAiResponse } from '../helpers'

export class AnthropicProvider implements AiProvider {
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
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-latest',
          max_tokens: 1024,
          temperature: 0.2,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }]
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        console.error('Anthropic API error:', response.status, await response.text())
        return null
      }

      const data = (await response.json()) as { content?: Array<{ text?: string }> }
      // Anthropic returns an array of content blocks, usually the first one is text
      const text = data.content?.[0]?.text || ''
      return parseAiResponse(text)
    } catch (error) {
      console.error('Anthropic generation failed:', error)
      return null
    } finally {
      clearTimeout(timer)
    }
  }
}
