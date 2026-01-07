import { app, shell, BrowserWindow, ipcMain, dialog, session, IpcMainInvokeEvent } from 'electron'
import { promises as fs, existsSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createRepoWatcher } from './git/watcher'
import {
  commit,
  getDiff,
  getRemotes,
  getStatus,
  pushWithIdentity,
  pullWithIdentity,
  fetchWithIdentity,
  setRemoteOrigin,
  stageAll,
  addToGitignore
} from './git/git-service'
import {
  addAccount,
  clearAiKey,
  clearGitHubToken,
  clearGitLabToken,
  deleteAccount,
  getSettings,
  getSettingsPublic,
  hasAiKey,
  hasGitHubToken,
  hasGitLabToken,
  loadGitHubToken,
  loadGitLabToken,
  listAccounts,
  renameAccount,
  saveAiKey,
  saveGitHubToken,
  saveGitLabToken,
  saveKey,
  seedAiKeyFromEnv,
  updateSettings
} from './secure/key-manager'
import { createPullRequest } from './git/pull-request'
import { generateCommitMessage } from './ai/commit-generate'
import type { DiffMode, PullRequestOptions } from '../index'

let mainWindow: BrowserWindow | null = null
const watchers = new Map<string, ReturnType<typeof createRepoWatcher>>()
const allowedRepoPaths = new Set<string>()
const isDev = !app.isPackaged || is.dev

const resolvePreloadPath = (): string => {
  const envPreload = process.env['ELECTRON_PRELOAD']
  if (envPreload && existsSync(envPreload)) {
    return envPreload
  }
  return join(__dirname, '../preload/index.js')
}

