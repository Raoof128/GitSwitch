import { app, safeStorage } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { Account } from '../../index'

type StoreSchema = {
  accounts: Account[]
  settings: {
    aiCloudModel: string
    aiLocalModel: string
    aiLocalUrl: string
    aiProvider: 'offline' | 'local' | 'cloud'
    aiPersona: 'standard' | 'cybersecurity'
    aiRedactionEnabled: boolean
    aiTimeoutSec: number
    defaultAccountId?: string
    defaultBaseBranch: 'main' | 'master'
    diffLimitKb: number
    diffLimitLines: number
    likeApp: boolean
    prToken?: string
    reducedMotion: boolean
    strictHostKeyChecking: boolean
    theme: 'dark'
  }
}

type ElectronStoreType<T> = {
  get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K]
  set<K extends keyof T>(key: K, value: T[K]): void
  set(value: Partial<T>): void
}

// Handle ESM/CJS interop for electron-store
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ElectronStoreModule = require('electron-store')
const ElectronStore = (
  ElectronStoreModule.default || ElectronStoreModule
) as new <T>(options: unknown) => ElectronStoreType<T>

const DEFAULT_SETTINGS: StoreSchema['settings'] = {
  aiCloudModel: 'gpt-4o-mini',
  aiLocalModel: 'qwen2.5-coder:7b',
  aiLocalUrl: 'http://localhost:11434/api/generate',
  aiProvider: 'offline',
  aiPersona: 'standard',
  aiRedactionEnabled: true,
  aiTimeoutSec: 8,
  defaultAccountId: undefined,
  defaultBaseBranch: 'main',
  diffLimitKb: 80,
  diffLimitLines: 400,
  likeApp: false,
  prToken: '',
  reducedMotion: false,
  strictHostKeyChecking: true,
  theme: 'dark'
}

const store = new ElectronStore<StoreSchema>({
  name: 'gitswitch',
  defaults: {
    accounts: [],
    settings: DEFAULT_SETTINGS
  }
})

const getKeysDir = (): string => join(app.getPath('home'), '.gitswitch', 'keys')
const getAiKeyPath = (): string => join(getKeysDir(), 'ai-key.enc')
const getGitHubTokenPath = (): string => join(getKeysDir(), 'github-token.enc')
const getGitLabTokenPath = (): string => join(getKeysDir(), 'gitlab-token.enc')
const getPullRequestTokenPath = (): string => join(getKeysDir(), 'pr-token.enc')

async function ensureKeysDir(): Promise<void> {
  await fs.mkdir(getKeysDir(), { recursive: true, mode: 0o700 })
}

function ensureEncryptionAvailable(): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'Secure storage is not available on this system. This may occur if the system keychain is locked or unavailable. Please unlock your system keychain and try again.'
    )
  }
}

async function writePullRequestToken(token: string): Promise<void> {
  ensureEncryptionAvailable()
  await ensureKeysDir()
  const encrypted = safeStorage.encryptString(token)
  await fs.writeFile(getPullRequestTokenPath(), encrypted)
}

async function writeAiKey(token: string): Promise<void> {
  ensureEncryptionAvailable()
  await ensureKeysDir()
  const encrypted = safeStorage.encryptString(token)
  await fs.writeFile(getAiKeyPath(), encrypted)
}

async function writeGitHubToken(token: string): Promise<void> {
  ensureEncryptionAvailable()
  await ensureKeysDir()
  const encrypted = safeStorage.encryptString(token)
  await fs.writeFile(getGitHubTokenPath(), encrypted)
}

async function writeGitLabToken(token: string): Promise<void> {
  ensureEncryptionAvailable()
  await ensureKeysDir()
  const encrypted = safeStorage.encryptString(token)
  await fs.writeFile(getGitLabTokenPath(), encrypted)
}

