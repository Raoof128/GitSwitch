
import { GoogleGenAI } from '@google/genai'
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
      setTimeout(() => reject(new Error(`Gemini request timed out (${Math.round(timeoutMs / 1000)}s)`)), timeoutMs)
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
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            body: { type: 'STRING' }
          },
          required: ['title']
        },
        // @ts-ignore - SDK types might be strict, but we want to disable safety checks for code
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
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
      // @ts-ignore - Handle various SDK return shapes dynamically for robustness
      if (typeof result.text === 'function') {
        // @ts-ignore
        text = result.text()
      } else if (result.response && typeof result.response.text === 'function') {
        // Standard path for GoogleGenAI SDK
        text = result.response.text()
      } else {
         // Fallback: try to read candidates directly if methods fail
         // @ts-ignore
         const candidate = result.response?.candidates?.[0] || result.candidates?.[0]
         if (candidate && candidate.content && candidate.content.parts && candidate.content.parts[0]) {
            text = candidate.content.parts[0].text || ''
         }
      }
    } catch (e) {
      throw new Error(`Failed to extract text from Gemini response: ${e instanceof Error ? e.message : String(e)}`)
    }

    if (!text) {
      throw new Error('Gemini returned empty text. This might be due to safety filters or an internal model error.')
    }

    const parsed = parseAiResponse(text)
    if (!parsed) {
      throw new Error(`Failed to parse Gemini JSON: ${text.slice(0, 100)}...`)
    }

    return parsed
  }
}
