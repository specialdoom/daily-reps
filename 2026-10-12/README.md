### **Daily Frontend Challenge: [Architecture & SSR] Keep the Page Cacheable: Personalize with a Server Island**

> **Focus:** isolating per-user content in a deferred server island so the page shell stays static and cacheable · **Time box:** ~45 min
> **Format:** Inside an existing app · **Stack:** Astro (`astro@7.3.8`) + `@astrojs/node` + TypeScript

#### **Overview**
A storefront's product page is rendered on the server and served with `Cache-Control: public, s-maxage=3600` from a CDN. Product marketing just asked for a header badge showing the signed-in user's name and cart count. The naive change reads the session cookie in the page itself, which makes the whole response per-user. The CDN can no longer cache it, or worse, caches one user's name and serves it to everyone. Your task is to ship the badge without touching the cacheability of the page.

---

### **What You'll Learn**

**Core concept:** Cacheability is a property of the *whole response*. One per-user value (a cookie read, a name in the HTML) turns a shared CDN page into a private one. Server islands let you split the page into a cacheable shell plus a separately fetched personal fragment.

**By the end you should be able to:**
- Explain why reading `Astro.cookies` in a page makes `s-maxage` unsafe (cache poisoning: one user's name served to everyone).
- Move per-user rendering into a `server:defer` component and give the shell a static fallback.
- Set different `Cache-Control` headers for the shell and the island response.
- Check cacheability from the outside: inspect response headers and compare two users' HTML.

**Skills practised:** HTTP caching (`public` vs `private`, `s-maxage`, `Vary`) · SSR rendering boundaries · Astro server islands · verifying behaviour with `curl`.

**Prerequisites:** basic HTTP headers, and what a CDN does with them. No Astro experience needed.

**Where this shows up in practice:** e-commerce headers and carts, "Hi, Ana" banners, A/B-test variants. The same split exists as Next.js Partial Prerendering and as edge-side includes (ESI).

**Self-check (answer after solving):**
1. Why is `Vary: Cookie` usually a worse fix than an island?
2. What does the user see if the island request fails, and is that acceptable?
3. Which headers must the island's own response send?

---

### **Why Astro?**
Astro renders pages to HTML on the server and ships zero JavaScript by default. Its *server islands* (`server:defer`) let a single component render on its own request, after the shell has been delivered, so the shell can stay static while one region is dynamic. Docs: https://docs.astro.build/en/guides/server-islands/

---

### **Starter**
Scaffold with `npm create astro@latest cart-badge -- --template minimal`, then add the Node adapter with `npx astro add node` (server islands need an adapter). Set `output: 'server'` in `astro.config.mjs` if the CLI did not.

`src/pages/product.astro`: the page the CDN caches:

```astro
---
import Layout from '../layouts/Layout.astro';

// The page itself must stay shared-cacheable.
Astro.response.headers.set('Cache-Control', 'public, s-maxage=3600');
---
<Layout title="Trail Shoe">
  <h1>Trail Shoe</h1>
  <p>Light, grippy, waterproof.</p>
</Layout>
```

`src/layouts/Layout.astro`:

```astro
---
const { title } = Astro.props;
---
<html lang="en">
  <head><title>{title}</title></head>
  <body>
    <header>
      <a href="/">Shop</a>
      <!-- TODO: user badge goes here -->
    </header>
    <main><slot /></main>
  </body>
</html>
```

A tiny stand-in for a real session store (`src/lib/session.ts`):

```ts
export interface Session { name: string; cartCount: number }

const SESSIONS: Record<string, Session> = {
  abc: { name: 'Ada', cartCount: 2 },
  xyz: { name: 'Grace', cartCount: 0 },
};

export async function getSession(sid: string | undefined): Promise<Session | null> {
  await new Promise((r) => setTimeout(r, 400)); // simulate a slow lookup
  return sid ? (SESSIONS[sid] ?? null) : null;
}
```

---

### **Detailed Requirements**
- Create `src/components/UserBadge.astro` that reads the `sid` cookie via `Astro.cookies`, calls `getSession`, and renders `Ada · 🛒 2`. For no session, render a "Sign in" link.
- Render it in the layout's header **as a server island** (`server:defer`). Do not read cookies anywhere in `product.astro` or `Layout.astro`.
- Provide a `slot="fallback"` that occupies the badge's space (fixed `min-width`/`height`) so the header does not shift when the island arrives.
- The island's response must **never be shared-cached**: set `Cache-Control: private, no-store` inside `UserBadge.astro`. Check what the island request returns (see below) before relying on this.
- The HTML of `/product` must contain no user data and must keep `Cache-Control: public, s-maxage=3600`.

### **Acceptance Criteria**
- `curl -i localhost:4321/product -H 'Cookie: sid=abc'` shows the cache header above and the body does **not** contain `Ada`.
- In the browser with `sid=abc`, the fallback shows immediately, then `Ada · 🛒 2` replaces it after ~400 ms with no layout shift of the `<h1>`.
- With `sid=xyz` the same cached HTML yields `Grace · 🛒 0`; with no cookie, "Sign in".
- With JavaScript disabled, the page still renders and the fallback stays. Decide what the fallback should say so this state is still useful.
- Playwright (optional): set cookie, `goto('/product')`, `expect(page.getByText('Ada')).toBeVisible()`, and assert on `response.headers()['cache-control']` for the document response.

---

### **Edge Cases & Performance Considerations**
- **Cookie forwarding:** the island is fetched by the browser as a separate request. Verify in DevTools that the `sid` cookie reaches it, and explain why that works (same origin) and what would break on a different origin.
- **Cache poisoning:** what happens if the island's response is cached by the CDN with `s-maxage`? Describe the failure, and say what `Vary: Cookie` would and would not fix.
- **Slow session store:** the island takes 400 ms. Confirm the shell's TTFB and LCP are unaffected, and say what you would show if the lookup failed.

**Stretch:** pass a prop to the island (e.g. `currency`) and explain how server islands serialize props and why they are encrypted.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright suite or a starter project.
- **(B)** Paste your solution for a review of correctness, edge cases, accessibility and performance.
