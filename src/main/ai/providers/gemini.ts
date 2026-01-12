import { GoogleGenAI, HarmCategory, HarmBlockThreshold, type SafetySetting } from '@google/genai'
import type { AiContext, AiProvider, CommitMessage } from '../interfaces'
import { buildUserPrompt, CYBERSECURITY_INSTRUCTION, SYSTEM_PROMPT } from '../prompts'
import { parseAiResponse } from '../helpers'

/** Response structure for Gemini SDK candidates */
interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>
  }
}

/** Possible response structures from Gemini SDK */
interface GeminiResponse {
  text?: () => string
  response?: {
    text: () => string
    candidates?: GeminiCandidate[]
  }
  candidates?: GeminiCandidate[]
}

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

    // Safety settings to disable content filtering for code diffs
    const safetySettings: SafetySetting[] = [
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

    // No try-catch here - let the orchestrator handle the error so it's visible to the user
    // Configure to accept all content (Git diffs can be flagged falsely as unsafe)
    const responsePromise = ai.models.generateContent({
      model: model || 'gemini-3-flash',
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
        safetySettings
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
      const res = result as GeminiResponse
      if (typeof res.text === 'function') {
        text = res.text()
      } else if (res.response && typeof res.response.text === 'function') {
        text = res.response.text()
      } else {
        // Fallback: try to read candidates directly if methods fail
        const candidate = res.response?.candidates?.[0] ?? res.candidates?.[0]
        if (candidate?.content?.parts?.[0]) {
          text = candidate.content.parts[0].text ?? ''
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
