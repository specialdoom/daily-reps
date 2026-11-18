import { test, expect } from '@playwright/test';

// This suite is red or green depending on the run. Find out why, then fix it.

test('search shows matching fruit', async ({ page }) => {
  await page.goto('/');
  await page.locator('#q').fill('ap');
  await page.waitForTimeout(1000);

  const items = await page.locator('#results li').allTextContents();
  expect(items).toEqual(['Apple', 'Apricot']);
});

test('status reports the count', async ({ page }) => {
  await page.goto('/');
  await page.locator('#q').fill('b');

  const text = await page.locator('#status').textContent();
  expect(text).toBe('2 results');
});

test('the first result is Banana', async ({ page }) => {
  await page.goto('/');
  await page.locator('#q').fill('b');

  const first = page.locator('#results li').first();
  if (await first.isVisible()) {
    expect(await first.textContent()).toBe('Banana');
  }
});

test('refining the query replaces the list', async ({ page }) => {
  await page.goto('/');
  await page.locator('#q').fill('a');
  await page.waitForTimeout(1000);
  await page.locator('#q').fill('ap');
  await page.waitForTimeout(1000);

  expect(await page.locator('#results li').count()).toBe(2);
});
