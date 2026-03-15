// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'

// --------------- Mocks ---------------

const mockStatus = vi.fn().mockResolvedValue({
  current: 'main',
  ahead: 0,
  behind: 0,
  files: [{ path: 'src/index.ts', index: 'M', working_dir: ' ' }],
  staged: ['src/index.ts']
})

const mockDiff = vi.fn().mockResolvedValue('diff content')

vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => ({
    status: mockStatus,
    diff: mockDiff
  }))
}))

vi.mock('../secure/key-manager', () => ({
  getSettings: vi.fn(() => ({
    aiProvider: 'offline',
    aiCloudModel: 'gemini-1.5-flash',
    aiLocalModel: 'qwen2.5-coder:7b',
    aiLocalUrl: 'http://localhost:11434/api/generate',
    aiCloudConsented: false,
    aiRedactionEnabled: true,
    aiPersona: 'standard',
    aiTimeoutSec: 30,
    diffLimitKb: 80,
    diffLimitLines: 400
  })),
  loadAiKey: vi.fn().mockResolvedValue('')
}))

vi.mock('../git/commit-generator', () => ({
  generateOfflineCommitMessage: vi.fn(() => ({
    title: 'chore(main): update main process'
  }))
}))

vi.mock('./providers/gemini', () => ({
  GeminiProvider: class {
    generate = vi.fn().mockResolvedValue({ title: 'ai: generated', body: '' })
  }
}))
vi.mock('./providers/openai', () => ({
  OpenAIProvider: class {
    generate = vi.fn()
  }
}))
vi.mock('./providers/anthropic', () => ({
  AnthropicProvider: class {
    generate = vi.fn()
  }
}))
vi.mock('./providers/local', () => ({
  LocalProvider: class {
    generate = vi.fn()
  }
}))
vi.mock('./helpers', () => ({
  redactSecrets: vi.fn((input: string) => input),
  parseAiResponse: vi.fn()
}))
vi.mock('../audit/audit-logger', () => ({
  auditLog: vi.fn().mockResolvedValue(undefined)
}))

import { generateCommitMessage } from './commit-generate'
import { getSettings, loadAiKey } from '../secure/key-manager'

const mockGetSettings = getSettings as unknown as ReturnType<typeof vi.fn>
const mockLoadAiKey = loadAiKey as unknown as ReturnType<typeof vi.fn>

afterEach(() => {
  vi.restoreAllMocks()
})

// --------------- Tests ---------------

describe('generateCommitMessage', () => {
  it('returns offline message when provider is offline', async () => {
    const result = await generateCommitMessage('/repo')
    expect(result.title).toBe('chore(main): update main process')
  })

  it('returns consent error when cloud provider and aiCloudConsented is false', async () => {
    mockGetSettings.mockReturnValue({
      aiProvider: 'cloud',
      aiCloudModel: 'gemini-1.5-flash',
      aiCloudConsented: false,
      aiRedactionEnabled: true,
      aiPersona: 'standard',
      aiTimeoutSec: 30,
      diffLimitKb: 80,
      diffLimitLines: 400
    })

    const result = await generateCommitMessage('/repo')
    expect(result.title).toContain('consent required')
  })

  it('returns missing API key error when cloud provider has no key', async () => {
    mockGetSettings.mockReturnValue({
      aiProvider: 'cloud',
      aiCloudModel: 'gemini-1.5-flash',
      aiCloudConsented: true,
      aiRedactionEnabled: true,
      aiPersona: 'standard',
      aiTimeoutSec: 30,
      diffLimitKb: 80,
      diffLimitLines: 400
    })
    mockLoadAiKey.mockResolvedValue('')

    const result = await generateCommitMessage('/repo')
    expect(result.title).toContain('Missing API Key')
  })

  it('returns invalid provider error when provider is null', async () => {
    mockGetSettings.mockReturnValue({
      aiProvider: 'unknown_provider',
      aiCloudModel: '',
      aiCloudConsented: true,
      aiRedactionEnabled: true,
      aiPersona: 'standard',
      aiTimeoutSec: 30,
      diffLimitKb: 80,
      diffLimitLines: 400
    })

    const result = await generateCommitMessage('/repo')
    expect(result.title).toContain('Invalid provider')
  })

  // Must be last: fills module-level rate limit timestamps that persist across tests
  it('returns rate limit error after exceeding max requests', async () => {
    mockGetSettings.mockReturnValue({
      aiProvider: 'cloud',
      aiCloudModel: 'gemini-1.5-flash',
      aiCloudConsented: true,
      aiRedactionEnabled: true,
      aiPersona: 'standard',
      aiTimeoutSec: 30,
      diffLimitKb: 80,
      diffLimitLines: 400
    })
    mockLoadAiKey.mockResolvedValue('test-key-123')

    // Call 15 times to fill the rate limit window
    for (let i = 0; i < 15; i++) {
      await generateCommitMessage('/repo')
    }

    // 16th call should hit rate limit
    const result = await generateCommitMessage('/repo')
    expect(result.title).toContain('Rate limit exceeded')
  })
})
