### **Daily Frontend Challenge: [Architecture & SSR] The Live Search That Shows the Wrong Results: Request Races in htmx**

> **Focus:** keeping a hypermedia live search consistent when responses arrive out of order (`hx-trigger` delay + `hx-sync`) · **Time box:** ~40 min
> **Format:** Small app · **Stack:** htmx 2 (`htmx.org@2.0.11`) + a Node 22 server returning HTML fragments + TypeScript

#### **Overview**
A city search sends a request on every keystroke and swaps the server's HTML fragment into the page. The server is slower for short queries, so typing `ber` can leave the results for `b` on screen. In server-driven UIs the "latest wins" rule isn't automatic; you have to declare it.

---

### **What You'll Learn**

**Core concept:** the order in which responses arrive is not the order in which requests were sent, so the client must either drop superseded requests or avoid sending them.

**By the end you should be able to:**
- Reproduce an out-of-order response bug and explain why it happens.
- Debounce an htmx trigger with the `delay:` modifier and de-duplicate it with `changed`.
- Use `hx-sync` with a `replace` strategy to abort the in-flight request.
- Show a loading state with `hx-indicator` without breaking accessibility.

**Skills practised:** htmx triggers · `hx-sync` · request cancellation · hypermedia / HTML-over-the-wire · `aria-live`

**Prerequisites:** HTML attributes, basic HTTP GET, how `AbortController` cancels a fetch.

**Where this shows up in practice:** typeahead search, filter panels and any partial-page update in htmx, Hotwire or Phoenix LiveView apps. In React the same bug is solved with an `AbortController` or a stale-response flag in an effect cleanup.

**Self-check (answer after solving):**
1. Why does debouncing alone not fully remove the race?
2. What is the difference between `hx-sync="this:replace"` and `this:drop`, and which fits a search box?
3. When htmx aborts a request, has the server stopped working on it?

---

### **Why htmx?**
htmx lets plain HTML attributes issue requests and swap server-rendered fragments, so the state lives on the server and the client has almost no JavaScript. That makes request coordination something you declare in markup. Docs: https://htmx.org/docs/

---

### **Starter**
The project lives in `live-search/`:

```
cd live-search && npm install && npm run dev
```

Then open http://localhost:5173. The server (`server/server.ts`) returns `<p>N result(s) for “q”</p><ul>…</ul>` and delays each response by `max(100, 1200 - 350 * q.length)` ms, so short queries are slow. Only `index.html` needs to change. The input today:

```html
<input type="search" name="q" autocomplete="off"
       hx-get="/search" hx-trigger="input" hx-target="#results" />
<div id="results"></div>
```

Type `ber` quickly: three requests go out, and the slow response for `b` lands last.

---

### **Detailed Requirements**
- Wait for the user to pause for 250 ms before sending, and don't send when the value didn't change.
- If a request is already in flight when a new one starts, abort the old one so only the latest response is swapped in.
- Show a "Searching…" element while a request is in flight (`hx-indicator`), hidden otherwise.
- Announce the result count to screen readers by making the results container a polite live region.
- Only `index.html` changes: no extra JavaScript, no server edits.

### **Acceptance Criteria**
- Typing `ber` quickly, then waiting, always ends with `2 result(s) for “ber”`; never with the count for `b` or `be`.
- The Network panel shows no request per keystroke while typing continuously, and an aborted request shows as cancelled.
- "Searching…" is visible during the request and gone afterwards.
- Playwright check: `fill` the input with `b`, then 300 ms later with `ber`; assert `#results` contains `“ber”` after 2 s and the page issued a single `/search` request.

---

### **Edge Cases & Performance Considerations**
- **Pause longer than the delay:** the user types `b`, pauses 300 ms (request sent), then types `e`. The first request is still in flight, so `hx-sync` must cancel it.
- **Clearing the input:** an empty value must still trigger a request (or empty the results) and must not leave stale results.
- **Server work:** aborting a request on the client doesn't stop the server's work. Note what the server could do to stop early.

*Stretch goal:* add `hx-push-url="true"` so the query is in the address bar, and check back/forward restores the right results.

---

### **Interactive Next Steps**
- **(A)** Ask for a Playwright spec that reproduces the race and verifies the fix.
- **(B)** Paste your solution for a review of correctness, edge cases and accessibility.
