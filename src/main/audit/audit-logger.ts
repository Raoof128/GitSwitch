import { promises as fs, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const LOG_DIR = join(homedir(), '.gitswitch')
const LOG_PATH = join(LOG_DIR, 'audit.log')
const MAX_LOG_SIZE = 5 * 1024 * 1024

export type AuditEvent =
  | 'key.access'
  | 'key.save'
  | 'key.delete'
  | 'ai.cloud.request'
  | 'ai.cloud.consent'
  | 'pr.create'
  | 'settings.update'
  | 'repo.approve'
  | 'push'
  | 'pull'
  | 'fetch'
  | 'data.export'
  | 'data.delete'

export async function auditLog(
  event: AuditEvent,
  detail: string,
  repoPath?: string
): Promise<void> {
  try {
    if (!existsSync(LOG_DIR)) {
      await fs.mkdir(LOG_DIR, { recursive: true, mode: 0o700 })
    }
    try {
      const stats = await fs.stat(LOG_PATH)
      if (stats.size > MAX_LOG_SIZE) {
        await fs.rename(LOG_PATH, LOG_PATH + '.1')
      }
    } catch {
      /* file doesn't exist yet */
    }

    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      event,
      detail: detail.slice(0, 500),
      ...(repoPath ? { repoPath } : {})
    })
    await fs.appendFile(LOG_PATH, entry + '\n', 'utf-8')
  } catch {
    // Audit logging must never crash the app
  }
}

export async function exportAuditLog(): Promise<string> {
  try {
    return await fs.readFile(LOG_PATH, 'utf-8')
  } catch {
    return ''
  }
}