async function migratePlainTokenIfNeeded(): Promise<void> {
  const settings = getSettings()
  const legacyToken = settings.prToken?.trim()
  if (!legacyToken) {
    return
  }
  await writePullRequestToken(legacyToken)
  store.set('settings', { ...settings, prToken: '' })
}

export function listAccounts(): Account[] {
  return store.get('accounts', [])
}

export function addAccount(name: string): Account {
  const account: Account = {
    id: randomUUID(),
    name,
    createdAt: new Date().toISOString()
  }

  const accounts = listAccounts()
  store.set('accounts', [...accounts, account])
  return account
}

export function renameAccount(id: string, name: string): Account {
  const accounts = listAccounts()
  const next = accounts.map((account) => (account.id === id ? { ...account, name } : account))
  store.set('accounts', next)
  const updated = next.find((account) => account.id === id)
  if (!updated) {
    throw new Error('Account not found.')
  }
  return updated
}

export async function deleteAccount(id: string): Promise<void> {
  const accounts = listAccounts().filter((account) => account.id !== id)
  store.set('accounts', accounts)
  await fs.rm(join(getKeysDir(), `${id}.enc`), { force: true })
}

export async function saveKey(accountId: string, privateKeyString: string): Promise<void> {
  ensureEncryptionAvailable()
  await ensureKeysDir()

  const encrypted = safeStorage.encryptString(privateKeyString)
  const filePath = join(getKeysDir(), `${accountId}.enc`)
  await fs.writeFile(filePath, encrypted)
}

export async function loadKey(accountId: string): Promise<string> {
  ensureEncryptionAvailable()
  const filePath = join(getKeysDir(), `${accountId}.enc`)
  const encrypted = await fs.readFile(filePath)
  const decrypted = safeStorage.decryptString(encrypted)

  // Validate key format - support common SSH private key formats:
  // - RSA: -----BEGIN RSA PRIVATE KEY-----
  // - OpenSSH (new format): -----BEGIN OPENSSH PRIVATE KEY-----
  // - EC: -----BEGIN EC PRIVATE KEY-----
  // - PKCS8: -----BEGIN PRIVATE KEY-----
  // - DSA: -----BEGIN DSA PRIVATE KEY-----
  const validKeyPatterns = [
    /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    /-----BEGIN PRIVATE KEY-----/
  ]

  const isValidKey = validKeyPatterns.some((pattern) => pattern.test(decrypted))
  if (!isValidKey) {
    throw new Error('Invalid key format. Expected PEM-encoded SSH private key.')
  }

  return decrypted
}

export function getSettings(): StoreSchema['settings'] {
  return store.get('settings')
}

export async function getSettingsPublic(): Promise<{
  aiCloudModel: string
  aiLocalModel: string
  aiLocalUrl: string
  aiProvider: 'offline' | 'local' | 'cloud'
  aiPersona: 'standard' | 'cybersecurity'
  aiRedactionEnabled: boolean
  aiTimeoutSec: number
  defaultAccountId?: string
  defaultBaseBranch: 'main' | 'master'
  diffLimitKb: number
  diffLimitLines: number
  hasAiKey: boolean
  hasGitHubToken: boolean
  hasGitLabToken: boolean
  likeApp: boolean
  reducedMotion: boolean
  strictHostKeyChecking: boolean
  theme: 'dark'
}> {
  await migratePlainTokenIfNeeded()
  const settings = getSettings()
  return {
    aiCloudModel: settings.aiCloudModel,
    aiLocalModel: settings.aiLocalModel,
    aiLocalUrl: settings.aiLocalUrl,
    aiProvider: settings.aiProvider,
    aiPersona: settings.aiPersona || 'standard',
    aiRedactionEnabled: settings.aiRedactionEnabled,
    aiTimeoutSec: settings.aiTimeoutSec,
    defaultAccountId: settings.defaultAccountId,
    defaultBaseBranch: settings.defaultBaseBranch,
    diffLimitKb: settings.diffLimitKb,
    diffLimitLines: settings.diffLimitLines,
    hasAiKey: await hasAiKey(),
    hasGitHubToken: await hasGitHubToken(),
    hasGitLabToken: await hasGitLabToken(),
    likeApp: settings.likeApp,
    reducedMotion: settings.reducedMotion,
    strictHostKeyChecking: settings.strictHostKeyChecking,
    theme: settings.theme
  }
}

