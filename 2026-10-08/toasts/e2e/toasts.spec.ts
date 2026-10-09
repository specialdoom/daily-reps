import { expect, test, type Page } from '@playwright/test'

async function sendToast(page: Page, message: string, { kind = 'info', duration = 5000 } = {}) {
  await page.getByLabel('Message').fill(message)
  await page.getByLabel('Duration (ms, 0 = sticky)').fill(String(duration))
  await page.getByRole('radio', { name: kind }).check()
  // Submit with Enter: a full toast stack can cover the Send button.
  await page.getByLabel('Duration (ms, 0 = sticky)').press('Enter')
}

const toast = (page: Page, message: string) => page.locator('li.toast', { hasText: message })

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('both live regions are in the accessibility tree before the first toast', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  const { nodes } = await cdp.send('Accessibility.getFullAXTree')
  const roles = nodes.filter((n) => !n.ignored).map((n) => n.role?.value)
  expect(roles).toContain('status')
  expect(roles).toContain('alert')
})

test('Escape moves focus back to where it came from', async ({ page }) => {
  await sendToast(page, 'Saved', { kind: 'success', duration: 0 })
  const radio = page.getByRole('radio', { name: 'success' })
  await radio.focus()
  // The submit button is disabled once the message is cleared, so Tab lands in the toast.
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Dismiss: Saved' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(toast(page, 'Saved')).toHaveCount(0)
  await expect(radio).toBeFocused()
})

test('keyboard focus pauses the timer and leaving resumes it', async ({ page }) => {
  await sendToast(page, 'Saved', { duration: 1500 })
  await page.getByRole('radio', { name: 'info' }).focus()
  await page.keyboard.press('Tab')
  await page.waitForTimeout(2500)
  await expect(toast(page, 'Saved')).toBeVisible()

  await page.keyboard.press('Shift+Tab')
  await expect(toast(page, 'Saved')).toHaveCount(0, { timeout: 2500 })
})

test('caps the visible stack at 3 and spaces the two regions only when both have toasts', async ({ page }) => {
  for (const m of ['A', 'B', 'C', 'D']) await sendToast(page, `Info ${m}`, { duration: 0 })
  await expect(page.locator('li.toast')).toHaveCount(3)
  await expect(page.getByRole('status')).not.toContainText('Info D')

  const regionGap = () =>
    page.evaluate(() => {
      const [a, b] = [...document.querySelectorAll('.region')].map((r) => r.getBoundingClientRect())
      return b!.top - a!.bottom
    })
  expect(await regionGap()).toBe(0)

  await page.getByRole('button', { name: 'Dismiss: Info A' }).click()
  await expect(page.getByRole('status')).toContainText('Info D')
  await page.getByRole('button', { name: 'Dismiss: Info B' }).click()
  await sendToast(page, 'Boom', { kind: 'error', duration: 0 })
  await expect(page.getByRole('alert')).toContainText('Boom')
  expect(await regionGap()).toBe(16)
  await page.screenshot({ path: 'test-results/toasts.png' })
})

test('fits a phone-width viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await sendToast(page, 'A fairly long message that has to wrap inside the toast', { duration: 0 })
  const box = (await toast(page, 'A fairly long').boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(375)
})

test('drops the hover lift under prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await sendToast(page, 'Saved', { duration: 0 })
  await toast(page, 'Saved').hover()
  await expect(toast(page, 'Saved')).toHaveCSS('transform', 'none')
})
