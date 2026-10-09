import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('typing a name then clicking Undo commits on blur first, then undoes it', async ({ page }) => {
  const name = page.getByRole('textbox', { name: 'Board name' })
  const undo = page.getByRole('button', { name: 'Undo' })
  await name.fill('Release')
  await expect(undo).toBeDisabled()
  // A real press on the still-disabled button blurs the input: `change` commits and
  // enables Undo before `click` fires. (locator.click() would wait for enabled.)
  const box = (await undo.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(name).toHaveValue('Sprint')
  await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled()
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(name).toHaveValue('Release')
})

test('bindings keep working on restored cards', async ({ page }) => {
  await page.getByRole('button', { name: 'Add card' }).click()
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('button', { name: 'Redo' }).click()

  const second = page.getByRole('textbox', { name: 'Card title' }).nth(1)
  await second.fill('Ship it')
  await second.press('Tab')
  await page.getByRole('button', { name: 'Tag' }).nth(1).click()
  await expect(page.getByText('new', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('new', { exact: true })).toHaveCount(0)
  await expect(second).toHaveValue('Ship it')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(second).toHaveValue('New card')
})

test('screenshot', async ({ page }) => {
  await page.getByRole('button', { name: 'Add card' }).click()
  await page.getByRole('button', { name: 'Tag' }).first().click()
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.screenshot({ path: 'test-results/undo.png' })
})
