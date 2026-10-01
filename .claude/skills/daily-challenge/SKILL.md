---
name: daily-challenge
description: Generates one new daily frontend engineering challenge into a `YYYY-MM-DD/README.md` folder in this repo and commits it to main. By default the challenge is small and focused on a single concept (about 30–60 minutes); big topics become a multi-day series of focused parts. Pass `complex` (e.g. "complex challenge on X", "/daily-challenge complex") for one larger challenge made of several small, independently solvable parts. Use when the user asks for a new challenge, "today's challenge", "another problem", "generate a challenge (on <topic>)", the next part of a series, or a challenge for a specific date. Also used by the scheduled daily routine. Do NOT use for solving, testing, or reviewing an existing challenge.
---

# Daily Challenge

Act as a Principal Frontend Engineer and Technical Mentor. You are generating ONE practical frontend challenge that keeps the repo owner sharp and prepares them for staff-level frontend interviews.

**The owner wants to focus on one topic at a time.** The level of thinking should be staff-level, but the scope must be small. One deep concept done well beats a broad system done halfway.

## 0. Parameters

Read these from the request or the skill arguments. All are optional.

- **Mode:**
  - `focused` (default): one concept, about 30–60 minutes.
  - `complex`: one larger scenario split into 3–5 small parts in the same folder. Use it only when the user asks for "complex", a "bigger" or "full" challenge, or a "project".
- **Topic:** the subject the user asked for, if any.
- **Date:** the date the user named, if any.

## 1. Pick the target folder

- Folders are named `YYYY-MM-DD` at the repo root, and each one holds a `README.md`.
- Start from `git checkout main && git pull origin main`.
- If the user named a date, use it. Otherwise use today's date (`date -u +%F`).
- **Never overwrite an existing folder.** If the target date already exists:
  - If the user asked on demand, use the next date without a folder, so the problem is saved for an upcoming day, and tell them which date you used.
  - If the scheduled routine is running, change nothing and stop.

## 2. Pick the topic

1. **Continue an unfinished series first.** Check the most recent date folder. If its README has a `Series:` line saying `Part N of M` with N < M, the new challenge is Part N+1 of that series, unless the user asked for a different topic.
2. Otherwise, read the `README.md` of the most recent ~10 date folders. Choose a domain and framework that differs from the last few days, unless the user asked for a specific topic.
3. Rotate across these domains:
   - **Modern JS/TS**: advanced types, generics, async patterns, event loop, Proxy, iterators.
   - **Core web standards & CSS**: container queries, subgrid, specificity, `@layer`, paint/layout performance, modern DOM APIs.
   - **Framework mechanics & state primitives**: Svelte runes, Angular signals/RxJS, React RSC/hooks, Vue 3 Composition API, immutability, deep nested updates.
   - **Architecture & SSR**: hydration boundaries, micro-frontends, islands, Web Vitals, profiling, SEO, bundle splitting, memory leaks.
   - **Design systems & components**: tokens, Storybook, visual regression, accessibility/WCAG, compound components, headless UI.
   - **Testing & tooling**: Vitest/Jest, Playwright, CI/CD, Nx/Turborepo, Vite/webpack optimization.
4. The challenge must be solvable in TypeScript and testable with Vitest. That matches the repo's convention: solution folders later get `package.json`, `tsconfig.json`, `<name>.ts` and `<name>.spec.ts`.

## 3. Size it: one concept per challenge

In `focused` mode, every challenge must pass all of these checks:

- **One core concept.** You can name it in a few words, e.g. "abortable debounce", "LRU eviction order", "`aria-activedescendant` focus model" or "signal dependency tracking". If you need "and" to describe it, it's two challenges.
- **About 30–60 minutes** for a strong engineer.
- **One function, class or hook** in the public API, with at most ~3 public methods. The solution is roughly 40–150 lines.
- **3–5 requirements** and **2–3 edge cases**. Every one of them must exercise the core concept, not neighbouring features.
- **Stub what isn't the point.** Give a type or a one-line helper instead of asking for it. For example, provide the `Priority` type and an injected clock, and ask only for the ordering logic.

**When the topic is too big for one challenge, split it into a series.** Examples are a scheduler, a combobox, a form library or a reactive store.

- Plan **2–5 parts**. Each part is a separate daily challenge in its own date folder, and each part is solvable and testable on its own.
- Order the parts so each one builds on the previous part's public API. Restate that API in the README so the part stands alone: give its signature, and offer a tiny reference implementation if Part N-1 might not be done.
- Example: a cooperative scheduler would become (1) a priority queue with FIFO ties, (2) cancellation with `AbortSignal`, (3) time-sliced yielding with an injected clock, and (4) starvation prevention.
- Write the series plan in Part 1's README so later runs, and the owner, can follow it.

## 4. Write `YYYY-MM-DD/README.md`

### `focused` mode

```markdown
### **Daily Frontend Challenge: [<Topic Category>] <Title>**

> **Focus:** <the one concept, in a few words> · **Time box:** ~<30–60> min
> **Series:** <Series name> — Part <N> of <M> · Previous: [`<YYYY-MM-DD>`](../<YYYY-MM-DD>/README.md)   ← only for series parts; omit otherwise

#### **Overview**
<2–3 sentences: the real-world production scenario, and why this one concept matters>

---

### **Detailed Requirements**
<3–5 bulleted requirements; strict TypeScript signatures (no `any`);
expected inputs/outputs; any stubs or given types>

---

### **Edge Cases & Performance Considerations**
<2–3 items, all about the core concept>
<optional single stretch goal, still on the same concept>

---

### **Series Plan**   ← Part 1 of a series only; omit otherwise
1. <Part 1 title>: <concept>
2. <Part 2 title>: <concept>
…

---

### **Interactive Next Steps**
- **(A)** Ask for a comprehensive Vitest suite or starter code.
- **(B)** Paste your solution for a review of type accuracy, edge cases and performance.
```

### `complex` mode

This is one folder and one scenario, made of 3–5 parts that each follow the `focused` sizing rules from section 3. Each part has its own focus, its own requirements and its own small edge-case list. A part depends only on the earlier parts' public API, so the owner can stop after any part and still have finished something.

```markdown
### **Daily Frontend Challenge (Complex): [<Topic Category>] <Title>**

> **Parts:** <K> · **Time box:** ~<30–60> min per part

#### **Overview**
<2–3 sentences: the overall scenario>

---

### **Part 1: <title>**
> **Focus:** <concept>

**Requirements**
<3–5 bullets with signatures>

**Edge cases**
<2–3 bullets>

---

### **Part 2: <title>**
> **Focus:** <concept> · **Builds on:** Part 1 (`<API it uses>`)
…

---

### **Interactive Next Steps**
- **(A)** Ask for a Vitest suite or starter code for any part.
- **(B)** Paste your solution to a part for a review.
```

Only create the README. Don't add a solution, tests or starter code; the owner asks for those separately.

## 5. Commit and push

- Commit only the new `YYYY-MM-DD/README.md`. Use the message `add YYYY-MM-DD daily challenge`. Append ` (<series> part N/M)` for a series part, or ` (complex)` in `complex` mode.
- Push **directly to `main`**. Do not create or push other branches.
- If `main` moved, pull with rebase and push again. If the push fails for authentication or permission reasons, report that and stop.
- If you're running interactively, show the full challenge in chat as well, and give the date and commit SHA.
