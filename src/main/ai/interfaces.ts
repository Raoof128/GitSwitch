
export type CommitMessage = {
  title: string
  body?: string
}

export type AiContext = {
  diff: string
  files: Array<{ path: string; status: string }>
  branch: string | null
  persona?: 'standard' | 'cybersecurity'
}

export interface AiProvider {
  generate(context: AiContext, apiKey: string, model: string, timeoutMs: number): Promise<CommitMessage | null>
}
