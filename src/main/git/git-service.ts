import { simpleGit } from 'simple-git'
import type { GitResponseError } from 'simple-git'
import { promises as fs, rmSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { spawn } from 'child_process'
import type { CommitResult, CommitMessage, DiffMode, GitStatus, PushResult } from '../../index'
import { loadKey, getSettings } from '../secure/key-manager'
import { generateOfflineCommitMessage } from './commit-generator'

const activeTempKeys = new Set<string>()
const MAX_PRIVATE_KEY_LENGTH = 32768 // 32KB max for SSH private keys
const MAX_TEMP_PATH_LENGTH = 256

// Git diff size limits
const DEFAULT_DIFF_BYTES = 80 * 1024 // 80KB
const DEFAULT_DIFF_LINES = 400

const getGitErrorMessage = (error: unknown, fallback = 'Git operation failed.'): string => {
  if (error && typeof error === 'object' && 'git' in error) {
    const gitMessage = (error as GitResponseError).git?.message
    if (gitMessage) {
      return gitMessage.replace(/[a-f0-9]{40}/g, '[HASH]').replace(/\/.*?\//g, '/[PATH]/')
    }
  }
  if (error instanceof Error) {
    return error.message.replace(/[a-f0-9]{40}/g, '[HASH]').replace(/\/.*?\//g, '/[PATH]/')
  }
  return fallback
}

async function writeTempKeyFile(privateKey: string): Promise<string> {
  if (privateKey.length > MAX_PRIVATE_KEY_LENGTH) {
    throw new Error('Private key too large.')
  }

  const tempDir = await fs.mkdtemp(join(tmpdir(), 'gitswitch-'))
  if (tempDir.length > MAX_TEMP_PATH_LENGTH) {
    throw new Error('Temp directory path too long.')
  }

  const tempPath = join(tempDir, 'key')
  if (tempPath.length > MAX_TEMP_PATH_LENGTH) {
    throw new Error('Temp file path too long.')
  }

  await fs.writeFile(tempPath, privateKey, { mode: 0o600 })
  activeTempKeys.add(tempPath)
  return tempPath
}

async function cleanupTempKey(path: string): Promise<void> {
  activeTempKeys.delete(path)
  await fs.rm(path, { force: true })
  await fs.rm(dirname(path), { force: true, recursive: true })
}

process.on('exit', () => {
  for (const path of Array.from(activeTempKeys)) {
    try {
      rmSync(path, { force: true })
      rmSync(dirname(path), { force: true, recursive: true })
    } catch {
      // Ignore cleanup errors during exit.
    }
  }
})

export async function getStatus(repoPath: string): Promise<GitStatus> {
  const git = simpleGit({ baseDir: repoPath })
  const status = await git.status()

  return {
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

export async function getDiff(repoPath: string, mode: DiffMode = 'unstaged'): Promise<string> {
  const git = simpleGit({ baseDir: repoPath })
  let hasHead = true
  try {
    await git.revparse(['--verify', 'HEAD'])
  } catch {
    hasHead = false
  }

  // Pre-check diff size limits from user settings
  const settings = getSettings()
  const maxBytes = settings.diffLimitKb > 0 ? settings.diffLimitKb * 1024 : DEFAULT_DIFF_BYTES
  const maxLines = settings.diffLimitLines > 0 ? settings.diffLimitLines : DEFAULT_DIFF_LINES

  if (mode === 'staged') {
    return git.diff(['--cached'])
  }

  if (!hasHead) {
    return git.diff()
  }

  // For HEAD diff, do a quick size estimate first
  const headPreview = await git.diff(['HEAD', '--stat'])
  const headPreviewSize = headPreview.includes('\n') ? headPreview.split('\n')[0].length * 50 : 1000 // Rough estimate: 50 chars per line

  // If diff is likely too large, warn user and use truncated version
  if (headPreviewSize > maxBytes || headPreview.length > maxLines) {
    console.warn(`Diff size may exceed limits. Consider adjusting diff limits in settings.`)
    return '[DIFF TOO LARGE - Consider adjusting limits in settings]'
  }

  return git.diff(['HEAD'])
}

export async function getStagedDiff(repoPath: string): Promise<string> {
  const git = simpleGit({ baseDir: repoPath })
  return git.diff(['--cached'])
}

export async function commit(
  repoPath: string,
  title: string,
  body?: string
): Promise<CommitResult> {
  try {
    const git = simpleGit({ baseDir: repoPath })
    const status = await git.status()

    if (!status.staged.length) {
      throw new Error('No staged changes to commit.')
    }

    const message = body?.trim() ? `${title}\n\n${body}` : title
    const result = await git.commit(message)

    return {
      hash: result.commit,
      summary: result.summary
    }
  } catch (error) {
    throw new Error(getGitErrorMessage(error, 'Commit failed.'))
  }
}

export async function generateCommitMessage(repoPath: string): Promise<CommitMessage> {
  const git = simpleGit({ baseDir: repoPath })
  const status = await git.status()
  const stagedPaths = status.staged.length ? status.staged : status.files.map((file) => file.path)
  const files = status.files
    .filter((file) => stagedPaths.includes(file.path))
    .map((file) => ({
      path: file.path,
      status: file.index && file.index !== ' ' ? file.index : file.working_dir || 'M'
    }))

  if (!files.length) {
    return { title: 'chore: update files' }
  }

  return generateOfflineCommitMessage({
    branch: status.current,
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
    },
    files
  })
}

export async function pushWithIdentity(
  repoPath: string,
  keyId: string,
  strictHostKeyChecking: boolean
): Promise<PushResult> {
  let privateKey = await loadKey(keyId)
  const tempKeyPath = await writeTempKeyFile(privateKey)
  // Zero out private key from memory immediately
  privateKey = ''

  const strictValue = strictHostKeyChecking ? 'yes' : 'no'
  const sshCommand = `ssh -i "${tempKeyPath}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=${strictValue}`

  try {
    const result = await new Promise<PushResult>((resolve, reject) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000) // 30-second timeout

      let stdout = ''
      let stderr = ''

      const child = spawn('git', ['push'], {
        cwd: repoPath,
        env: {
          ...process.env,
          GIT_SSH_COMMAND: sshCommand
        }
      })

      child.stdout.on('data', (chunk) => {
        const nextStr = chunk.toString()
        if (stdout.length + nextStr.length > 1024 * 1024) {
          // 1MB limit
          stdout = stdout.slice(-1024 * 1024) // Keep only the most recent 1MB
        } else {
          stdout += nextStr
        }
      })
      child.stderr.on('data', (chunk) => {
        const nextStr = chunk.toString()
        if (stderr.length + nextStr.length > 1024 * 1024) {
          // 1MB limit
          stderr = stderr.slice(-1024 * 1024) // Keep only the most recent 1MB
        } else {
          stderr += nextStr
        }
      })

      child.on('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) {
          resolve({ stdout, stderr })
        } else {
          const error = new Error(`git push failed with code ${code}`)
          Object.assign(error, { stdout, stderr })
          reject(error)
        }
      })

      controller.signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new Error('Git push timeout'))
      })
    })

    return result
  } finally {
    await cleanupTempKey(tempKeyPath)
  }
}
