### **Daily Frontend Challenge: [Accessibility & Headless UI] Headless, Framework-Agnostic Combobox Controller**

#### **Overview**

Every design system eventually ships a searchable select (a combobox), and it's one of the hardest components to get right. Most of the bugs come from interaction details: stale async results overwriting fresh ones, Enter selecting an option while a Japanese IME is still composing, `aria-activedescendant` pointing at a node that virtualization has already unmounted, or a blur that closes the popup before the option's click lands. Headless libraries (Radix, Ark/Zag, React Aria, Melt UI) solve this with a **framework-agnostic state machine plus "prop getters"**, so React, Svelte, Angular and Vue adapters can share one tested core. You're building that core.

---

### **Detailed Requirements**

**1. Public types**

```ts
export interface ComboboxOption<T> {
  id: string;            // stable, unique, used for DOM ids & selection identity
  value: T;
  label: string;         // used for filtering, typeahead & announcements
  disabled?: boolean;
}

export type OptionSource<T> =
  | readonly ComboboxOption<T>[]
  | ((query: string, signal: AbortSignal) => Promise<readonly ComboboxOption<T>[]>);

export interface ComboboxConfig<T> {
  id: string;                                   // base id, caller-supplied (SSR-stable)
  source: OptionSource<T>;
  selectionMode?: 'single' | 'multiple';        // default 'single'
  filter?: (option: ComboboxOption<T>, query: string) => boolean; // sync sources only; default: case-insensitive `includes`
  loop?: boolean;                               // wrap ArrowUp/Down at the ends, default true
  debounceMs?: number;                          // async sources only, default 150
  onChange?: (selected: readonly ComboboxOption<T>[]) => void;
}

export interface ComboboxState<T> {
  isOpen: boolean;
  inputValue: string;
  activeId: string | null;                      // track by ID, NOT by index
  visibleOptions: readonly ComboboxOption<T>[];
  selectedIds: ReadonlySet<string>;
  status: 'idle' | 'loading' | 'error';
  error: unknown;
  announcement: string;                         // text for an aria-live="polite" region
}

export type ComboboxEvent =
  | { type: 'INPUT'; value: string }
  | { type: 'KEYDOWN'; key: string; isComposing?: boolean; altKey?: boolean }
  | { type: 'COMPOSITION_START' } | { type: 'COMPOSITION_END'; value: string }
  | { type: 'OPTION_POINTERDOWN'; id: string }  // fires before input blur
  | { type: 'OPTION_CLICK'; id: string }
  | { type: 'OPTION_HOVER'; id: string }
  | { type: 'FOCUS' } | { type: 'BLUR' }
  | { type: 'OPEN' } | { type: 'CLOSE' };
```

**2. Factory & controller API**

```ts
export function createCombobox<T>(config: ComboboxConfig<T>): Combobox<T>;

export interface Combobox<T> {
  getState(): Readonly<ComboboxState<T>>;       // same reference until something changes
  subscribe(listener: (s: Readonly<ComboboxState<T>>) => void): () => void;
  send(event: ComboboxEvent): void;
  getInputProps(): Record<string, string | number | boolean | undefined>;
  getListboxProps(): Record<string, string | number | boolean | undefined>;
  getOptionProps(id: string): Record<string, string | number | boolean | undefined>;
  destroy(): void;
}
```

**3. Keyboard contract (WAI-ARIA APG, "Combobox with listbox popup")**

| Key | Behavior |
|---|---|
| `ArrowDown` / `ArrowUp` | Open if closed. When open, move `activeId` to the next/previous **enabled** option and wrap only if `loop` is set |
| `Alt+ArrowDown` | Open without moving `activeId` |
| `Home` / `End` | First/last enabled option (only while open; otherwise leave it to the native caret) |
| `Enter` | Select `activeId`. In `single` mode, close and set `inputValue` to the option label. In `multiple` mode, toggle and stay open |
| `Escape` | If open, close. If already closed, clear `inputValue` |
| `Tab` | Close without selecting and don't prevent the default |

**4. Prop getters (the ARIA wiring)**