function createWindow(): void {
  const preloadPath = resolvePreloadPath()
  // Dev-only logging - these lines will not execute in production builds
  if (isDev) {
    console.log('[dev] preload path:', preloadPath)
    console.log('[dev] ELECTRON_PRELOAD:', process.env['ELECTRON_PRELOAD'] || '(unset)')
  }
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (isAllowedExternalUrl(details.url)) {
      void shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (isDev) {
    const devUrl = process.env['ELECTRON_RENDERER_URL'] || 'http://127.0.0.1:5174'
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function ensureWatcher(repoPath: string): void {
  if (watchers.has(repoPath)) {
    return
  }

  const watcher = createRepoWatcher(repoPath, (payload) => {
    mainWindow?.webContents.send('git:status-changed', payload)
  })
  watchers.set(repoPath, watcher)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const assertString = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${field}.`)
  }
  return value
}

const assertBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid ${field}.`)
  }
  return value
}

const assertNumber = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Invalid ${field}.`)
  }
  return value
}

const assertKeys = (input: Record<string, unknown>, allowed: string[], label: string): void => {
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key))
  if (unknown.length) {
    throw new Error(`Invalid ${label}.`)
  }
}

const isAllowedExternalUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') {
      return false
    }
    return url.hostname.endsWith('github.com') || url.hostname.endsWith('gitlab.com')
  } catch {
    return false
  }
}

const MAX_PATH_LENGTH = 4096

const expandHome = (input: string): string => {
  if (input.length > MAX_PATH_LENGTH) {
    throw new Error('Path too long.')
  }
  if (input.includes('..')) {
    throw new Error('Path traversal not allowed.')
  }
  if (input.startsWith('~')) {
    return join(homedir(), input.slice(1))
  }
  return input
}

async function normalizeRepoPath(repoPath: string): Promise<string> {
  const expanded = expandHome(repoPath)
  const resolved = resolve(expanded)

  if (resolved.length > MAX_PATH_LENGTH) {
    throw new Error('Resolved path too long.')
  }

  try {
    const real = await fs.realpath(resolved)
    if (real.length > MAX_PATH_LENGTH) {
      throw new Error('Real path too long.')
    }
    return real
  } catch {
    return resolved
  }
}

async function ensureGitRepository(repoPath: string): Promise<void> {
  const gitPath = join(repoPath, '.git')
  try {
    await fs.stat(gitPath)
  } catch {
    throw new Error(
      'This folder is not a Git repository. Initialize it with "git init" or choose a different folder.'
    )
  }
}

async function ensureAllowedRepo(repoPath: string): Promise<string> {
  const normalized = await normalizeRepoPath(repoPath)
  await ensureGitRepository(normalized)
  if (!allowedRepoPaths.has(normalized)) {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Allow', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      message: 'Allow GitSwitch to access this repository?',
      detail: normalized
    })
    if (response !== 0) {
      throw new Error('Repository access denied.')
    }
    allowedRepoPaths.add(normalized)
  }
  return normalized
}

async function registerIpcHandlers(): Promise<void> {
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('git:status', async (_event: IpcMainInvokeEvent, repoPath: string) => {
    const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
    ensureWatcher(normalized)
    return getStatus(normalized)
  })

  ipcMain.handle(
    'git:diff',
    async (_event: IpcMainInvokeEvent, repoPath: string, mode: DiffMode) => {
      const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
      if (mode !== 'staged' && mode !== 'unstaged') {
        throw new Error('Invalid diff mode.')
      }
      return getDiff(normalized, mode)
    }
  )

  ipcMain.handle(
    'git:commit',
    async (_event: IpcMainInvokeEvent, repoPath: string, title: string, body?: string) => {
      const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
      const safeTitle = assertString(title, 'title').trim()
      if (!safeTitle || safeTitle.length > 200) {
        throw new Error('Invalid commit title.')
      }
      const safeBody = body === undefined ? undefined : assertString(body, 'body')
      return commit(normalized, safeTitle, safeBody)
    }
  )

  ipcMain.handle(
    'git:generateCommitMessage',
    async (_event: IpcMainInvokeEvent, repoPath: string) => {
      const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
      return generateCommitMessage(normalized)
    }
  )

  ipcMain.handle('git:stageAll', async (_event: IpcMainInvokeEvent, repoPath: string) => {
    const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
    await stageAll(normalized)
    return { ok: true }
  })

  ipcMain.handle('git:getRemotes', async (_event: IpcMainInvokeEvent, repoPath: string) => {
    const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
    return getRemotes(normalized)
  })

  ipcMain.handle(
    'git:setRemoteOrigin',
    async (_event: IpcMainInvokeEvent, repoPath: string, url: string) => {
      const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
      const safeUrl = assertString(url, 'url').trim()

      // Validate URL format (SSH or HTTPS)
      const isValidUrl =
        safeUrl.startsWith('git@') || safeUrl.startsWith('https://') || safeUrl.startsWith('ssh://')
      if (!safeUrl || !isValidUrl) {
        throw new Error('Invalid remote URL format. Use SSH (git@...) or HTTPS (https://...).')
      }

      await setRemoteOrigin(normalized, safeUrl)
      return { ok: true }
    }
  )

  ipcMain.handle(
    'git:ignore',
    async (_event: IpcMainInvokeEvent, repoPath: string, filePath: string) => {
      const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
      const safeFilePath = assertString(filePath, 'filePath')
      await addToGitignore(normalized, safeFilePath)
      return { ok: true }
    }
  )

  ipcMain.handle(
    'git:push',
    async (_event: IpcMainInvokeEvent, repoPath: string, accountId: string) => {
      const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
      const safeAccountId = assertString(accountId, 'accountId')
      const settings = getSettings()
      return pushWithIdentity(normalized, safeAccountId, settings.strictHostKeyChecking)
    }
  )

  ipcMain.handle(
    'git:pull',
    async (_event: IpcMainInvokeEvent, repoPath: string, accountId: string) => {
      const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
      const safeAccountId = assertString(accountId, 'accountId')
      const settings = getSettings()
      return pullWithIdentity(normalized, safeAccountId, settings.strictHostKeyChecking)
    }
  )

  ipcMain.handle(
    'git:fetch',
    async (_event: IpcMainInvokeEvent, repoPath: string, accountId: string) => {
      const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
      const safeAccountId = assertString(accountId, 'accountId')
      const settings = getSettings()
      await fetchWithIdentity(normalized, safeAccountId, settings.strictHostKeyChecking)
      return { ok: true }
    }
  )

  ipcMain.handle(
    'git:createPullRequest',
    async (_event: IpcMainInvokeEvent, repoPath: string, options: PullRequestOptions) => {
      const normalized = await ensureAllowedRepo(assertString(repoPath, 'repoPath'))
      if (!isRecord(options)) {
        throw new Error('Invalid pull request options.')
      }
      assertKeys(options, ['title', 'body', 'baseBranch', 'headBranch', 'draft'], 'pull request')
      const title = assertString(options.title, 'title').trim()
      const baseBranch = assertString(options.baseBranch, 'baseBranch').trim()
      const headBranch = assertString(options.headBranch, 'headBranch').trim()
      const body = options.body === undefined ? undefined : assertString(options.body, 'body')
      const draft = options.draft === undefined ? false : assertBoolean(options.draft, 'draft')
      if (!title || title.length > 200 || !baseBranch || !headBranch) {
        throw new Error('Invalid pull request options.')
      }
      const githubToken = await loadGitHubToken()
      const gitlabToken = await loadGitLabToken()
      return createPullRequest(
        normalized,
        { title, body, baseBranch, headBranch, draft },
        {
          githubToken,
          gitlabToken
        }
      )
    }
  )

  ipcMain.handle('settings:get', async () => getSettingsPublic())
  ipcMain.handle(
    'settings:update',
    async (_event: IpcMainInvokeEvent, input: Partial<ReturnType<typeof getSettings>>) => {
      if (!isRecord(input)) {
        throw new Error('Invalid settings payload.')
      }
      assertKeys(
        input,
        [
          'aiCloudModel',
          'aiLocalModel',
          'aiLocalUrl',
          'aiProvider',
          'aiRedactionEnabled',
          'aiTimeoutSec',
          'autoPush',
          'defaultAccountId',
          'defaultBaseBranch',
          'diffLimitKb',
          'diffLimitLines',
          'likeApp',
          'reducedMotion',
          'strictHostKeyChecking',
          'theme',
          'aiPersona'
        ],
        'settings payload'
      )
      const safeInput: Partial<ReturnType<typeof getSettings>> = {}
      if ('aiCloudModel' in input)
        safeInput.aiCloudModel = assertString(input.aiCloudModel, 'aiCloudModel')
      if ('aiLocalModel' in input)
        safeInput.aiLocalModel = assertString(input.aiLocalModel, 'aiLocalModel')
      if ('aiLocalUrl' in input) safeInput.aiLocalUrl = assertString(input.aiLocalUrl, 'aiLocalUrl')
      if ('aiPersona' in input) {
        const persona = assertString(input.aiPersona, 'aiPersona')
        if (persona !== 'standard' && persona !== 'cybersecurity') {
          throw new Error('Invalid aiPersona.')
        }
        safeInput.aiPersona = persona as 'standard' | 'cybersecurity'
      }
      if ('aiProvider' in input) {
        const provider = assertString(input.aiProvider, 'aiProvider')
        if (!['offline', 'local', 'cloud'].includes(provider)) {
          throw new Error('Invalid aiProvider.')
        }
        safeInput.aiProvider = provider as 'offline' | 'local' | 'cloud'
      }
      if ('aiRedactionEnabled' in input) {
        safeInput.aiRedactionEnabled = assertBoolean(input.aiRedactionEnabled, 'aiRedactionEnabled')
      }
      if ('aiTimeoutSec' in input) {
        safeInput.aiTimeoutSec = assertNumber(input.aiTimeoutSec, 'aiTimeoutSec')
      }
      if ('autoPush' in input) {
        safeInput.autoPush = assertBoolean(input.autoPush, 'autoPush')
      }
      if ('defaultAccountId' in input) {
        const value = input.defaultAccountId
        if (value !== null && value !== undefined) {
          safeInput.defaultAccountId = assertString(value, 'defaultAccountId')
        } else {
          safeInput.defaultAccountId = undefined
        }
      }
      if ('defaultBaseBranch' in input) {
        const value = assertString(input.defaultBaseBranch, 'defaultBaseBranch')
        if (!['main', 'master'].includes(value)) {
          throw new Error('Invalid defaultBaseBranch.')
        }
        safeInput.defaultBaseBranch = value as 'main' | 'master'
      }
      if ('diffLimitKb' in input)
        safeInput.diffLimitKb = assertNumber(input.diffLimitKb, 'diffLimitKb')
      if ('diffLimitLines' in input)
        safeInput.diffLimitLines = assertNumber(input.diffLimitLines, 'diffLimitLines')
      if ('likeApp' in input) safeInput.likeApp = assertBoolean(input.likeApp, 'likeApp')
      if ('reducedMotion' in input)
        safeInput.reducedMotion = assertBoolean(input.reducedMotion, 'reducedMotion')
      if ('strictHostKeyChecking' in input) {
        safeInput.strictHostKeyChecking = assertBoolean(
          input.strictHostKeyChecking,
          'strictHostKeyChecking'
        )
      }
      if ('theme' in input) {
        const theme = assertString(input.theme, 'theme')
        if (theme !== 'dark') {
          throw new Error('Invalid theme.')
        }
        safeInput.theme = theme as 'dark'
      }
      await updateSettings(safeInput)
      return getSettingsPublic()
    }
  )
  ipcMain.handle('secrets:list', async () => {
    return {
      ok: true,
      secrets: {
        accounts: listAccounts(),
        hasAiKey: await hasAiKey(),
        hasGitHubToken: await hasGitHubToken(),
        hasGitLabToken: await hasGitLabToken()
      }
    }
  })

  ipcMain.handle('secrets:save', async (_event: IpcMainInvokeEvent, input: unknown) => {
    try {
      if (!isRecord(input)) {
        throw new Error('Invalid secret payload.')
      }
      assertKeys(input, ['type', 'value', 'action', 'name', 'privateKey', 'id'], 'secret payload')
      const type = assertString(input.type, 'type')
      if (type === 'ai' || type === 'github' || type === 'gitlab') {
        const value = assertString(input.value, 'value')
        if (!value.trim()) {
          throw new Error('Invalid secret payload.')
        }
        if (type === 'ai') {
          await saveAiKey(value)
        } else if (type === 'github') {
          await saveGitHubToken(value)
        } else {
          await saveGitLabToken(value)
        }
      } else if (type === 'ssh') {
        const action = assertString(input.action, 'action')
        if (action === 'add') {
          const name = assertString(input.name, 'name').trim()
          const privateKey = assertString(input.privateKey, 'privateKey')
          if (!name || !privateKey) {
            throw new Error('Invalid secret payload.')
          }
          const account = await addAccount(name)
          await saveKey(account.id, privateKey)
        } else if (action === 'rename') {
          const id = assertString(input.id, 'id')
          const name = assertString(input.name, 'name').trim()
          if (!id || !name) {
            throw new Error('Invalid secret payload.')
          }
          await renameAccount(id, name)
        } else {
          throw new Error('Invalid secret payload.')
        }
      } else {
        throw new Error('Invalid secret payload.')
      }

      return {
        ok: true,
        secrets: {
          accounts: listAccounts(),
          hasAiKey: await hasAiKey(),
          hasGitHubToken: await hasGitHubToken(),
          hasGitLabToken: await hasGitLabToken()
        }
      }
    } catch {
      return {
        ok: false,
        secrets: {
          accounts: listAccounts(),
          hasAiKey: await hasAiKey(),
          hasGitHubToken: await hasGitHubToken(),
          hasGitLabToken: await hasGitLabToken()
        }
      }
    }
  })

  ipcMain.handle('secrets:delete', async (_event: IpcMainInvokeEvent, input: unknown) => {
    try {
      if (!isRecord(input)) {
        throw new Error('Invalid secret payload.')
      }
      assertKeys(input, ['type', 'id'], 'secret payload')
      const type = assertString(input.type, 'type')
      if (type === 'ai') {
        await clearAiKey()
      } else if (type === 'github') {
        await clearGitHubToken()
      } else if (type === 'gitlab') {
        await clearGitLabToken()
      } else if (type === 'ssh') {
        const id = assertString(input.id, 'id')
        await deleteAccount(id)
      } else {
        throw new Error('Invalid secret payload.')
      }

      return {
        ok: true,
        secrets: {
          accounts: listAccounts(),
          hasAiKey: await hasAiKey(),
          hasGitHubToken: await hasGitHubToken(),
          hasGitLabToken: await hasGitLabToken()
        }
      }
    } catch {
      return {
        ok: false,
        secrets: {
          accounts: listAccounts(),
          hasAiKey: await hasAiKey(),
          hasGitHubToken: await hasGitHubToken(),
          hasGitLabToken: await hasGitLabToken()
        }
      }
    }
  })

  ipcMain.handle('shell:openExternal', async (_event: IpcMainInvokeEvent, url: string) => {
    const safeUrl = assertString(url, 'url')
    if (!isAllowedExternalUrl(safeUrl)) {
      throw new Error('URL not allowed.')
    }
    await shell.openExternal(safeUrl)
    return { ok: true }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  void seedAiKeyFromEnv()

  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...(details.responseHeaders ?? {}) }
      delete headers['Content-Security-Policy']
      delete headers['content-security-policy']
      const csp =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com https://api.github.com https://gitlab.com https://github.com; font-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none';"
      callback({
        responseHeaders: {
          ...headers,
          'Content-Security-Policy': [csp],
          'content-security-policy': [csp],
          'X-Content-Type-Options': ['nosniff'],
          'X-Frame-Options': ['DENY'],
          'X-XSS-Protection': ['1; mode=block'],
          'Referrer-Policy': ['strict-origin-when-cross-origin'],
          'Permissions-Policy': ['geolocation=(), microphone=(), camera=(), payment=()']
        }
      })
    })
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  void registerIpcHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  for (const watcher of watchers.values()) {
    watcher.close()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
