# Root-cause analysis

Line numbers refer to the starter in `README.md`. The fixed component is `app/src/Feed.tsx`, and the original solution is in `before-review/Feed.tsx`.

## 1. Duplicate posts on a fast scroll

The starter calls `setPosts([...posts, ...page.items])` and guards with `if (loading || cursor === null)`. All three values come from the render that created the observer callback.

Each `posts` change creates another observer (symptom 2), and each observer calls the `loadMore` of the render it was created in. Those calls see an old `loading === false` and an old `cursor`, so the same cursor is fetched again. The old `posts` array is then spread together with a page that is already in the list.

`setLoading(true)` doesn't help, because state only changes on the next render. Two callbacks in the same tick both pass the guard.

**Fix:**
- The guard and the cursor live in refs, which are read and written synchronously.
- The list is appended with the updater form, `setPosts(prev => [...prev, ...items])`.

## 2. Several requests for the same cursor

The `useEffect(..., [posts])` creates a new `IntersectionObserver` on every page and never disconnects the old one, because it has no cleanup. After *n* pages, *n + 1* observers watch the same sentinel. One scroll near the bottom fires all of them, and each calls `loadMore`, so you get one request per observer for the same cursor.

**Fix:**
- One observer is created per mounted feed, in an effect with `[]` dependencies, and disconnected in its cleanup.
- `loadMore` only reads refs and setters, so the first render's copy never goes stale.

## 3. Observers outliving the feed

The same effect has no cleanup. Unmounting, or re-rendering for a new `feedId`, leaves every observer alive, still holding the detached sentinel and still calling `loadMore`.

**Fix:** the cleanup calls `observer.disconnect()`. `Feed` renders `<FeedList key={feedId} />`, so a new feed is a new mount: the old instance's cleanup runs and the new one starts fresh.

## 4. Old feed's posts in the new feed

Nothing ties a request to the feed that made it. `fetchPage(cursor)` gets no signal, and nothing resets `posts` or `cursor` when `feedId` changes. A response that started under feed A resolves after the switch and is appended to feed B's list. B also continues from A's cursor.

**Fix:**
- Every `FeedList` instance owns an `AbortController` and passes its `signal` to `fetchPage`. Unmounting (including a `feedId` change, through the `key`) aborts it.
- `loadMore` also drops a page whose signal was aborted while it was in flight. A real `fetch` plus a parse can still resolve after the abort.
- An `AbortError` is not shown as an error.
- The `finally` only releases the loading guard if its request still belongs to the current controller.

## Edge cases

- **The sentinel is already visible.** An `IntersectionObserver` reports *changes* in visibility. If 20 posts don't fill the screen, the sentinel never leaves the viewport and the callback never fires again. An effect on `[posts]` measures the sentinel after each page is committed, and loads again while it is still on screen.
- **Stretch goal, `rootMargin`:** with `rootMargin: "400px"`, the callback fires before the sentinel is visible. It can fire again for the same cursor, for example when the user scrolls back and forth inside the margin while a request is in flight, so `loadMore` must stay idempotent. The ref guard plus the cursor check provide that.
