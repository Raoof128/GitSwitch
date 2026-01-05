import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai'
import type { AiContext, AiProvider, CommitMessage } from '../interfaces'
import { buildUserPrompt, CYBERSECURITY_INSTRUCTION, SYSTEM_PROMPT } from '../prompts'
import { parseAiResponse } from '../helpers'

export class GeminiProvider implements AiProvider {
  async generate(
    context: AiContext,
    apiKey: string,
    model: string,
    timeoutMs: number
  ): Promise<CommitMessage | null> {
    const ai = new GoogleGenAI({ apiKey })

    // Construct the full prompt content
    const instruction = context.persona === 'cybersecurity' ? CYBERSECURITY_INSTRUCTION : ''
    const userContent = buildUserPrompt(context)

    const content = `${SYSTEM_PROMPT}\n${instruction}\n\n---\n\n${userContent}`

    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Gemini request timed out (${Math.round(timeoutMs / 1000)}s)`)),
        timeoutMs
      )
    })

    // No try-catch here - let the orchestrator handle the error so it's visible to the user
    // Configure to accept all content (Git diffs can be flagged falsely as unsafe)
    const responsePromise = ai.models.generateContent({
      model: model || 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: content }]
        }
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
        // responseSchema can cause issues with Gemini Flash returning null/empty fields
        // We rely on the prompt to enforce JSON structure and our robust parser to handle it.
        /*
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' }
          },
          required: ['title', 'description']
        },
        */
        // @ts-ignore - SDK types might be strict, but we want to disable safety checks for code
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          }
        ]
      }
    })

    const result = await Promise.race([responsePromise, timeoutPromise])

    if (!result) {
      throw new Error('No response object returned from Gemini.')
    }

    // The @google/genai SDK returns a GenerateContentResult which contains a 'response' property.
    // The 'response' property (EnhancedGenerateContentResponse) is what has the text() method.
    // However, sometimes it might be flat depending on version/mocks. We'll check carefully.

    let text = ''
    try {
      // The @google/genai SDK returns a result that can have different structures
      // depending on the model and configuration. We handle the most common ones.
      const res = result as {
        text?: () => string
        response?: { text: () => string }
      }
      if (typeof res.text === 'function') {
        text = res.text()
      } else if (res.response && typeof res.response.text === 'function') {
        text = res.response.text()
      } else {
        // Fallback: try to read candidates directly if methods fail
        // @ts-ignore: Fallback for different SDK response structures
        const candidate = result.response?.candidates?.[0] || result.candidates?.[0]
        if (
          candidate &&
          candidate.content &&
          candidate.content.parts &&
          candidate.content.parts[0]
        ) {
          text = candidate.content.parts[0].text || ''
        }
      }
    } catch (e) {
      throw new Error(
        `Failed to extract text from Gemini response: ${e instanceof Error ? e.message : String(e)}`
      )
    }

    if (!text) {
      throw new Error(
        'Gemini returned empty text. This might be due to safety filters or an internal model error.'
      )
    }

    const parsed = parseAiResponse(text)
    if (!parsed) {
      throw new Error(`Failed to parse Gemini JSON: ${text.slice(0, 100)}...`)
    }

    return parsed
  }
}
