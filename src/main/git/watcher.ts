import chokidar, { type FSWatcher } from 'chokidar'
import { getStatus } from './git-service'
import type { GitStatusPayload } from '../../index'

type StatusHandler = (payload: GitStatusPayload) => void

/** Maximum consecutive errors before pausing watcher notifications */
const MAX_CONSECUTIVE_ERRORS = 5
/** Backoff duration in ms after max errors reached */
const ERROR_BACKOFF_MS = 30000

export function createRepoWatcher(repoPath: string, onStatus: StatusHandler): FSWatcher {
  if (repoPath.length > 4096) {
    throw new Error('Repository path too long for watching.')
  }

  let timer: NodeJS.Timeout | null = null
  let consecutiveErrors = 0
  let errorBackoffTimer: NodeJS.Timeout | null = null

  const scheduleStatus = (): void => {
    // Skip scheduling if we're in error backoff mode
    if (errorBackoffTimer) {
      return
    }

    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(async () => {
      try {
        const status = await getStatus(repoPath)
        onStatus({ repoPath, status })
        // Reset error count on successful status fetch
        consecutiveErrors = 0
      } catch (error) {
        consecutiveErrors++
        const message = error instanceof Error ? error.message : String(error)
        console.error(
          `Watcher status error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
          message
        )

        // If we've hit max consecutive errors, back off to prevent log spam
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.warn(
            `Watcher for ${repoPath} pausing for ${ERROR_BACKOFF_MS / 1000}s after ${MAX_CONSECUTIVE_ERRORS} consecutive errors`
          )
          errorBackoffTimer = setTimeout(() => {
            errorBackoffTimer = null
            consecutiveErrors = 0
            // Attempt one more status check after backoff
            scheduleStatus()
          }, ERROR_BACKOFF_MS)
        }
      }
    }, 300) // Increase debounce to 300ms
  }

  // Watch the entire repo path to ensure we catch changes in root files or other directories
  // The ignored filter handles node_modules and .git effectively
  const watcher = chokidar.watch(repoPath, {
    ignored: (path) => {
      if (path.length > 4096) return true
      if (path.includes('node_modules')) return true
      if (path.includes('.next')) return true
      if (path.includes('.git')) {
        return !(path.endsWith('HEAD') || path.endsWith('index') || path.endsWith('config'))
      }
      return false
    },
    ignoreInitial: true,
    persistent: true,
    ignorePermissionErrors: true,
    atomic: true // Detect atomic saves
  })

  watcher.on('add', scheduleStatus)
  watcher.on('addDir', scheduleStatus)
  watcher.on('change', scheduleStatus)
  watcher.on('unlink', scheduleStatus)
  watcher.on('unlinkDir', scheduleStatus)

  // Handle watcher errors gracefully
  watcher.on('error', (error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`File watcher error for ${repoPath}:`, message)
  })

  return watcher as FSWatcher
}