- Input: `role="combobox"`, `aria-expanded`, `aria-controls="{id}-listbox"`, `aria-autocomplete="list"`, `aria-activedescendant` (**`undefined` when closed or when nothing is active, never an empty string**), `aria-busy` while loading.
- Listbox: `role="listbox"`, `id="{id}-listbox"`, `aria-multiselectable` in multiple mode.
- Option: `role="option"`, `id="{id}-option-{option.id}"`, `aria-selected`, `aria-disabled`, `aria-setsize` / `aria-posinset` (required once the list is virtualized), and `data-active` for styling.

**5. Async sources**

- Debounce the calls by `debounceMs`, and pass an `AbortSignal` that you abort as soon as a newer query supersedes the request.
- **Only the latest request may commit state.** Drop a stale resolution even if the fetcher ignores the signal.
- On error, set `status: 'error'`, keep the previous `visibleOptions`, and announce the failure.

**6. Live-region announcements**

- After the results settle, set `announcement` to something like `"5 results available."` or `"No results."`. Don't announce on every keystroke of a debounced query.
- On selection in `multiple` mode, announce `"<label> selected."` or `"<label> deselected."`.

**Constraints:** no DOM access inside the core (no `document`, `scrollIntoView`, `getComputedStyle`), no `Math.random()` or module-level counters for ids, and strict TypeScript with no `any`. Adapters own the side effects.

---

### **Edge Cases & Performance Considerations**

1. **Active option disappears from the list.** The user has `"Apple"` active and types `"ban"`. Keep `activeId` if that id is still in `visibleOptions`, otherwise reset it to `null`. Don't silently map an old index onto a different option. This is why you track by id: index-based tracking makes Enter select the wrong item, which is a correctness *and* WCAG 3.3.4 issue. Disabled options must be skipped, and a list where *every* option is disabled must not cause an infinite loop in `ArrowDown`.
2. **IME composition (CJK input).** Between `COMPOSITION_START` and `COMPOSITION_END`, or whenever `KEYDOWN.isComposing` is true, `Enter` commits the IME candidate and must **not** select an option. Also skip filtering and fetching on the intermediate `INPUT` events, and run the query once on `COMPOSITION_END`. Many production comboboxes get this wrong.
3. **Blur vs. click ordering.** On a real pointer click the order is `pointerdown` → input `blur` → `click`. If `BLUR` closes the popup and clears the options, the click has nothing left to hit. Use `OPTION_POINTERDOWN` to set an "interacting with listbox" flag so that `BLUR` is ignored until the click has been handled. Clear the flag afterwards or focus will leak.
4. **Race conditions, memory and SSR hydration.**
   - Type `a` → `ab` → `abc` with responses arriving in the order 3, 1, 2: only `abc` may render.
   - `destroy()` must clear the debounce timer, abort any in-flight request, and drop listeners, so that a promise resolving after unmount doesn't notify anyone.
   - Every id derives from `config.id`, so server and client markup match. A module counter drifts between SSR and hydration and breaks every `aria-*` reference.
   - `getState()` must return a **stable reference** when nothing has changed; otherwise `useSyncExternalStore` will loop forever.
   - Don't notify subscribers for no-op transitions, for example `ArrowDown` on an empty list.

**Stretch (staff-level):** write a ~40-line React adapter (`useCombobox`) on top of `useSyncExternalStore` and a Svelte 5 adapter on top of `$state`/`createSubscriber`. Then explain in writing which layer owns `scrollIntoView({ block: 'nearest' })` for the active option, and why it must run in a layout-phase effect rather than inside the core.

---

### **Interactive Next Steps**

- **(A)** Ask for a **Vitest suite** (fake timers, deferred promises for out-of-order responses, IME and blur-ordering scenarios, ARIA prop snapshots) **or starter code** (`package.json`, `tsconfig.json`, a typed `combobox.ts` skeleton), matching this repo's per-day layout.
- **(B)** Paste your `combobox.ts` for a **review** of type accuracy (event narrowing, generic inference on `T`), edge-case coverage against the list above, and performance (reference stability, notification batching, abort handling).
