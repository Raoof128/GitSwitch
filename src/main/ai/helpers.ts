
import type { CommitMessage } from './interfaces'

export function parseAiResponse(text: string): CommitMessage | null {
  if (!text) return null
  let jsonText = text.trim()

  // Remove markdown code blocks if present
  // Matches ```json ... ``` or just ``` ... ```
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  // Attempt to clean simple leading/trailing characters if strict parse fails
  // Sometimes models output `Here is your JSON: { ... }`
  const firstBrace = jsonText.indexOf('{')
  const lastBrace = jsonText.lastIndexOf('}')
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1)
  }

  // Sanitize potential unescaped newlines within string values
  // A simple heuristic: remove control chars that aren't valid in JSON (0x00-0x1F) except allowed ones
  // But strict JSON requires newlines in strings to be \n. LLMs often output actual newlines.
  // We can try to catch this.
  
  // Try standard parse first
  try {
     const parsed = JSON.parse(jsonText)
     return validateAndReturn(parsed)
  } catch (initialError) {
      // Fallback: Try to "fix" common JSON issues from LLMs
      try {
         // 1. Replace real newlines with \n inside the string
         const fixed = jsonText.replace(/\n/g, '\\n').replace(/\r/g, '')
         const parsed = JSON.parse(fixed)
         return validateAndReturn(parsed)
      } catch {
         // 2. Last resort: regex extraction for title/body logic if JSON is hopelessly broken
         // This is a "fuzzy" parser
         const titleMatch = jsonText.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)
         const bodyMatch = jsonText.match(/"body"\s*:\s*"((?:[^"\\]|\\.)*)"/)
         
         if (titleMatch) {
             return {
                 title: titleMatch[1],
                 body: bodyMatch ? bodyMatch[1] : undefined
             }
         }
         
         console.error('[AI Parser] All parsing attempts failed on:', jsonText)
         return null
      }
  }
}

function validateAndReturn(parsed: any): CommitMessage | null {
    if (!parsed || typeof parsed !== 'object') {
       console.error('[AI Parser] Result is not an object:', parsed)
       return null
    }

    if (typeof parsed.title !== 'string') {
        console.error('[AI Parser] Title is not a string:', parsed.title)
        return null
    }
    
    // Normalize
    const title = parsed.title.trim()
    // 200 char limit is good but let's relax just a bit for long summary commits if user wants
    // or just truncate it. Let's return valid object and let UI handle truncation if absolutely needed.
    // Actually the app enforces 200 limit in validation layers.
    if (!title) return null
    
    return {
      title,
      body: typeof parsed.body === 'string' ? parsed.body.trim() : undefined
    }
}

export function redactSecrets(input: string): string {
   const patterns: Array<[RegExp, string]> = [
    [/-----BEGIN[\s\S]*?PRIVATE KEY-----[\s\S]*?-----END[\s\S]*?PRIVATE KEY-----/gi, '[REDACTED]'],
    [/\bghp_[A-Za-z0-9]{10,}\b/g, '[REDACTED]'],
    [/\bgithub_pat_[A-Za-z0-9_]{10,}\b/g, '[REDACTED]'],
    [/\bglpat-[A-Za-z0-9_-]{20,}\b/g, '[REDACTED]'],
    [/\bsk-[A-Za-z0-9]{10,}\b/g, '[REDACTED]'],
    [/\bxoxb-[A-Za-z0-9]{10,}\b/g, '[REDACTED]'],
    [/\bAIza[0-9A-Za-z_-]{10,}\b/g, '[REDACTED]'],
    [/\bpassword\s*=\s*[^\s]+/gi, 'password=[REDACTED]'],
    [/\bsecret\s*=\s*[^\s]+/gi, 'secret=[REDACTED]'],
    [/\bapiKey\s*=\s*[^\s]+/gi, 'apiKey=[REDACTED]']
  ]

  return patterns.reduce((acc, [regex, replacement]) => acc.replace(regex, replacement), input)
}
