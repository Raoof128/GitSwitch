// -------------------------------------------------------------------------- //
//                                   IMPORTS                                  //
// -------------------------------------------------------------------------- //

import { simpleGit } from 'simple-git'
import type { CommitMessage, GitStatus } from '../../index'
import { generateOfflineCommitMessage } from '../git/commit-generator'
import { getSettings, loadAiKey } from '../secure/key-manager'
import { tryGemini } from './providers/gemini'

// -------------------------------------------------------------------------- //
//                                    TYPES                                   //
// -------------------------------------------------------------------------- //

type AiResult = {
  body?: string
  title: string
}

type ChangeFile = {
  path: string
  status: string
}

type ContextPayload = {
  branch: string | null
  diffSnippet: string
  files: ChangeFile[]
  status: GitStatus
}

type LocalLlmConfig = {
  model: string
  url: string
}

// -------------------------------------------------------------------------- //
//                                  CONSTANTS                                 //
// -------------------------------------------------------------------------- //

const DEFAULT_DIFF_BYTES = 80 * 1024
const DEFAULT_DIFF_LINES = 400
const LOCAL_TIMEOUT_MS = 6000
const CLOUD_TIMEOUT_MS = 7000
const DEFAULT_OLLAMA_URL = 'https://localhost:11434/api/generate'
const DEFAULT_OLLAMA_MODEL = 'qwen2.5-coder:7b'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10
const requestTimestamps: number[] = []

// -------------------------------------------------------------------------- //
//                                   HELPERS                                  //
// -------------------------------------------------------------------------- //

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

const truncateDiff = (input: string, maxLines: number, maxBytes: number): string => {
  if (!input) return ''
  const lines = input.split('\n')
  const result: string[] = []
  let bytes = 0

  for (const line of lines) {
    const nextBytes = bytes + Buffer.byteLength(line, 'utf8') + 1
    if (result.length >= maxLines || nextBytes > maxBytes) {
      result.push('[TRUNCATED]')
      break
    }
    result.push(line)
    bytes = nextBytes
  }

  return result.join('\n')
}

const buildPrompt = (payload: ContextPayload, persona?: string): string => {
  const files = payload.files.map((file) => `- ${file.status} ${file.path}`).join('\n')
  const diffBlock = payload.diffSnippet
    ? `\nDiff snippet:\n${payload.diffSnippet}\n`
    : '\nDiff snippet: (none)\n'

  const personaInstruction =
    persona === 'cybersecurity'
      ? 'Focus on security implications, vulnerability fixes, and code safety. Highlight any security improvements or risks.'
      : 'Describe WHAT changed, never invent WHY.'

  return [
    'You are a commit message generator.',
    'Return JSON only: {"title":"...","body":"..."}',
    'Rules:',
    '- Title: imperative, <= 72 chars preferred, no trailing period.',
    `- Body: bullet list, max 4 bullets, ${personaInstruction}`,
    '- Do not hallucinate files or behavior.',
    '',
    `Branch: ${payload.branch ?? 'unknown'}`,
    'Files:',
    files || '(none)',
    diffBlock
  ].join('\n')
}

const normalizeResult = (input: AiResult | null): CommitMessage | null => {
  if (!input?.title) return null
  const title = input.title.trim().replace(/\.$/, '').slice(0, 200)
  if (!title) return null

  const body = input.body?.trim()
  if (!body) {
    return { title }
  }

  const bullets = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .slice(0, 4)

  if (!bullets.length) {
    return { title }
  }

  return { title, body: bullets.join('\n') }
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

const parseJsonResponse = (raw: string): AiResult | null => {
  if (!raw) return null
  const trimmed = raw.trim()
  const jsonText = trimmed
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim()

  try {
    const parsed = JSON.parse(jsonText) as AiResult
    // Enhanced validation for security
    if (!parsed.title || typeof parsed.title !== 'string') return null
    if (parsed.body && typeof parsed.body !== 'string') return null
    if (parsed.title.length > 200) return null

    return parsed
  } catch {
    return null
  }
}

const resolveLocalConfigs = (url: string, model: string): LocalLlmConfig[] => {
  const resolvedModel = model || DEFAULT_OLLAMA_MODEL
  const resolvedUrl = url.trim()

  if (resolvedUrl) {
    return [{ model: resolvedModel, url: resolvedUrl }]
  }

  return [
    { model: resolvedModel, url: DEFAULT_OLLAMA_URL },
    { model: resolvedModel, url: 'https://localhost:1234/v1/chat/completions' }
  ]
}

const callOllama = async (
  config: LocalLlmConfig,
  prompt: string,
  timeoutMs: number
): Promise<AiResult | null> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        prompt,
        stream: false
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as { response?: string }
    return parseJsonResponse(data.response ?? '')
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const callLocalChat = async (
  config: LocalLlmConfig,
  prompt: string,
  timeoutMs: number
): Promise<AiResult | null> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content ?? ''
    return parseJsonResponse(content)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const checkRateLimit = (): boolean => {
  const now = Date.now()
  const recentRequests = requestTimestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
  )
  requestTimestamps.length = 0
  requestTimestamps.push(...recentRequests, now)
  return recentRequests.length < MAX_REQUESTS_PER_WINDOW
}

