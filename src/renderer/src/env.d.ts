/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react/jsx-runtime" />

import type { PreloadApi } from '../../preload/index'

declare global {
  interface Window {
    api: PreloadApi
  }
}
