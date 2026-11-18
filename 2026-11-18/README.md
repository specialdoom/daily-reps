### **Daily Frontend Challenge: [Testing & Tooling] The Test That Fails One Run in Three: Playwright Auto-Waiting vs. `waitForTimeout`**

> **Focus:** deterministic Playwright tests: web-first assertions that retry (`expect(locator)…`) instead of fixed sleeps and one-shot reads · **Time box:** ~40 min
> **Format:** Debug / review · **Stack:** Playwright Test (`@playwright/test@1.65.1`) + vanilla TypeScript + Vite 8 (`vite@8.3.8`)

#### **Overview**
A debounced search box calls an API with variable latency and re-renders its list. The team's end-to-end suite for it is "flaky": green locally, red in CI, green again on retry. Flaky tests train people to ignore red builds. Almost every one has the same root cause: the test races the app, either by guessing how long to wait or by reading the DOM once at a moment when it may not be ready.

---

### **What You'll Learn**

**Core concept:** Playwright locators are lazy and re-queried, and `expect(locator)` assertions retry until a timeout. The flakiness comes from replacing that with a fixed sleep or a one-time snapshot of the page.

**By the end you should be able to:**
- explain why `waitForTimeout(1000)` is both too slow and not safe,
- replace one-shot reads (`textContent()`, `count()`, `allTextContents()`, `isVisible()`) with retrying web-first assertions,
- explain why a test that passes when an element is *absent* is worse than a failing one,
- write the assertion that waits for the *final* state when an old result is still on screen.

**Skills practised:** Playwright · flaky-test diagnosis · web-first assertions · async UI (debounce + stale responses)

**Prerequisites:** basic Playwright (`page.locator`, `fill`), and knowing what a debounce is.

**Where this shows up in practice:** every CI pipeline with E2E tests. Cypress retries commands and Testing Library offers `findBy*`/`waitFor` for the same reason.

**Self-check (answer after solving):**
1. Which of the four tests can pass while the app is actually broken, and why?
2. Why does `await expect(locator).toHaveText(...)` work where `expect(await locator.textContent()).toBe(...)` doesn't?
3. In the last test, the list already has 6 items before the second query. What does your assertion wait for, so it can't pass on the *old* list by accident?

---

### **Starter**
The project lives in `flaky-search/`:

```
cd flaky-search && npm install
npx playwright install chromium   # if you don't have the browser yet
npm run test                       # starts Vite itself; run it several times
```

- `src/main.ts`: the app under test. Typing in `#q` waits 300ms, shows "Loading…" in `#status`, then after a random 150–900ms delay sets `#status` to `N results` and replaces all `<li>` in `#results`. Stale responses are ignored. **The app is correct; do not change it.**
- `tests/search.spec.ts`: four tests that fail intermittently (run the suite 5–10 times, e.g. `npx playwright test --repeat-each=5`).

```ts
test('search shows matching fruit', async ({ page }) => {
  await page.goto('/');
  await page.locator('#q').fill('ap');
  await page.waitForTimeout(1000);
  const items = await page.locator('#results li').allTextContents();
  expect(items).toEqual(['Apple', 'Apricot']);
});
// …plus: status text via textContent(), first result guarded by isVisible(),
// and a refine-the-query test that counts <li> after two sleeps.
```

---

### **Detailed Requirements**
- Fix `tests/search.spec.ts` only. After your change, `npx playwright test --repeat-each=20` must be green every time.
- **No `waitForTimeout`, no `sleep`, no raised timeouts, no `retries` in the config.**
- Every assertion on app state must be a web-first assertion (`toHaveText`, `toHaveCount`, `toBeVisible`…), which retries by itself.
- Each test must still fail if the app is broken: e.g. if the list never renders, or renders the wrong items, the test must go red (not silently pass).
- Write 1–2 lines per test, as a comment, naming the race you removed.

### **Acceptance Criteria**
- 20 repetitions in a row pass, and the suite is faster than before (no 1-second sleeps).
- Temporarily changing `FRUITS` or the filter in `src/main.ts` (e.g. make `'b'` return nothing) makes the relevant test fail. Revert afterwards.
- The "first result is Banana" test fails when there are no results.

---

### **Edge Cases & Performance Considerations**
- After the second query in the refine test, the *old* list (6 items) is still visible until the new response arrives. An assertion that is already true on the old state proves nothing; assert something that is only true for the new one.
- Latency is random, so any hard-coded wait is a guess. Auto-retrying assertions wait exactly as long as needed (default expect timeout 5s).
- Stretch: make the stale-response behaviour testable by delaying the first request with `page.route` (or a controllable delay) so the *older* response arrives last, and assert the list shows the newer query's results.

---

### **Interactive Next Steps**
- **(A)** Ask for the reference solution with an explanation of each race.
- **(B)** Paste your fixed spec for a review of determinism and of whether each test can still fail.