const testLocalLlmConnection = async (
  config: LocalLlmConfig,
  timeoutMs: number
): Promise<boolean> => {
  const isOllama = config.url.includes('/api/generate')
  const result = isOllama
    ? await callOllama(config, 'ping', timeoutMs)
    : await callLocalChat(config, 'ping', timeoutMs)
  return Boolean(result?.title || result?.body || result)
}

const tryLocalLlm = async (
  prompt: string,
  url: string,
  model: string,
  timeoutMs: number
): Promise<CommitMessage | null> => {
  const configs = resolveLocalConfigs(url, model)
  if (!configs.length) {
    return null
  }

  for (const config of configs) {
    const isOllama = config.url.includes('/api/generate')
    const result = isOllama
      ? await callOllama(config, prompt, timeoutMs)
      : await callLocalChat(config, prompt, timeoutMs)
    const normalized = normalizeResult(result)
    if (normalized) {
      return normalized
    }
  }

  return null
}

const tryCloudLlm = async (
  prompt: string,
  modelOverride: string,
  timeoutMs: number
): Promise<CommitMessage | null> => {
  // Rate limiting check
  if (!checkRateLimit()) {
    return null
  }

  let apiKey = await loadAiKey()
  if (!apiKey) {
    return null
  }

  const model = modelOverride || DEFAULT_OPENAI_MODEL
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You output JSON only.' },
          { role: 'user', content: prompt }
        ]
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content ?? ''
    return normalizeResult(parseJsonResponse(content))
  } catch {
    return null
  } finally {
    // Immediately wipe API key from memory
    apiKey = ''
    // Clear potential reference from call stack
    setTimeout(() => {}, 0)
    clearTimeout(timer)
  }
}

const collectContext = async (
  repoPath: string,
  options: { diffLimitLines: number; diffLimitKb: number; redact: boolean }
): Promise<ContextPayload> => {
  const git = simpleGit({ baseDir: repoPath })
  const status = await git.status()

  const stagedPaths = status.staged.length ? status.staged : status.files.map((file) => file.path)
  const files = status.files
    .filter((file) => stagedPaths.includes(file.path))
    .map((file) => ({
      path: file.path,
      status: file.index && file.index !== ' ' ? file.index : file.working_dir || 'M'
    }))

  const diffArgs = status.staged.length ? ['--cached'] : ['HEAD']
  let diff = ''
  try {
    diff = await git.diff(diffArgs)
  } catch {
    diff = ''
  }
  const maxBytes = options.diffLimitKb > 0 ? options.diffLimitKb * 1024 : DEFAULT_DIFF_BYTES
  const maxLines = options.diffLimitLines > 0 ? options.diffLimitLines : DEFAULT_DIFF_LINES
  const diffContent = options.redact ? redactSecrets(diff) : diff
  const diffSnippet = truncateDiff(diffContent, maxLines, maxBytes)

  return {
    branch: status.current,
    diffSnippet,
    files,
    status: {
      current: status.current,
      ahead: status.ahead,
      behind: status.behind,
      files: status.files.map((file) => ({
        path: file.path,
        index: file.index,
        working_dir: file.working_dir
      })),
      staged: status.staged
    }
  }
}

// -------------------------------------------------------------------------- //
//                                   EXPORTS                                  //
// -------------------------------------------------------------------------- //

export async function generateCommitMessage(repoPath: string): Promise<CommitMessage> {
  const settings = getSettings()
  const timeoutMs = settings.aiTimeoutSec > 0 ? settings.aiTimeoutSec * 1000 : CLOUD_TIMEOUT_MS
  let payload: ContextPayload
  try {
    payload = await collectContext(repoPath, {
      diffLimitKb: settings.diffLimitKb,
      diffLimitLines: settings.diffLimitLines,
      redact: settings.aiRedactionEnabled
    })
  } catch (error) {
    console.error('Context collection failed:', error)
    // Return safe fallback to prevent crashes
    payload = {
      branch: null,
      files: [],
      status: { current: null, ahead: 0, behind: 0, files: [], staged: [] },
      diffSnippet: ''
    }
  }
  const offline = generateOfflineCommitMessage({
    branch: payload.branch,
    status: payload.status,
    files: payload.files
  })
  const allowedPaths = new Set(payload.files.map((file) => file.path))

  if (settings.aiProvider === 'offline') {
    return offline
  }

  const promptBase = buildPrompt(
    {
      ...payload,
      diffSnippet: payload.diffSnippet
    },
    settings.aiPersona
  )
  const prompt = settings.aiRedactionEnabled ? redactSecrets(promptBase) : promptBase

  if (settings.aiProvider === 'local') {
    const local = await tryLocalLlm(prompt, settings.aiLocalUrl, settings.aiLocalModel, timeoutMs)
    if (local && !hasUnknownPaths(local, allowedPaths)) {
      return local
    }
    return offline
  }



  const isGemini = settings.aiCloudModel?.toLowerCase().includes('gemini')
  const cloud = isGemini
    ? await tryGemini(
        payload.diffSnippet,
        payload.files,
        payload.branch,
        settings.aiRedactionEnabled,
        settings.aiCloudModel,
        settings.aiPersona
      )
    : await tryCloudLlm(prompt, settings.aiCloudModel, timeoutMs)

  if (cloud && !hasUnknownPaths(cloud, allowedPaths)) {
    return cloud
  }
  return offline
}

export async function testLocalLlm(url: string, model: string): Promise<boolean> {
  if (!url || !model) {
    return false
  }
  return testLocalLlmConnection({ url, model }, LOCAL_TIMEOUT_MS)
}
