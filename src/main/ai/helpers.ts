import type { CommitMessage } from './interfaces'

export function parseAiResponse(text: string): CommitMessage | null {
  if (!text) return null
  let jsonText = text.trim()

  // Remove markdown code blocks if present
  // Matches ```json ... ``` or just ``` ... ```
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  } else {
    // Handle unclosed blocks or simple framing
    jsonText = jsonText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
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
    console.warn('[AI Parser] detailed JSON parse failed, attempting regex fallback:', initialError)

    // We look for title and description specifically
    const titleMatch = jsonText.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)

    // Check for "description" (our new field) or "body" (legacy/fallback)
    const descMatchString = jsonText.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    const bodyMatchString = jsonText.match(/"body"\s*:\s*"((?:[^"\\]|\\.)*)"/)

    const descMatch = descMatchString || bodyMatchString

    if (titleMatch) {
      // Unescape the string content captured by regex (e.g. \" becomes ")
      const unescape = (str: string): string => {
        try {
          return JSON.parse(`"${str}"`)
        } catch {
          return str
        }
      }
      return {
        title: unescape(titleMatch[1]),
        body: descMatch ? unescape(descMatch[1]) : undefined
      }
    }

    console.error('[AI Parser] All parsing attempts failed on:', jsonText)
    return null
  }
}

function validateAndReturn(parsed: unknown): CommitMessage | null {
  if (!parsed || typeof parsed !== 'object') {
    console.error('[AI Parser] Result is not an object:', parsed)
    return null
  }

  const p = parsed as Record<string, unknown>

  if (typeof p.title !== 'string') {
    console.error('[AI Parser] Title is not a string:', p.title)
    return null
  }

  // Normalize
  const title = p.title.trim()
  if (!title) return null

  // Support both 'description' (new) and 'body' (legacy) keys
  let body: string | undefined = undefined
  if (typeof p.description === 'string') {
    body = p.description.trim()
  } else if (typeof p.body === 'string') {
    body = p.body.trim()
  }

  return {
    title,
    body
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
