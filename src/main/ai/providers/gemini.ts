import { GoogleGenAI } from '@google/genai'
import type { CommitMessage } from '../../../index'
import { loadAiKey } from '../../secure/key-manager'

const DEFAULT_MODEL = 'gemini-1.5-flash'
const MAX_CHARS = 80_000
const TIMEOUT_MS = 8_000

const GEMINI_COMMIT_PROMPT = `
You are an expert Git commit message author for a professional open-source project.

PROJECT CONTEXT
Project name: GitSwitch
Type: Electron desktop Git client
Focus: security, correctness, UX polish, and developer tooling
Audience: professional developers and security engineers

TASK
Generate a high-quality Git commit message based ONLY on provided changes.

OUTPUT FORMAT (STRICT)
Return JSON ONLY in this exact shape:

{
  "title": "string",
  "body": "string | null"
}

No markdown.
No explanations.
No extra keys.
No surrounding text.

COMMIT TITLE RULES
- Imperative mood (e.g. add, fix, refine, update)
- No trailing period
- Prefer <= 72 characters
- Format: type(scope): summary
- Scope optional if unclear

Allowed types:
feat, fix, refactor, style, docs, chore, test, perf, security

COMMIT BODY RULES
- Optional
- Use only if more than 3 files changed OR multiple scopes OR security-related
- Bullet list
- Max 4 bullets
- Describe WHAT changed, never WHY

ABSOLUTE CONSTRAINTS
- Do NOT invent files or behaviour
- Do NOT assume intent
- Do NOT mention AI
- If unsure, return:
{
  "title": "chore: update files",
  "body": null
}

BEGIN.
`

const redactSecrets = (input: string): string => {
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

const extractPaths = (text: string): string[] => {
  const matches = text.match(/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+/g)
  if (!matches) {
    return []
  }
  return matches.map((match) => match.replace(/[.,:;)]$/, ''))
}

const hasUnknownPaths = (message: CommitMessage, allowed: Set<string>): boolean => {
  const combined = `${message.title}\n${message.body ?? ''}`
  const paths = extractPaths(combined)
  return paths.some((path) => !allowed.has(path))
}

export async function tryGemini(
  diffSnippet: string,
  files: Array<{ path: string; status: string }>,
  branch: string | null,
  redact: boolean,
  modelName?: string,
  persona?: string
): Promise<CommitMessage | null> {
  let apiKey = await loadAiKey()
  if (!apiKey) return null

  const modelToUse = modelName || DEFAULT_MODEL
  let safeInput = diffSnippet
  if (redact) safeInput = redactSecrets(diffSnippet)

  if (safeInput.length > MAX_CHARS) {
    safeInput = safeInput.slice(0, MAX_CHARS) + '\n[TRUNCATED]'
  }

  const context = [
    `Branch: ${branch ?? 'unknown'}`,
    'Files:',
    ...files.map((file) => `- ${file.status} ${file.path}`),
    '',
    'Diff snippet:',
    safeInput
  ].join('\n')

  const personaInstruction =
    persona === 'cybersecurity'
      ? '\n\nADDITIONAL INSTRUCTIONS:\nFocus significantly on security implications, vulnerability fixes, and code safety. Highlight any security improvements or risks in the body.'
      : ''

  console.log('[Gemini] Initializing with model:', modelToUse)
  const ai = new GoogleGenAI({ apiKey })
  // Immediately wipe API key from local scope
  apiKey = ''

  // Create timeout promise for proper timeout handling
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error('Gemini timeout')), TIMEOUT_MS)
  })

  try {
    console.log('[Gemini] Sending request...')
    const responsePromise = ai.models.generateContent({
      model: modelToUse,
      contents: [
        {
          role: 'user',
          parts: [{ text: GEMINI_COMMIT_PROMPT + personaInstruction + '\n\n---\n\n' + context }]
        }
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 256,
        responseMimeType: 'application/json'
      }
    })

    // Race between API call and timeout
    const response = await Promise.race([responsePromise, timeoutPromise])
    if (!response) {
      console.error('[Gemini] No response received')
      return null
    }

    console.log('[Gemini] Response received')
    const text = response.text?.trim()
    if (!text) {
      console.error('[Gemini] Empty text in response')
      return null
    }

    let jsonText = text

    const textMatch = jsonText.match(/"text"\\s*:\\s*"([^"]*(?:\\.[^"]*)*)"/)
    if (textMatch) jsonText = textMatch[1]

    jsonText = jsonText
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()

    const parsed = JSON.parse(jsonText) as { title?: string; body?: string | null }

    if (typeof parsed?.title !== 'string' || parsed.title.length < 1 || parsed.title.length > 200) {
      return null
    }

    const body = typeof parsed.body === 'string' && parsed.body.trim() ? parsed.body : null
    const result: CommitMessage = {
      title: parsed.title,
      body: body || undefined
    }

    const allowedPaths = new Set(files.map((file) => file.path))
    if (hasUnknownPaths(result, allowedPaths)) return null

    return result
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error)
    console.error('[Gemini] Generation failed details:', errorDetails)
    console.error('[Gemini] Full error:', JSON.stringify(error, null, 2))
    return null
  }
}
