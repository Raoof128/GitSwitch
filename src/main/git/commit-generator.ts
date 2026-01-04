import type { GitStatus } from "../../index"

type GeneratorInput = {
  branch: string | null
  status: GitStatus
  files: Array<{ path: string; status: string }>
}

type CommitMessage = {
  title: string
  body?: string
}

const FIX_KEYWORDS = ["bug", "error", "crash", "null", "guard", "sanitize", "patch", "fix"]
const FEAT_KEYWORDS = ["feature", "add", "new", "create"]
const REFACTOR_KEYWORDS = ["refactor", "rename", "cleanup", "restructure"]
const PERF_KEYWORDS = ["perf", "opt", "fast", "cache"]
const TEST_KEYWORDS = ["test", "spec", "__tests__"]

const CONFIG_FILES = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.json",
  "tsconfig.node.json",
  "tsconfig.web.json",
  "vite.config.ts",
  "vite.config.js",
  "electron.vite.config.ts",
  "electron.vite.config.js",
  "electron-builder.yml",
  "postcss.config.js",
  "tailwind.config.js",
  "eslint.config.mjs",
  ".prettierrc.yaml",
  ".prettierignore",
  ".editorconfig"
]

const lower = (value: string): string => value.toLowerCase()
const hasKeyword = (value: string, keywords: string[]): boolean =>
  keywords.some((keyword) => value.includes(keyword))

const isDocsFile = (path: string): boolean => {
  const ext = path.split(".").pop()?.toLowerCase()
  return ext === "md" || ext === "txt"
}

const isStyleFile = (path: string): boolean => {
  const ext = path.split(".").pop()?.toLowerCase()
  return ext === "css" || ext === "scss"
}

const isScriptFile = (path: string): boolean => {
  const ext = path.split(".").pop()?.toLowerCase()
  return ext === "ts" || ext === "tsx"
}

const isConfigFile = (path: string): boolean => {
  const file = path.split("/").pop() ?? path
  return CONFIG_FILES.includes(file)
}

const getScope = (path: string): string | null => {
  const normalized = path.replace(/\\/g, "/")
  if (normalized.startsWith("src/main/git/")) return "git"
  if (normalized.startsWith("src/main/secure/")) return "secure"
  if (normalized.startsWith("src/main/")) return "main"
  if (normalized.startsWith("src/preload/")) return "preload"
  if (normalized.startsWith("src/renderer/src/store/")) return "store"
  if (normalized.startsWith("src/renderer/")) return "ui"
  const first = normalized.split("/")[0]
  return first ?? null
}

const getPrimaryObject = (paths: string[], scope: string | null): string => {
  const lowerPaths = paths.map(lower)
  if (lowerPaths.some((path) => path.includes("theme") || path.endsWith(".css"))) {
    return "theme tokens"
  }
  if (lowerPaths.some((path) => path.includes("store"))) {
    return "state"
  }
  if (lowerPaths.some((path) => path.includes("git-service") || path.includes("watcher"))) {
    return "git engine"
  }
  if (lowerPaths.some((path) => isDocsFile(path))) {
    return "docs"
  }
  if (scope === "ui") return "ui"
  if (scope === "main") return "main process"
  if (scope === "preload") return "preload bridge"
  if (scope === "secure") return "key storage"
  if (scope === "git") return "git engine"
  if (scope === "store") return "state"
  return "changes"
}

const getVerbForType = (type: string): string => {
  switch (type) {
    case "fix":
      return "fix"
    case "feat":
      return "add"
    case "refactor":
      return "refine"
    case "perf":
      return "optimize"
    case "test":
      return "update"
    case "docs":
      return "update"
    case "style":
      return "refine"
    case "chore":
    default:
      return "update"
  }
}

const buildBody = (
  files: Array<{ path: string; status: string }>,
  includeBody: boolean
): string | undefined => {
  if (!includeBody) return undefined
  const items = files
    .slice(0, 4)
    .map((file) => {
      const action = file.status === "A" ? "Add" : file.status === "D" ? "Remove" : "Update"
      return \`- \${action} \${file.path}\`
    })
  return items.join("\\n")
}

export function generateOfflineCommitMessage(input: GeneratorInput): CommitMessage {
  const paths = input.files.map((file) => file.path)
  const lowerPaths = paths.map(lower)

  const onlyDocs = paths.length > 0 && paths.every(isDocsFile)
  const onlyStyles = paths.length > 0 && paths.every(isStyleFile)
  const onlyConfig = paths.length > 0 && paths.every(isConfigFile)
  const hasTests = paths.some((path) => hasKeyword(lower(path), TEST_KEYWORDS))
  const hasScripts = paths.some(isScriptFile)

  const scopes = paths
    .map((path) => getScope(path))
    .filter((scope): scope is string => Boolean(scope))

  const scopeCounts = scopes.reduce<Record<string, number>>((acc, scope) => {
    acc[scope] = (acc[scope] ?? 0) + 1
    return acc
  }, {})

  const [primaryScope, secondaryScope] = Object.entries(scopeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([scope]) => scope)

  const multipleScopes = new Set(scopes).size > 1
  const containsKeyword = (keywords: string[]) =>
    lowerPaths.some((path) => hasKeyword(path, keywords))

  let type = "chore"
  if (onlyConfig) {
    type = "chore"
  } else if (onlyDocs) {
    type = "docs"
  } else if (onlyStyles && !hasScripts) {
    type = "style"
  } else if (hasTests) {
    type = "test"
  } else if (containsKeyword(FIX_KEYWORDS)) {
    type = "fix"
  } else if (input.files.some((file) => file.status === "A") || containsKeyword(FEAT_KEYWORDS)) {
    type = "feat"
  } else if (containsKeyword(REFACTOR_KEYWORDS)) {
    type = "refactor"
  } else if (containsKeyword(PERF_KEYWORDS)) {
    type = "perf"
  }

  if (onlyStyles && !hasScripts) {
    return { title: "style(ui): refine styling" }
  }

  if (onlyDocs) {
    const docName = (
      (paths[0] ?? "docs")
        .split("/")
        .pop()
        ?.replace(/\\.[^/.]+$/, "") ?? "docs"
    )
    const scope = primaryScope ? \`(\${primaryScope})\` : ""
    return { title: \`docs\${scope}: update \${docName}\` }
  }

  if (scopes.length > 0 && scopes.every((scope) => scope === "store")) {
    return { title: "refactor(store): reorganise state" }
  }

  const verb = getVerbForType(type)
  const primaryObject = getPrimaryObject(paths, primaryScope ?? null)

  let title = ""
  if (multipleScopes && primaryScope && secondaryScope) {
    title = \`\${type}: update \${primaryScope} and \${secondaryScope}\`
  } else {
    const scopeLabel = primaryScope ? \`(\${primaryScope})\` : ""
    title = \`\${type}\${scopeLabel}: \${verb} \${primaryObject}\`
  }

  if (title.length > 200) {
    title = title.slice(0, 200)
  }

  const includeBody = input.files.length > 3 || multipleScopes
  const body = buildBody(input.files, includeBody)

  return body ? { title, body } : { title }
}
