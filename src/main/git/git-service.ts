// Handle ESM/CJS interop for simple-git
// eslint-disable-next-line @typescript-eslint/no-require-imports
const simpleGitModule = require('simple-git')
const simpleGit = simpleGitModule.simpleGit || simpleGitModule.default?.simpleGit || simpleGitModule
import type { GitResponseError } from 'simple-git'
import { promises as fs, rmSync, existsSync } from 'fs'
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

// User-friendly error message translations
const ERROR_TRANSLATIONS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /Permission denied \(publickey\)/i, message: 'SSH key not authorized. Please ensure your SSH key is added to your GitHub/GitLab account.' },
  { pattern: /Host key verification failed/i, message: 'Host key verification failed. Try enabling "Trust new hosts" in Settings → Advanced, or manually add the host to known_hosts.' },
  { pattern: /Could not resolve hostname/i, message: 'Could not connect to remote server. Check your internet connection and the remote URL.' },
  { pattern: /Connection refused/i, message: 'Connection refused. The remote server is not responding.' },
  { pattern: /repository not found/i, message: 'Repository not found. Check that the remote URL is correct and you have access.' },
  { pattern: /fatal: not a git repository/i, message: 'This folder is not a Git repository. Run "git init" to create one.' },
  { pattern: /nothing to commit/i, message: 'Nothing to commit. Stage some changes first.' },
  { pattern: /no changes added to commit/i, message: 'No changes staged. Use "Stage All" or stage files manually.' },
  { pattern: /failed to push some refs/i, message: 'Push failed. Your branch may be behind the remote. Try pulling first.' },
  { pattern: /Updates were rejected/i, message: 'Push rejected. The remote has changes you don\'t have locally. Pull first, then push.' },
  { pattern: /Could not read from remote/i, message: 'Could not read from remote. Check your SSH key and network connection.' },
  { pattern: /Authentication failed/i, message: 'Authentication failed. Check your credentials or SSH key.' },
  { pattern: /remote origin already exists/i, message: 'Remote "origin" already exists. Use "Update Origin" to change it.' },
  { pattern: /does not appear to be a git repository/i, message: 'Remote URL is not a valid Git repository.' },
  { pattern: /pathspec .* did not match/i, message: 'File not found or not tracked by Git.' },
  { pattern: /CONFLICT/i, message: 'Merge conflict detected. Resolve conflicts manually before committing.' },
  { pattern: /detached HEAD/i, message: 'You are in detached HEAD state. Create or checkout a branch before committing.' },
  { pattern: /cannot lock ref/i, message: 'Git lock error. Another Git process may be running, or there\'s a stale lock file.' },
  { pattern: /index\.lock/i, message: 'Git is locked. If no other Git operation is running, delete .git/index.lock manually.' }
]

const getGitErrorMessage = (error: unknown, fallback = 'Git operation failed.'): string => {
  let rawMessage = fallback

  if (error && typeof error === 'object' && 'git' in error) {
    const gitMessage = (error as GitResponseError).git?.message
    if (gitMessage) {
      rawMessage = gitMessage
    }
  } else if (error instanceof Error) {
    rawMessage = error.message
  }

  // Try to find a user-friendly translation
  for (const { pattern, message } of ERROR_TRANSLATIONS) {
    if (pattern.test(rawMessage)) {
      return message
    }
  }

  // If no translation found, sanitize and return the original
  return rawMessage
    .replace(/[a-f0-9]{40}/g, '[HASH]') // Redact commit hashes
    .replace(/\/Users\/[^\/]+\//g, '~/') // Redact user paths
    .slice(0, 300) // Limit length
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

export async function getRemotes(repoPath: string): Promise<Array<{ name: string; url: string }>> {
  try {
    const git = simpleGit({ baseDir: repoPath })
    const remotes = await git.getRemotes(true)
    return remotes.map((remote) => ({
      name: remote.name,
      url: remote.refs?.fetch || remote.refs?.push || ''
    }))
  } catch (error) {
    throw new Error(getGitErrorMessage(error, 'Failed to get remotes.'))
  }
}

export async function setRemoteOrigin(repoPath: string, url: string): Promise<void> {
  try {
    const git = simpleGit({ baseDir: repoPath })
    const remotes = await git.getRemotes()
    const hasOrigin = remotes.some((r) => r.name === 'origin')

    if (hasOrigin) {
      // Update existing origin
      await git.remote(['set-url', 'origin', url])
    } else {
      // Add new origin
      await git.addRemote('origin', url)
    }
  } catch (error) {
    throw new Error(getGitErrorMessage(error, 'Failed to set remote origin.'))
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
  try {
    const git = simpleGit({ baseDir: repoPath })
    return await git.diff(['--cached'])
  } catch (error) {
    throw new Error(getGitErrorMessage(error, 'Failed to get staged diff.'))
  }
}

export async function stageAll(repoPath: string): Promise<void> {
  try {
    const git = simpleGit({ baseDir: repoPath })
    await git.add('.')
  } catch (error) {
    throw new Error(getGitErrorMessage(error, 'Failed to stage files.'))
  }
}

export async function addToGitignore(repoPath: string, filePath: string): Promise<void> {
  const gitignorePath = join(repoPath, '.gitignore')
  try {
    const git = simpleGit({ baseDir: repoPath })
    // Ensure the file exists
    if (!existsSync(gitignorePath)) {
      await fs.writeFile(gitignorePath, '', 'utf-8')
    }

    // Read current content
    const currentContent = await fs.readFile(gitignorePath, 'utf-8')
    
    // Check if already ignored (simplistic check to avoid duplicate lines)
    if (currentContent.split('\n').includes(filePath)) {
      return
    }

    // Append file path
    const prefix = currentContent && !currentContent.endsWith('\n') ? '\n' : ''
    await fs.appendFile(gitignorePath, `${prefix}${filePath}\n`, 'utf-8')

    // Untrack the file if it was previously tracked
    // using --cached to remove from index but keep file on disk
    try {
      await git.rm([filePath, '--cached'])
    } catch {
      // Ignore if file wasn't tracked
    }
  } catch (error) {
    throw new Error(getGitErrorMessage(error, 'Failed to add to .gitignore.'))
  }
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

  // Get current branch name first
  const git = simpleGit({ baseDir: repoPath })
  const status = await git.status()
  const currentBranch = status.current
  if (!currentBranch) {
    throw new Error('Cannot push: not on a branch.')
  }

  try {
    const result = await new Promise<PushResult>((resolve, reject) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30000) // 30-second timeout

      let stdout = ''
      let stderr = ''

      // Use -u to set upstream tracking, and specify origin + branch
      const child = spawn('git', ['push', '-u', 'origin', currentBranch], {
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
          // Extract the meaningful part of stderr for the error message
          const stderrLines = stderr.trim().split('\n')
          const meaningfulError = stderrLines
            .filter((line) => !line.startsWith('remote:') || line.includes('error'))
            .slice(-3)
            .join(' ')
            .replace(/[a-f0-9]{40}/g, '[HASH]') // Redact commit hashes
            .slice(0, 200) // Limit error message length
          const error = new Error(
            `Push failed: ${meaningfulError || `git push failed with code ${code}`}`
          )
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
