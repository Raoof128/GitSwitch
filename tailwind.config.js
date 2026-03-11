/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Space Mono', 'ui-monospace', 'monospace'],
        display: ['JetBrains Mono', 'monospace']
      },
      colors: {
        neon: {
          green: '#00ffaa',
          pink: '#ff3366',
          yellow: '#ffcc00',
          blue: '#00aaff'
        },
        brutal: {
          bg: '#0a0a0a',
          panel: '#141414',
          muted: '#111111',
          border: '#2a2a2a',
          text: '#e0e0e0',
          dim: '#666666'
        }
      }
    }
  },
  plugins: []
}
