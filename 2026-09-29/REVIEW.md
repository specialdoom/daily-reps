# Code review: 2026-09-29 headless combobox

**Scope:** `2026-09-29/combobox.ts` (and, lightly, `playground/`) at `b9f8439`, checked against `2026-09-29/README.md`.
**Method:** independent review with no prior context on the implementation. Each suspected bug was reproduced with small Node scripts that drive `createCombobox` through `send(...)`. `npx tsc --noEmit -p .` is clean (exit 0, TypeScript 7.0.2, `strict: true`).

## Overall

The core is compact and mostly solid. Tracking by id, skipping disabled options, the all-disabled guard, `loop` handling, SSR-stable ids, a stable `getState()` reference and async stale-response dropping and aborting all work. The remaining defects are in **lifecycle edges**: state that survives `close()`, a pointer flag that can leak, a timer that overwrites announcements, no-op events that still notify, and an instance that keeps working after `destroy()`. None of them is hard to fix.

## Requirements checklist

| Requirement | Status | Note |
|---|---|---|
| Public types / API shape | ✅ Met | Matches the spec |
| ArrowDown/Up (open, enabled-only, loop) | ✅ Met | `loop: false` edges and the all-disabled case verified |
| Alt+ArrowDown | ✅ Met | Opens without moving; a no-op when already open |
| Home/End only while open | ✅ Met | |
| Enter single/multiple | ⚠️ Partial | Also selects while **closed** (H1) |
| Escape (close, then clear) | ✅ Met | Clearing leaves stale `visibleOptions`/`activeId` (Low) |
| Tab closes, no preventDefault | ⚠️ Partial | The core can't tell the adapter what it handled (M4) |
| Input / listbox / option props | ✅ Met | `aria-activedescendant` is `undefined` when closed or nothing is active |
| Async debounce + abort on supersede | ✅ Met | |
| Only the latest request commits | ✅ Met | The 3→1→2 order with a fetcher that ignores the signal renders only `abc` |
| Error keeps options + announces | ✅ Met | `close()` resets `status` but not `error` (Nit) |
| Announce after settle, not per keystroke | ⚠️ Partial | The debounced announcement overwrites the selection announcement (M2) |
| Multi-select "selected/deselected" | ⚠️ Partial | Overwritten by M2 |
| IME composition | ✅ Met | See the Safari note (Low) |
| Blur vs. click ordering | ⚠️ Partial | Happy path works; the flag leaks in other paths (M1) |
| SSR-stable ids | ✅ Met | |
| Stable `getState` / no no-op notifications | ⚠️ Partial | Reference is stable, but some no-op events notify (M3) |
| `destroy()` cleanup | ⚠️ Partial | Cleans up, but `send` still works afterwards (Low) |
| Strict TS, no `any` | ⚠️ Partial | `.catch((error) => …)` gets an implicit `any` from the lib typings (Nit) |

## Findings

### 🔴 High

**H1. Enter on a closed combobox selects the stale active option**
- **Where:** `combobox.ts:128-129`, and `close()` at `combobox.ts:204-207`.
- **What goes wrong:** `close()` keeps `activeId`, and the Enter branch doesn't check `state.isOpen`.
- **Scenario:** ArrowDown to Apple, press Escape, then press Enter. Apple is selected and `onChange` fires, even though the popup is closed and `aria-activedescendant` is `undefined`. The user had no cue anything would be selected, and in a form the same Enter would normally submit.
- **Repro:** `Enter while closed → isOpen: false selected: ['apple'] onChange calls: 1`
- **Fix:** `if (state.isOpen && state.activeId) selectOption(state.activeId)`. Consider also resetting `activeId: null` in `close()`.

### 🟠 Medium

**M1. The pointerdown/blur flag can leak, and the popup can stay open**
- **Where:** `combobox.ts:164-175`.
- **Scenarios:**
  - (a) **Drag-off:** pointerdown on an option, then blur, then no click. BLUR is swallowed, and the popup stays open with focus elsewhere.
  - (b) **Stale flag:** the adapter calls `preventDefault` on pointerdown, so no blur follows, and no click follows either. `isPointerDown` stays `true`, and the next genuine blur (Tab away) is swallowed.
  - (c) **Multiple mode:** pointerdown, blur, click. The popup stays open with focus lost, and clicking outside never closes it. The playground shows this.
- **Fix:**
  - Clear the flag on `OPTION_CLICK`, on the next `BLUR` and on `FOCUS`.
  - Ignore pointerdown for ids that aren't selectable.
  - Document that the adapter should refocus the input after a click (or `preventDefault` on pointerdown).