export function setStrictHostKeyChecking(value: boolean): void {
  const settings = getSettings()
  store.set('settings', { ...settings, strictHostKeyChecking: value })
}

export async function updateSettings(
  input: Partial<StoreSchema['settings']>
): Promise<StoreSchema['settings']> {
  await migratePlainTokenIfNeeded()
  const settings = getSettings()
  const { ...rest } = input
  store.set('settings', { ...settings, ...rest, prToken: settings.prToken ?? '' })
  return getSettings()
}

export async function loadAiKey(): Promise<string> {
  try {
    ensureEncryptionAvailable()
    const encrypted = await fs.readFile(getAiKeyPath())
    return safeStorage.decryptString(encrypted)
  } catch {
    return ''
  }
}

export async function seedAiKeyFromEnv(): Promise<void> {
  const envKey =
    process.env.GITSWITCH_AI_API_KEY?.trim() || process.env.GITSWITCH_OPENAI_API_KEY?.trim()

  if (!envKey) {
    return
  }

  try {
    await writeAiKey(envKey)
  } catch {
    // Ignore seeding failures to avoid blocking app startup.
  }
}

export async function saveAiKey(token: string): Promise<void> {
  await writeAiKey(token)
}

export async function clearAiKey(): Promise<void> {
  await fs.rm(getAiKeyPath(), { force: true })
}

export async function saveGitHubToken(token: string): Promise<void> {
  await writeGitHubToken(token)
}

export async function saveGitLabToken(token: string): Promise<void> {
  await writeGitLabToken(token)
}

export async function loadGitHubToken(): Promise<string> {
  try {
    ensureEncryptionAvailable()
    const encrypted = await fs.readFile(getGitHubTokenPath())
    return safeStorage.decryptString(encrypted)
  } catch {
    return ''
  }
}

export async function loadGitLabToken(): Promise<string> {
  try {
    ensureEncryptionAvailable()
    const encrypted = await fs.readFile(getGitLabTokenPath())
    return safeStorage.decryptString(encrypted)
  } catch {
    return ''
  }
}

export async function loadPullRequestToken(): Promise<string> {
  await migratePlainTokenIfNeeded()
  ensureEncryptionAvailable()
  try {
    const encrypted = await fs.readFile(getPullRequestTokenPath())
    return safeStorage.decryptString(encrypted)
  } catch {
    return ''
  }
}

export async function hasPullRequestToken(): Promise<boolean> {
  await migratePlainTokenIfNeeded()
  try {
    await fs.access(getPullRequestTokenPath())
    return true
  } catch {
    return false
  }
}

export async function hasAiKey(): Promise<boolean> {
  try {
    await fs.access(getAiKeyPath())
    return true
  } catch {
    return false
  }
}

export async function hasGitHubToken(): Promise<boolean> {
  try {
    await fs.access(getGitHubTokenPath())
    return true
  } catch {
    return false
  }
}

export async function hasGitLabToken(): Promise<boolean> {
  try {
    await fs.access(getGitLabTokenPath())
    return true
  } catch {
    return false
  }
}

export async function clearPullRequestToken(): Promise<void> {
  await fs.rm(getPullRequestTokenPath(), { force: true })
}

export async function clearGitHubToken(): Promise<void> {
  await fs.rm(getGitHubTokenPath(), { force: true })
}

export async function clearGitLabToken(): Promise<void> {
  await fs.rm(getGitLabTokenPath(), { force: true })
}

export function resetSettings(): StoreSchema['settings'] {
  store.set('settings', DEFAULT_SETTINGS)
  return store.get('settings')
}
