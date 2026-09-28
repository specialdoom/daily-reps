---
name: daily-challenge
description: Generates one new daily frontend engineering challenge into a `YYYY-MM-DD/README.md` folder in this repo and commits it to main. Use when the user asks for a new challenge, "today's challenge", "another problem", "generate a challenge (on <topic>)", or a challenge for a specific date. Also used by the scheduled daily routine. Do NOT use for solving, testing, or reviewing an existing challenge.
---

# Daily Challenge

Act as a Principal Frontend Engineer and Technical Mentor. You are generating ONE practical, high-value frontend challenge that keeps the repo owner sharp and prepares them for staff-level frontend interviews.

## 1. Pick the target folder

- Folders are named `YYYY-MM-DD` at the repo root, and each one holds a `README.md`.
- Start from `git checkout main && git pull origin main`.
- If the user named a date, use it. Otherwise use today's date (`date -u +%F`).
- **Never overwrite an existing folder.** If the target date already exists:
  - If the user asked on demand, use the next date without a folder, so the problem is saved for an upcoming day, and tell them which date you used.
  - If the scheduled routine is running, change nothing and stop.

## 2. Pick the topic

- Read the `README.md` of the most recent ~10 date folders. Choose a domain and framework that differs from the last few days, unless the user asked for a specific topic.
- Rotate across these domains:
  - **Modern JS/TS**: advanced types, generics, async patterns, event loop, Proxy, iterators.
  - **Core web standards & CSS**: container queries, subgrid, specificity, `@layer`, paint/layout performance, modern DOM APIs.
  - **Framework mechanics & state primitives**: Svelte runes, Angular signals/RxJS, React RSC/hooks, Vue 3 Composition API, immutability, deep nested updates.
  - **Architecture & SSR**: hydration boundaries, micro-frontends, islands, Web Vitals, profiling, SEO, bundle splitting, memory leaks.
  - **Design systems & components**: tokens, Storybook, visual regression, accessibility/WCAG, compound components, headless UI.
  - **Testing & tooling**: Vitest/Jest, Playwright, CI/CD, Nx/Turborepo, Vite/webpack optimization.
- The challenge must be solvable in TypeScript and testable with Vitest. That matches the repo's convention: solution folders later get `package.json`, `tsconfig.json`, `<name>.ts` and `<name>.spec.ts`.

## 3. Write `YYYY-MM-DD/README.md` with exactly this structure

```markdown
### **Daily Frontend Challenge: [<Topic Category>] <Title>**

#### **Overview**
<2–3 sentence real-world production scenario: why this matters>

---

### **Detailed Requirements**
<bulleted functional requirements; strict TypeScript signatures (no `any`);
expected inputs/outputs; explicit technical constraints>

---

### **Edge Cases & Performance Considerations**
<3–4 critical items: memory, layout thrashing, SSR/hydration, races, a11y…>
<optional staff-level stretch goal>

---

### **Interactive Next Steps**
- **(A)** Ask for a comprehensive Vitest suite or starter code.
- **(B)** Paste your solution for a review of type accuracy, edge cases and performance.
```

Only create the README. Don't add a solution, tests or starter code; the owner asks for those separately.

## 4. Commit and push

- Commit only the new `YYYY-MM-DD/README.md` with the message `add YYYY-MM-DD daily challenge`.
- Push **directly to `main`**. Do not create or push other branches.
- If `main` moved, pull with rebase and push again. If the push fails for authentication or permission reasons, report that and stop.
- If you're running interactively, show the full challenge in chat as well, and give the date and commit SHA.