**M2. The pending results announcement overwrites the selection announcement**
- **Where:** `announceTimer` at `combobox.ts:221-224`. `selectOption` (`combobox.ts:336-346`) doesn't clear it.
- **Scenario:** in multiple mode, type `ap`, press ArrowDown, then press Enter within `debounceMs`.
- **Repro:** announcement sequence `["", "Apple selected.", "2 results available."]`. The selection is never the final announcement.
- **Fix:** `clearTimeout(announceTimer)` whenever another announcement is set, including in `selectOption`.

**M3. No-op events still notify subscribers**
- **Where:** `combobox.ts:211-230`. The sync `filtering` always builds a **new** `visibleOptions` array, so the `!==` check in `setState` always sees a change.
- **Repro:** `OPEN` twice gives notifications 1 → 2 and a different reference. `INPUT` with an unchanged value also notifies.
- **Related:**
  - An async `OPEN` while already open refetches and flips `status` to `loading` (`:233`).
  - Re-selecting the already-selected option in single mode builds a new `Set`, which notifies and calls `onChange` again (`:327`).
- **Fix:**
  - Reuse the previous array when the ids are shallow-equal.
  - Early-return in `open()` when already open.
  - Skip the update when the selection hasn't changed.

**M4. The core can't tell the adapter which keys it handled**
- **Where:** `send()` returns `void` (`combobox.ts:99`).
- **What goes wrong:** "Tab: don't prevent default" and "Home/End while closed: leave it to the native caret" can only be enforced if the adapter re-implements the key logic. The playground does exactly that (`playground/index.ts:143-159`), and its rules already differ from the core's (see H1).
- **Fix:** return `boolean` ("handled, call `preventDefault`") from `send` for `KEYDOWN`, or expose a `shouldPreventDefault(event)` helper.

### 🟡 Low

- **Works after `destroy()`** (`:363-372`): `send` still changes state and schedules timers and fetches after unmount. Add a `destroyed` flag and early-return in `send`.
- **A fetcher that throws synchronously** (`:238`): the throw happens inside `setTimeout`, so it's uncaught and `status` stays `loading`. Wrap it as `Promise.resolve().then(() => source(value, signal))`.
- **`getOptionProps` is O(n) per call** (`:389-403`): rendering every option is O(n²), which works against the virtualization use case. Unknown ids get `aria-posinset: 0`. Cache an `id → index` map per `visibleOptions` reference.
- **Escape while closed** (`:143`): clears `inputValue` but leaves the old query's `visibleOptions`/`activeId`.
- **Identical announcements aren't re-read:** two identical strings in a row don't change state, so live regions stay silent. Clear the announcement first, or track an announcement id.
- **IME on Safari (suspected, not reproduced):** Safari fires `compositionend` *before* the Enter keydown, with `isComposing: false`, so `:110` could select an option. A common guard is `keyCode === 229`, or ignoring the first Enter right after `COMPOSITION_END`.

### ⚪ Nits

- `:331`: `if (option.disabled) return;` is dead code after `getSelectableOption`. The `option?.label` on `:327/338/345` doesn't need optional chaining.
- `:239`: `.then((value) => …)` shadows the query `value`; rename it to `results`. On `:255`, annotate `(error: unknown)`.
- `:86,88`: timers are typed `number | undefined`. Prefer `ReturnType<typeof setTimeout>` so it also works with Node typings.
- `:210`: use `Array.isArray(source)` rather than `instanceof Array`; it's cross-realm safe and the idiomatic narrowing.
- `:206`: `close()` resets `status` but keeps `error`.
- `:193-196`: `FOCUS` resets `isComposing`, but blurring mid-composition doesn't.
- `:89`: `selectedOptions` can be `const`. The same applies to the `let` declarations inside `filtering`.
- `:1,64`: the "Challenge information / solution" comments are leftovers.
- `:415`: option DOM ids interpolate `option.id` as-is. Ids containing spaces produce invalid IDREFs.
- **Playground:**
  - It doesn't use the prop getters and hand-rolls the ARIA (`index.ts:94-95, 196-228`), so the getters aren't exercised.
  - `:229` writes labels via `innerHTML`, which is safe with static data but an XSS pattern to avoid.
  - Multiple-mode clicks leave the popup open with focus lost (M1c).

## Suggested order of work

1. **H1**: a one-line guard, and consider clearing `activeId` in `close()`.
2. **M2**: clear `announceTimer` in `selectOption`.
3. **M1**: rework the flag's lifecycle and document the adapter's responsibilities.
4. **M3**: keep references stable across no-op events.
5. **M4**: let `send` report whether a key was handled, then simplify the playground to use it and the prop getters.
6. Low items and nits as follow-ups.
