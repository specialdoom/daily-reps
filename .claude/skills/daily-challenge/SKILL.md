---
name: daily-challenge
description: Generates one new daily frontend engineering challenge into a `YYYY-MM-DD/README.md` folder in this repo and commits it to main. Varies the format (library, component, small app, real-time app, change inside an existing app, HTML/CSS only, debugging) and the stack, often surprising with a post-2018 framework. By default the challenge is small and focused on a single concept (about 30–60 minutes); big topics become a multi-day series of focused parts. Pass `complex` (e.g. "complex challenge on X", "/daily-challenge complex") for one larger challenge made of several small, independently solvable parts. Use when the user asks for a new challenge, "today's challenge", "another problem", "generate a challenge (on <topic>)", the next part of a series, or a challenge for a specific date. Also used by the scheduled daily routine. Do NOT use for solving, testing, or reviewing an existing challenge.
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
2. Otherwise, read the `README.md` of the most recent ~10 date folders. They show which domain, format and stack each day used. Pick a **domain**, a **format** and a **stack** that each differ from the last few days, unless the user asked for something specific. Don't repeat any single one of the three two days in a row.
3. **Domains** (what the challenge is about):
   - **Modern JS/TS**: advanced types, generics, async patterns, event loop, Proxy, iterators.
   - **HTML & semantics**: forms and constraint validation, `<dialog>`, popover API, `<details>`, landmarks, `inert`, native lazy loading, microdata and SEO markup.
   - **CSS**: layout (grid, subgrid, flexbox), container and style queries, `:has()`, cascade layers, nesting, custom properties, scroll-driven animations, view transitions, logical properties, responsive type.
   - **Core web APIs & performance**: IntersectionObserver and ResizeObserver, Web Workers, Streams, the Cache API, paint and layout performance, Web Vitals.
   - **Real-time**: WebSockets, Server-Sent Events, WebRTC data channels, `BroadcastChannel`, presence, optimistic updates, reconnection and backoff, conflict resolution (e.g. CRDT basics).
   - **Framework mechanics & state primitives**: signals, runes, hooks, the Composition API, RxJS, immutability, deep nested updates.
   - **Architecture & SSR**: hydration boundaries, islands, streaming SSR, server components, micro-frontends, bundle splitting, memory leaks.
   - **Design systems & accessibility**: tokens, compound and headless components, WCAG, keyboard and screen-reader behaviour, visual regression.
   - **Testing & tooling**: Vitest, Playwright, MSW, CI, monorepos, Vite and bundler plugins.
4. **Formats** (what the owner builds):
   - **Library / function**: a pure TypeScript module with a Vitest suite. This is the format so far; don't let it dominate.
   - **Component**: one UI component in the chosen stack, e.g. a disclosure, a toast queue or a range slider.
   - **Small app**: one screen with 1–2 interactions, e.g. a live search or a kanban column with drag and drop. Keep it to a single concept.
   - **Real-time app**: a small client for a live feature, e.g. chat presence, a live cursor or a ticker with reconnect. Provide a tiny mock server (a few lines with `ws`, an SSE endpoint, or `BroadcastChannel` between tabs) so the challenge stays about the client.
   - **Inside an existing app**: give a short starter app in the README, e.g. a 30–80 line component tree. The task is one change inside it: add a feature, fix a described bug, refactor, or find and fix a performance or accessibility problem.
   - **HTML/CSS only**: build or fix a layout, component or animation with no JavaScript, or with almost none.
   - **Debug / review**: give a short buggy or slow snippet, describe the symptoms, and ask for the root cause and the fix.
5. **Stacks**: rotate between vanilla TS/HTML/CSS, the established frameworks (React, Vue, Angular, Svelte) and newer ones.
   - **Surprise roughly every third challenge** with a framework or tool released or popularised **after 2018** that hasn't appeared in the repo yet, so the owner stays current. Check what has been used with `grep -h 'Stack:' */README.md`. For example:
     - frameworks: SolidJS, Qwik, Astro, Svelte 5, Lit, htmx, Alpine.js, Preact Signals;
     - meta-frameworks: Fresh, SolidStart, TanStack Start or Router, React Router 7 / Remix, Next.js App Router, Nuxt 3, Analog, Angular signals;
     - runtimes and servers: Hono, Elysia, Bun, Deno;
     - other: Tauri, Effect.
   - Don't name the surprise framework in advance or in the series plan. Do give it a short "Why this framework" note: one or two sentences on what's distinctive about it, plus a link to its official docs.
   - Prefer a current stable version. Check the latest version (e.g. `npm view <pkg> version`) when network access allows, and state the version the challenge targets.
6. **How it's checked** depends on the format:
   - Library, component and real-time challenges should be testable with Vitest, using jsdom or a mock socket where needed.
   - App, HTML/CSS and inside-an-app challenges list concrete acceptance criteria the owner can check in the browser. Where it fits, add Playwright checks: what to click, and what must be visible, focused or announced.
   - Either way, the solution folder later holds a runnable project: `package.json`, the source, and tests or a Playwright spec.

## 3. Size it: one concept per challenge

In `focused` mode, every challenge must pass all of these checks:

- **One core concept.** You can name it in a few words, e.g. "abortable debounce", "LRU eviction order", "`aria-activedescendant` focus model" or "signal dependency tracking". If you need "and" to describe it, it's two challenges.
- **About 30–60 minutes** for a strong engineer.
- **Small surface.** For a library, one function, class or hook with at most ~3 public methods. For a component or app, one screen with 1–2 interactions. For an inside-an-app task, one change. The solution is roughly 40–150 lines, plus markup and CSS for UI formats.
- **Setup must be trivial.** Anything beyond `npm create …` plus one or two packages goes into the README as a provided starter or stub.
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
> **Format:** <Library | Component | Small app | Real-time app | Inside an existing app | HTML/CSS only | Debug / review> · **Stack:** <e.g. vanilla TS, React 19, SolidJS 1.9, Astro 5>
> **Series:** <Series name> — Part <N> of <M> · Previous: [`<YYYY-MM-DD>`](../<YYYY-MM-DD>/README.md)   ← only for series parts; omit otherwise

#### **Overview**
<2–3 sentences: the real-world production scenario, and why this one concept matters>

---

### **Why <framework>?**   ← surprise post-2018 framework only; omit otherwise
<1–2 sentences on what's distinctive about it, plus a link to its official docs>

---

### **Starter**   ← inside-an-app, debug and real-time formats only; omit otherwise
<the short starter app, buggy snippet or mock server, in fenced code blocks>

---

### **Detailed Requirements**
<3–5 bulleted requirements; strict TypeScript signatures (no `any`) where there is
an API; expected inputs/outputs; any stubs or given types>

### **Acceptance Criteria**   ← UI formats; omit for library challenges
<3–5 checks verifiable in the browser or with Playwright: what to do,
and what must be visible, focused or announced>

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
- **(A)** Ask for a Vitest or Playwright suite, or a starter project.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
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

- Commit only the new `YYYY-MM-DD/README.md`. The message format is `YYYY-MM-DD: <message>`, where the date is the challenge folder's date and `<message>` is a short lowercase summary, e.g. `2026-10-07: add daily challenge`.
  - For a series part, append ` (<series> part N/M)`, e.g. `2026-10-07: add daily challenge (scheduler part 2/4)`.
  - In `complex` mode, append ` (complex)`.
- Push **directly to `main`**. Do not create or push other branches.
- If `main` moved, pull with rebase and push again. If the push fails for authentication or permission reasons, report that and stop.
- If you're running interactively, show the full challenge in chat as well, and give the date and commit SHA.
