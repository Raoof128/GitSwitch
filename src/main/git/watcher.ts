import * as chokidar from 'chokidar'
import { join } from 'path'
import { getStatus } from './git-service'
import type { GitStatusPayload } from '../../index'

type StatusHandler = (payload: GitStatusPayload) => void

export function createRepoWatcher(repoPath: string, onStatus: StatusHandler): chokidar.FSWatcher {
  if (repoPath.length > 4096) {
    throw new Error('Repository path too long for watching.')
  }

  const headPath = join(repoPath, '.git', 'HEAD')
  const indexPath = join(repoPath, '.git', 'index')
  // Use more specific pattern with depth limit to prevent excessive watching
  const workdirPattern = join(repoPath, '**/*')

  let timer: NodeJS.Timeout | null = null
  // let poller: ReturnType<typeof setInterval> | null = null

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
    }, 150)
  }

  const watcher = chokidar.watch([headPath, indexPath, workdirPattern], {
    ignored: (path) => {
      if (path.length > 8192) {
        return true // Skip excessively long paths
      }
      if (path.includes('node_modules')) {
        return true
      }
      if (path.includes(join(repoPath, '.git'))) {
        const isHead = path.endsWith(join('.git', 'HEAD'))
        const isIndex = path.endsWith(join('.git', 'index'))
        return !(isHead || isIndex)
      }
      return false
    },
    ignoreInitial: true,
    depth: 10 // Limit directory depth to prevent deep traversal
  })

  watcher.on('add', scheduleStatus)
  watcher.on('change', scheduleStatus)
  watcher.on('unlink', scheduleStatus)

  // poller = setInterval(scheduleStatus, 5000)

  return watcher as chokidar.FSWatcher
}
