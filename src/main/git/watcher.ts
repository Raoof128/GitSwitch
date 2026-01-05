// Handle ESM/CJS interop for chokidar
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chokidarModule = require('chokidar')
const chokidar = chokidarModule.default || chokidarModule
import type { FSWatcher } from 'chokidar'
import { join } from 'path'
import { getStatus } from './git-service'
import type { GitStatusPayload } from '../../index'

type StatusHandler = (payload: GitStatusPayload) => void

export function createRepoWatcher(repoPath: string, onStatus: StatusHandler): FSWatcher {
  if (repoPath.length > 4096) {
    throw new Error('Repository path too long for watching.')
  }

  const headPath = join(repoPath, '.git', 'HEAD')
  const indexPath = join(repoPath, '.git', 'index')
  const configPath = join(repoPath, '.git', 'config')
  // Targeted watching of directories that actually change frequently
  const srcPath = join(repoPath, 'src')
  const appPath = join(repoPath, 'app')
  const libPath = join(repoPath, 'lib')

  let timer: NodeJS.Timeout | null = null

  const scheduleStatus = (): void => {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(async () => {
      try {
        const status = await getStatus(repoPath)
        onStatus({ repoPath, status })
      } catch (error) {
        console.error('Watcher status error:', error)
      }
    }, 300) // Increase debounce to 300ms
  }

  const watcher = chokidar.watch([headPath, indexPath, configPath, srcPath, appPath, libPath], {
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

  return watcher as FSWatcher
}
