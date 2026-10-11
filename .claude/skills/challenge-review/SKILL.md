---
name: challenge-review
description: Reviews the owner's solution to a dated challenge in this repo, without prior context, against only that challenge's README.md. Keeps the original in `before-review/`, writes the reviewed solution with tests next to the README, and commits it directly on main. Requires a `YYYY-MM-DD: solution` commit for that day (checked by a commit lint) before it reviews anything. Use when the user says they pushed or finished a solution and asks for a review, e.g. "review my solution for 2026-10-05", "do a code review without context", or "review today's challenge". Do NOT use for generating challenges (daily-challenge) or for guiding the owner while they're still solving (socratic-mentor).
---

# Challenge Review

The owner solves a daily challenge in `YYYY-MM-DD/` and asks for a review. The review has to be **independent**: judge the solution only against what the challenge's `README.md` asks for. Don't rely on the conversation, earlier sessions, or other folders. Then turn the findings into a reviewed solution with tests, so the owner can diff their version against it.

## 1. Locate the solution

- Start from `git checkout main && git pull origin main`, so you work on an up-to-date `main`, not a stale one.
- Target folder: the date the user named, or otherwise the most recent folder whose latest commit is the owner's solution.
- **Commit lint: run it before anything else.** A review only starts once the day's solution is committed on `main` with the exact subject `YYYY-MM-DD: solution`:

  ```sh
  sh .claude/skills/challenge-review/scripts/lint-solution-commit.sh YYYY-MM-DD
  ```

  If it fails (exit 1), **stop**: no review, no subagent, no moving files, no commits. Tell the user the solution commit is missing, show the commits the script listed for that date, and ask them to commit the solution as `YYYY-MM-DD: solution`. Near misses such as `part of solution` or `updated solution` don't count. Never create or reword that commit yourself.
- **The original lives in `YYYY-MM-DD/before-review/`.**
  - If the owner already put it there (commits like "solution before review"), leave it untouched.
  - If the solution is in the folder root instead, move it into `before-review/` keeping the same file names, and commit that on its own as `YYYY-MM-DD: solution before review`.
  - `before-review/` must never be type-checked or tested as part of the project. Exclude it in `tsconfig.json`, and keep it out of the test `include`.
- Read the `README.md` yourself: its format (library, component, app, HTML/CSS, real-time, inside an app, debug), its stack, its requirements and its edge cases.

## 2. Branch

Work **directly on `main`**. Once the commit lint has passed, the review is committed on top of the solution commit. Do not create a review branch and do not open a PR.

## 3. Independent review

Spawn **one subagent** (general-purpose, in the foreground). Its prompt must:

- Give it **only** the absolute paths of `YYYY-MM-DD/README.md` and the files in `YYYY-MM-DD/before-review/`. Forbid reading any other repo file, git history or other folders.
- Ask for a staff-level review against the README's requirements, edge cases and performance notes, plus correctness, types, accessibility (for UI) and API design.
- For each finding, ask for: severity (blocking / should-fix / nit), lines, what's wrong, a **concrete failure scenario**, and a recommended fix. Also ask for a table of README requirements marked met / partial / not met.
- Let it **verify claims empirically**, by running experiments only in the scratchpad.
  - Libraries: compile and run, or use Vitest.
  - UI and HTML/CSS: drive Chromium with Playwright, using `executablePath: '/opt/pw-browsers/chromium'`, and take screenshots.
  - Forbid edits, commits and git commands in the repo.

When it returns, **verify every finding yourself** before acting on it. Reproduce it in a test, a script or the browser. Drop or downgrade anything that doesn't reproduce, and say so in the report.

## 4. Write the reviewed solution

- Put the reviewed files in the folder root (`YYYY-MM-DD/`) **with the same file names** as in `before-review/`, so `diff before-review/x x` shows exactly what the review changed.
- Fix every confirmed blocking and should-fix finding. Apply nits when they're cheap and clearly right.
- Keep the owner's structure, naming and style. This is their solution, improved, not a rewrite.
- Add a comment only where a fix is non-obvious (a spec detail, a browser quirk, a race). Don't narrate.
- Leave findings out when they need more than the README asks for, or when they're a matter of taste. List them as not changed in the report, with the reason.

## 5. Tests and project setup

Make the folder runnable on its own: `package.json` with `test` (and `check`/`build` if relevant), `tsconfig.json`, and a `.gitignore` for `node_modules`, `dist`, `.vite`, `test-results` and the like. Never commit generated files.

| README format | Tests |
|---|---|
| Library / function | A Vitest spec (`<name>.spec.ts`) covering every requirement and edge case |
| Component / small app / inside an app | Vitest with jsdom or the framework's testing library, plus Playwright for focus, keyboard and layout behaviour |
| HTML/CSS only | A Playwright spec (`<name>.spec.ts`) that loads the page and asserts behaviour: visibility, focus, Escape and light dismiss, computed positions, overflow and flipping at small viewports, reduced motion, and so on. Use `@playwright/test` with `executablePath: '/opt/pw-browsers/chromium'`. Never run `playwright install`. |
| Real-time | Vitest with a mock socket or `BroadcastChannel`, and fake timers for reconnect and backoff |

**Browser-testing gotchas** (Chromium with Playwright):
- Under `file://`, a stylesheet's `cssRules` throws a SecurityError. Read the CSS file from disk to assert on its source.
- Playwright's `getByRole(..., { expanded })` only reads `aria-expanded`. To check state exposed natively (e.g. by `popovertarget`), read Chromium's accessibility tree over CDP (`Accessibility.getFullAXTree`).
- Wait for `el.getAnimations()` to finish before measuring with `boundingBox()`, because transforms skew the boxes.
- Anchor positioning remembers the last successful `position-try` fallback, so a flipped popover doesn't flip back just because space reappears.
- An open popover can cover other triggers, so pick targets it doesn't overlap.

**Prove the tests matter.** Run the suite against the `before-review/` version, e.g. by temporarily pointing the import or page path at it. Confirm that the confirmed findings fail there and pass on the reviewed version, and record which ones in the report.

## 6. Verify

Run everything the folder offers: type check, tests and build. For UI formats, also open the page in Chromium and take a screenshot. Fix anything red before committing. A failure that was already there before the review, and that has nothing to do with this folder, gets mentioned in the report, not fixed.

## 7. Commit and push

- Commit on `main` as `YYYY-MM-DD: review for solution`, with the session's attribution trailer if one is configured. Stage only files inside `YYYY-MM-DD/`.
- Since there is no PR, the commit body carries the short version of the review: a one-paragraph verdict, then one line per confirmed finding with its severity and status (fixed / not changed + why).
- Push **directly to `main`**. Do not create or push other branches.
- If `main` moved, pull with rebase and push again. If the push fails for authentication or permission reasons, report that and stop.
- Report to the user in chat, with the commit SHA:
  - **Summary**: one paragraph on the verdict.
  - **Findings**: a table of severity, finding, failure scenario and status (fixed / not changed + why / didn't reproduce).
  - **README requirements**: met / partial / not met, before and after.
  - **Changes**: what changed, by file.
  - **Test plan**: commands run and their results, the tests that fail on `before-review/`, and screenshots or browser checks for UI.
  - Anything you couldn't verify.
