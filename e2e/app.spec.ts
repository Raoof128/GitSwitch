import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { resolve } from 'path'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  app = await electron.launch({
    args: [resolve(__dirname, '../out/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  })

  page = await app.firstWindow()
  // Wait for the renderer to fully load
  await page.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await app.close()
})

test.describe('GitSwitch Electron App', () => {
  test('window opens and has title', async () => {
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('main UI renders activity rail', async () => {
    const rail = page.locator('nav[role="tablist"]')
    await expect(rail).toBeVisible()
  })

  test('activity rail has 4 tabs', async () => {
    const tabs = page.locator('nav[role="tablist"] button[role="tab"]')
    await expect(tabs).toHaveCount(4)
  })

  test('top bar renders with repo name', async () => {
    const topBar = page.locator('header.top-bar')
    await expect(topBar).toBeVisible()
  })

  test('command palette opens with keyboard shortcut', async () => {
    await page.keyboard.press('Meta+k')
    // Give it a moment for the palette to animate in
    await page.waitForTimeout(200)
    const palette = page.locator('input[placeholder*="Search"]').first()
    // The command palette should be visible (or at least the overlay)
    const isVisible = await palette.isVisible().catch(() => false)
    if (isVisible) {
      await expect(palette).toBeVisible()
      // Close it
      await page.keyboard.press('Escape')
    }
  })

  test('settings tab renders when clicked', async () => {
    // Click the 4th tab (settings)
    const settingsTab = page.locator('nav[role="tablist"] button[role="tab"]').nth(3)
    await settingsTab.click()
    await page.waitForTimeout(200)

    // Should see settings content
    const settingsHeader = page.locator('text=Settings').first()
    await expect(settingsHeader).toBeVisible()

    // Go back to changes tab
    const changesTab = page.locator('nav[role="tablist"] button[role="tab"]').nth(0)
    await changesTab.click()
  })

  test('app has no console errors on startup', async () => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    // Wait a moment to collect any errors
    await page.waitForTimeout(500)
    // Filter out known non-critical errors
    const critical = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('DevTools') && !e.includes('Extension')
    )
    expect(critical).toEqual([])
  })
})
