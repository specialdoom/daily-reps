import { expect, test, type Page } from '@playwright/test';

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Rename file' });
const input = (page: Page) => page.getByRole('textbox', { name: 'Name' });
const renameButton = (page: Page, file: string) =>
  page.getByRole('listitem').filter({ hasText: file }).getByRole('button', { name: 'Rename' });
const names = (page: Page) =>
  page
    .getByRole('listitem')
    .evaluateAll((items) => items.map((li) => li.firstChild?.textContent?.trim() ?? ''));

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('opens modally with the name pre-filled and focused', async ({ page }) => {
  await renameButton(page, 'photo.png').click();
  await expect(dialog(page)).toBeVisible();
  await expect(input(page)).toHaveValue('photo.png');
  await expect(input(page)).toBeFocused();
  // The page behind is inert: the top layer covers it.
  const top = await page.evaluate(() => {
    const button = document.querySelectorAll('li button')[0]!.getBoundingClientRect();
    return document.elementFromPoint(button.x + 2, button.y + 2)?.tagName;
  });
  expect(top).not.toBe('BUTTON');
});

test('Esc without typing closes and restores focus to the opener', async ({ page }) => {
  await renameButton(page, 'photo.png').click();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  expect(await names(page)).toEqual(['report.pdf', 'photo.png', 'notes.txt']);
  await expect(renameButton(page, 'photo.png')).toBeFocused();
});

test('Save renames', async ({ page }) => {
  await renameButton(page, 'photo.png').click();
  await input(page).fill('pic.png');
  await page.getByRole('button', { name: 'Save' }).click();
  expect(await names(page)).toEqual(['report.pdf', 'pic.png', 'notes.txt']);
});

test('Enter saves', async ({ page }) => {
  await renameButton(page, 'photo.png').click();
  await input(page).fill('pic.png');
  await input(page).press('Enter');
  await expect(dialog(page)).toBeHidden();
  expect(await names(page)).toEqual(['report.pdf', 'pic.png', 'notes.txt']);
});

test('dirty Esc warns first, closes without renaming on the second', async ({ page }) => {
  await renameButton(page, 'photo.png').click();
  await input(page).fill('pic.png');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Discard changes? Press Esc again.');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  expect(await names(page)).toEqual(['report.pdf', 'photo.png', 'notes.txt']);
});

test('dirty backdrop click warns first, closes on the second', async ({ page }) => {
  await renameButton(page, 'photo.png').click();
  await input(page).fill('pic.png');
  await page.mouse.click(5, 5);
  await expect(dialog(page)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Discard changes? Press Esc again.');
  await page.mouse.click(5, 5);
  await expect(dialog(page)).toBeHidden();
  expect(await names(page)).toEqual(['report.pdf', 'photo.png', 'notes.txt']);
});

for (const value of ['', '   ']) {
  test(`Save with ${JSON.stringify(value)} is blocked; Cancel still works`, async ({ page }) => {
    await renameButton(page, 'photo.png').click();
    await input(page).fill(value);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(dialog(page)).toBeVisible();
    expect(await input(page).evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog(page)).toBeHidden();
    expect(await names(page)).toEqual(['report.pdf', 'photo.png', 'notes.txt']);
  });
}

test('re-opening on another file shows its name and no stale warning', async ({ page }) => {
  await renameButton(page, 'photo.png').click();
  await input(page).fill('pic.png');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await renameButton(page, 'notes.txt').click();
  await expect(input(page)).toHaveValue('notes.txt');
  await expect(page.getByRole('alert')).toHaveText('');
});

test('re-opening after a trimmed Save shows the saved name', async ({ page }) => {
  await renameButton(page, 'photo.png').click();
  await input(page).fill('  photo.png  ');
  await page.getByRole('button', { name: 'Save' }).click();

  await renameButton(page, 'photo.png').click();
  await expect(input(page)).toHaveValue('photo.png');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
});

test('Esc after a previous Save does not rename', async ({ page }) => {
  await renameButton(page, 'photo.png').click();
  await input(page).fill('pic.png');
  await page.getByRole('button', { name: 'Save' }).click();

  await renameButton(page, 'notes.txt').click();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  expect(await names(page)).toEqual(['report.pdf', 'pic.png', 'notes.txt']);
});
