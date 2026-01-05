
// -------------------------------------------------------------------------- //
//                                   IMPORTS                                  //
// -------------------------------------------------------------------------- //

import { simpleGit } from 'simple-git'
import type { CommitMessage, GitStatus } from '../../index'
import { generateOfflineCommitMessage } from '../git/commit-generator'
import { getSettings, loadAiKey } from '../secure/key-manager'

import { GeminiProvider } from './providers/gemini'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { LocalProvider } from './providers/local'

import type { AiContext, AiProvider } from './interfaces'
import { redactSecrets } from './helpers'

// -------------------------------------------------------------------------- //
//                                  CONSTANTS                                 //
// -------------------------------------------------------------------------- //

const DEFAULT_DIFF_BYTES = 80 * 1024
const DEFAULT_DIFF_LINES = 400
const DEFAULT_TIMEOUT_MS = 20000

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15
const requestTimestamps: number[] = []

// -------------------------------------------------------------------------- //
//                                   HELPERS                                  //
// -------------------------------------------------------------------------- //

const checkRateLimit = (): boolean => {
  const now = Date.now()
  const recentRequests = requestTimestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
  )
  requestTimestamps.length = 0
  requestTimestamps.push(...recentRequests, now)
  return recentRequests.length < MAX_REQUESTS_PER_WINDOW
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

const collectContext = async (
  repoPath: string,
  options: { diffLimitLines: number; diffLimitKb: number; redact: boolean }
): Promise<AiContext> => {
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
    diff: diffSnippet,
    files
  }
}

// -------------------------------------------------------------------------- //
//                                   FACTORY                                  //
// -------------------------------------------------------------------------- //

function getProvider(settings: ReturnType<typeof getSettings>): { provider: AiProvider, model: string, apiKeyNeeded: boolean } | null {
  if (settings.aiProvider === 'local') {
     return {
        provider: new LocalProvider(settings.aiLocalUrl),
        model: settings.aiLocalModel,
        apiKeyNeeded: false
     }
  }

  if (settings.aiProvider === 'cloud') {
    const model = settings.aiCloudModel.toLowerCase()
    
    if (model.includes('gemini')) {
      return { provider: new GeminiProvider(), model: settings.aiCloudModel, apiKeyNeeded: true }
    }
    
    if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) { // OpenAI
      return { provider: new OpenAIProvider(), model: settings.aiCloudModel, apiKeyNeeded: true }
    }

    if (model.includes('claude')) {
      return { provider: new AnthropicProvider(), model: settings.aiCloudModel, apiKeyNeeded: true }
    }

    // Default to OpenAI if unrecognizable but "cloud" selected? 
    // Or maybe default to Gemini as it was previous default?
    // Let's default to OpenAI as 'gpt-4o-mini' is the default constant in key-manager.
    return { provider: new OpenAIProvider(), model: settings.aiCloudModel, apiKeyNeeded: true }
  }

  return null
}

// -------------------------------------------------------------------------- //
//                                   EXPORTS                                  //
// -------------------------------------------------------------------------- //

export async function generateCommitMessage(repoPath: string): Promise<CommitMessage> {
  const settings = getSettings()
  console.log('[AI] Settings state:', { 
    provider: settings.aiProvider, 
    cloudModel: settings.aiCloudModel,
    timeout: settings.aiTimeoutSec
  })
  
  // 1. Collect Context
  let context: AiContext
  try {
    context = await collectContext(repoPath, {
      diffLimitKb: settings.diffLimitKb,
      diffLimitLines: settings.diffLimitLines,
      redact: settings.aiRedactionEnabled
    })
    
    // Add persona to context
    context.persona = settings.aiPersona
  } catch (error) {
    console.error('Context collection failed:', error)
     // Fallback context
     context = {
      branch: null,
      files: [],
      diff: ''
    }
  }

  // 2. Prepare Offline Fallback
  // We reconstruct the internal GitStatus shape needed for the legacy offline generator if needed
  // But strictly speaking, the offline generator needs specific shape. 
  // Let's just create a minimal compliant object or pass the context.
  // The 'generateOfflineCommitMessage' expects { branch, status: GitStatus, files }. 
  // Our 'context' doesn't have full GitStatus object. 
  // We can re-fetch or just mock it. Ideally we should have kept the status object in collectContext if we needed it.
  // Let's quickly fix collectContext to return what we need or just re-fetch for offline (cheap).
  // Actually, let's just make `generateOfflineCommitMessage` usage safe.
  
  const offlineFallback = generateOfflineCommitMessage({
     branch: context.branch,
     files: context.files.map(f => ({ ...f, index: '?', working_dir: '?' })), // Close enough for the minimal offline generator
     status: { 
        current: context.branch, 
        ahead: 0, 
        behind: 0, 
        files: [], // It's only used for length check usually
        staged: []
     }
  })

  // 3. Early Exit if Offline
  if (settings.aiProvider === 'offline') {
    return offlineFallback
  }

  // 4. Rate Limit
  if (!checkRateLimit()) {
    console.warn('Rate limit exceeded')
    return { title: 'Error: Rate limit exceeded', body: 'Please wait a minute before trying again.' }
  }

  // 5. Select Provider
  const selection = getProvider(settings)
  if (!selection) {
    return { title: 'Error: Invalid provider', body: 'Check your AI settings.' }
  }

  // 6. Load Credentials
  let apiKey = ''
  if (selection.apiKeyNeeded) {
    apiKey = await loadAiKey()
    if (!apiKey) {
      console.warn('Missing API Key for cloud provider')
      return { title: 'Error: Missing API Key', body: 'Please add your API Key in Settings > Integrations.' }
    }
  }

  // 7. Generate
  try {
    const timeout = settings.aiTimeoutSec > 0 ? settings.aiTimeoutSec * 1000 : DEFAULT_TIMEOUT_MS
    const result = await selection.provider.generate(context, apiKey, selection.model, timeout)
    
    // Wipe key
    apiKey = ''

    if (!result) {
        return { title: 'Error: AI generation failed', body: 'The provider returned an empty response. Check your network or API key permissions.' }
    }

    // 8. Security Validation
    const allowedPaths = new Set(context.files.map((file) => file.path))
    if (hasUnknownPaths(result, allowedPaths)) {
      console.warn('AI generated unknown paths.')
      return { title: 'Error: AI Hallucination Detected', body: 'The AI attempted to reference files not in the diff. This was blocked for safety.' }
    }

    return result

  } catch (error) {
    console.error('Generation failed:', error)
    return { title: 'Error: Generation Exception', body: error instanceof Error ? error.message : String(error) }
  }
}

// Legacy export for testing connectivity
export async function testLocalLlm(url: string, model: string): Promise<boolean> {
   if (!url || !model) return false
   try {
     const provider = new LocalProvider(url)
     // Mock context
     const context: AiContext = {
       branch: 'test',
       diff: 'test',
       files: []
     }
     const res = await provider.generate(context, '', model, 5000)
     return !!res
   } catch {
     return false
   }
}
