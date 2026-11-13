### **Daily Frontend Challenge: [Framework Mechanics & State Primitives] The URL Is the State: Validating Search Params in TanStack Router**

> **Focus:** treating URL search params as typed, validated state (`validateSearch` with defaults + fallbacks, and functional `search` updaters) · **Time box:** ~40 min
> **Format:** Small app · **Stack:** TanStack Router (`@tanstack/react-router@1.170.46`, code-based routes) + React 19.3.1 + TypeScript + Vite 8

#### **Overview**
A product list keeps its search text, sort order and page in the URL so that links are shareable and the back button works. But the URL is user input: anyone can type `?page=-3&sort=banana` or hand-edit `?page=abc`. If the route just casts the raw value to a type, the type is a lie and the page crashes or renders garbage. The router's `validateSearch` is the single place where untrusted strings become trusted state.

---

### **What You'll Learn**

**Core concept:** The URL search string is untrusted input; `validateSearch` turns it into a typed object with defaults, and updates should be expressed as a function of the *previous* search rather than a spread of a stale closure value.

**By the end you should be able to:**
- implement a `validateSearch` that coerces, clamps and falls back instead of throwing
- explain why `?page=abc` and `?page=2` arrive as different runtime types (and how the router parses JSON-ish values)
- update one search param while deriving others using `search: (prev) => ...`
- reason about which state belongs in the URL and which does not

**Skills practised:** input validation · URL as state · TanStack Router · typed routing

**Prerequisites:** React hooks, basic routing concepts, TypeScript narrowing

**Where this shows up in practice:** filterable tables, search results, dashboards with shareable views. Equivalents: `nuqs`, React Router `useSearchParams` + zod, Next.js `searchParams`, Vue Router `query`.

**Self-check (answer after solving):**
1. Why does `{ ...search, q }` risk losing an update, and how does the functional form help?
2. Should a typo in `?sort=` produce an error page or a fallback? What changes if the value is a security-relevant id instead?
3. Which of these belongs in the URL: the text in a not-yet-submitted input, the current page, a modal's open state?

---

### **Why TanStack Router?**
Its routes are fully type-safe end to end: the type returned by `validateSearch` flows into `useSearch`, `navigate` and `<Link>`. Docs: https://tanstack.com/router/latest/docs/framework/react/guide/search-params

---

### **Starter**
The project lives in `url-filters/`. Run it with:

```bash
cd url-filters && npm install && npm run dev
```

Open `/products` (the app has no `/` route). Key pieces in `src/main.tsx`:

```tsx
export type ProductSearch = { q: string; sort: "name" | "price"; page: number };

export const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/products",
  // TODO: validate and normalise the raw search object
  validateSearch: (raw: Record<string, unknown>): ProductSearch => raw as ProductSearch,
  component: ProductsPage,
});
```

`src/ProductsPage.tsx` renders the filters and pager and navigates with `navigate({ search: { ...search, ... } })`. `src/data.ts` provides `queryProducts(q, sort, page)`; it is not part of the task.

Current symptoms: opening `/products` with no params shows `undefined` pages and `NaN`; `?page=abc&sort=banana` breaks the list; typing in the search box leaves you on page 4 of 1.

---

### **Detailed Requirements**
- `validateSearch` returns a complete `ProductSearch` for **any** input, never throws: `q` defaults to `""` (non-strings become `""`), `sort` defaults to `"name"` unless exactly `"name"` or `"price"`, `page` defaults to `1`.
- `page` must end up an integer ≥ 1. Note the router may hand you a number, a numeric string or junk; handle all of them.
- Changing `q` or `sort` resets `page` to `1`, using the functional form `navigate({ search: (prev) => ({ ...prev, ... }) })`.
- Previous/Next change only `page`, also with the functional form.
- Don't change `data.ts`.

### **Acceptance Criteria**
- `/products` shows page 1 of 5 sorted by name, and the address bar can stay as is.
- `/products?page=abc&sort=banana&q=` renders page 1, sorted by name, no errors.
- `/products?page=-3` and `?page=2.7` render a valid page ≥ 1.
- On page 3, typing in the search box moves to page 1 and the URL reflects it.
- Back button after a few filter changes walks through earlier states; reloading keeps the current view.

---

### **Edge Cases & Performance Considerations**
- `?page=99` is a valid integer beyond the last page: decide where to clamp (validation can't know the result count) and make sure the UI never shows an empty "page 99 of 1".
- `?q=123` may arrive as the number `123`, not the string `"123"`.
- Typing fast should not push one history entry per keystroke: consider `replace: true` for the search box. (Stretch goal.)

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright suite covering the acceptance criteria.
- **(B)** Paste your solution for a review of correctness, edge cases and accessibility.
