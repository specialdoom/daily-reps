/** Challenge information */
export interface ComboboxOption<T> {
  id: string; // stable, unique, used for DOM ids & selection identity
  value: T;
  label: string; // used for filtering, typeahead & announcements
  disabled?: boolean;
}

export type OptionSource<T> =
  | readonly ComboboxOption<T>[]
  | ((
      query: string,
      signal: AbortSignal,
    ) => Promise<readonly ComboboxOption<T>[]>);

export interface ComboboxConfig<T> {
  id: string; // base id, caller-supplied (SSR-stable)
  source: OptionSource<T>;
  selectionMode?: "single" | "multiple"; // default 'single'
  filter?: (option: ComboboxOption<T>, query: string) => boolean; // sync sources only; default: case-insensitive `includes`
  loop?: boolean; // wrap ArrowUp/Down at the ends, default true
  debounceMs?: number; // async sources only, default 150
  onChange?: (selected: readonly ComboboxOption<T>[]) => void;
}

export interface ComboboxState<T> {
  isOpen: boolean;
  inputValue: string;
  activeId: string | null; // track by ID, NOT by index
  visibleOptions: readonly ComboboxOption<T>[];
  selectedIds: ReadonlySet<string>;
  status: "idle" | "loading" | "error";
  error: unknown;
  announcement: string; // text for an aria-live="polite" region
}

export type ComboboxEvent =
  | { type: "INPUT"; value: string }
  | { type: "KEYDOWN"; key: string; isComposing?: boolean; altKey?: boolean }
  | { type: "COMPOSITION_START" }
  | { type: "COMPOSITION_END"; value: string }
  | { type: "OPTION_POINTERDOWN"; id: string } // fires before input blur
  | { type: "OPTION_CLICK"; id: string }
  | { type: "OPTION_HOVER"; id: string }
  | { type: "FOCUS" }
  | { type: "BLUR" }
  | { type: "OPEN" }
  | { type: "CLOSE" };

export type Listener<T> = (s: Readonly<ComboboxState<T>>) => void;

export interface Combobox<T> {
  getState(): Readonly<ComboboxState<T>>; // same reference until something changes
  subscribe(listener: Listener<T>): () => void;
  send(event: ComboboxEvent): boolean; // true = handled, adapter should call preventDefault()
  getInputProps(): Record<string, string | number | boolean | undefined>;
  getListboxProps(): Record<string, string | number | boolean | undefined>;
  getOptionProps(
    id: string,
  ): Record<string, string | number | boolean | undefined>;
  destroy(): void;
}

/** Challenge solution */
export function createCombobox<T>({
  id: configId,
  source,
  filter,
  loop = true,
  selectionMode = "single",
  debounceMs = 150,
  onChange,
}: ComboboxConfig<T>): Combobox<T> {
  // Shared empty list, so resetting the options is a no-op when they're already empty.
  const noOptions: readonly ComboboxOption<T>[] = [];
  let state: ComboboxState<T> = {
    isOpen: false,
    inputValue: "",
    activeId: null,
    selectedIds: new Set(),
    status: "idle",
    error: null,
    visibleOptions: noOptions,
    announcement: "",
  };
  const listeners = new Set<Listener<T>>();
  let abortController: AbortController | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  let pointerTimer: ReturnType<typeof setTimeout> | undefined;
  let isComposing = false;
  let isPointerDown = false;
  let isDestroyed = false;
  const selectedOptions = new Map<string, ComboboxOption<T>>();
  let indexCache:
    | { options: readonly ComboboxOption<T>[]; byId: Map<string, number> }
    | undefined;

  function subscribe(listener: Listener<T>) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function send(event: ComboboxEvent): boolean {
    if (isDestroyed) return false;

    switch (event.type) {
      case "INPUT": {
        if (isComposing) {
          setState({ inputValue: event.value });
          return false;
        }
        filtering(event.value, { isOpen: true });
        return false;
      }
      case "KEYDOWN": {
        return keydown(event);
      }
      case "COMPOSITION_START": {
        isComposing = true;
        return false;
      }
      case "COMPOSITION_END": {
        isComposing = false;
        filtering(event.value, { isOpen: true });
        return false;
      }
      case "OPTION_CLICK": {
        isPointerDown = false;
        selectOption(event.id);
        return false;
      }
      case "OPTION_POINTERDOWN": {
        // The only blur this may excuse is the one the same click causes, which the
        // browser fires in the same task. Expire the flag on the next task so it can
        // never swallow a later, genuine blur (drag-off, or an adapter that keeps
        // focus with mousedown.preventDefault() and so never blurs at all).
        isPointerDown = true;
        clearTimeout(pointerTimer);
        pointerTimer = setTimeout(() => {
          isPointerDown = false;
        }, 0);
        return false;
      }
      case "BLUR": {
        isComposing = false;
        if (isPointerDown) {
          isPointerDown = false;
        } else {
          close();
        }
        return false;
      }
      case "OPTION_HOVER": {
        const option = getSelectableOption(event.id);
        if (!option) return false;

        setState({
          activeId: option.id,
        });
        return false;
      }
      case "OPEN": {
        open();
        return false;
      }
      case "CLOSE": {
        close();
        return false;
      }
      case "FOCUS": {
        isComposing = false;
        return false;
      }
    }
  }

  function keydown(event: Extract<ComboboxEvent, { type: "KEYDOWN" }>) {
    if (event.isComposing || isComposing) return false;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (!state.isOpen) {
          open();
        } else if (!(event.altKey && event.key === "ArrowDown")) {
          // Alt+ArrowDown only opens; it never moves the active option.
          const direction = event.key === "ArrowDown" ? 1 : -1;
          const nextId =
            findNextEnabledId(state.activeId, direction) ?? state.activeId;

          setState({
            activeId: nextId,
          });
        }
        return true;
      }
      case "Enter": {
        // Only while open: a closed popup has no visible active option, and the
        // Enter must be left alone so it can submit the surrounding form.
        if (!state.isOpen || !state.activeId) return false;

        selectOption(state.activeId);
        return true;
      }
      case "Home":
      case "End": {
        // While closed, leave Home/End to the native caret.
        if (!state.isOpen) return false;

        const direction = event.key === "Home" ? 1 : -1;
        setState({
          activeId: findNextEnabledId(null, direction),
        });
        return true;
      }
      case "Escape": {
        if (state.isOpen) {
          close();
          return true;
        }
        if (state.inputValue === "") return false;

        setState({
          inputValue: "",
          visibleOptions: noOptions,
          activeId: null,
          announcement: "",
        });
        return true;
      }
      case "Tab": {
        close();
        return false;
      }
      default:
        return false;
    }
  }

  function open() {
    if (state.isOpen) return;

    filtering(state.inputValue, { isOpen: true });
  }

  function close(patch?: Partial<ComboboxState<T>>) {
    cancelPending();
    setState({
      ...patch,
      isOpen: false,
      activeId: null,
      announcement: "",
      status: "idle",
      error: null,
    });
  }

  function filtering(value: string, patch?: Partial<ComboboxState<T>>) {
    if (isOptionList(source)) {
      const query = value.toLowerCase();
      const matches = source.filter((option) => {
        if (filter) {
          return filter(option, value);
        }
        return option.label.toLowerCase().includes(query);
      });
      // Keep the previous array when the result is unchanged, so setState sees no change.
      const visibleOptions = isSameOptions(matches, state.visibleOptions)
        ? state.visibleOptions
        : matches;
      const activeId = visibleOptions.some(
        (option) => option.id === state.activeId,
      )
        ? state.activeId
        : null;
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => {
        setState({ announcement: toResults(visibleOptions.length) });
      }, debounceMs);
      setState({
        ...patch,
        inputValue: value,
        visibleOptions,
        activeId,
      });
    } else {
      const fetchOptions = source;
      const controller = new AbortController();
      setState({ ...patch, inputValue: value, status: "loading" });
      clearTimeout(debounceTimer);
      abortController?.abort();
      debounceTimer = setTimeout(() => {
        abortController = controller;
        // Promise.resolve().then(...) turns a fetcher that throws synchronously
        // into a rejection, so it lands in .catch instead of leaving status "loading".
        Promise.resolve()
          .then(() => fetchOptions(value, controller.signal))
          .then((results) => {
            if (controller.signal.aborted) {
              return;
            }
            const activeId = results.some(
              (option) => option.id === state.activeId,
            )
              ? state.activeId
              : null;
            setState({
              visibleOptions: results,
              status: "idle",
              error: null,
              activeId,
              announcement: toResults(results.length),
            });
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) {
              return;
            }
            setState({
              status: "error",
              error,
              announcement: "Failed to get the results.",
            });
          });
      }, debounceMs);
    }
  }

  // Array.isArray doesn't narrow readonly arrays out of a union, hence the guard.
  function isOptionList(
    value: OptionSource<T>,
  ): value is readonly ComboboxOption<T>[] {
    return Array.isArray(value);
  }

  function isSameOptions(
    a: readonly ComboboxOption<T>[],
    b: readonly ComboboxOption<T>[],
  ) {
    return a.length === b.length && a.every((option, i) => option === b[i]);
  }

  function indexOfOption(id: string | null) {
    if (id === null) return -1;
    if (indexCache?.options !== state.visibleOptions) {
      indexCache = {
        options: state.visibleOptions,
        byId: new Map(state.visibleOptions.map((option, i) => [option.id, i])),
      };
    }
    return indexCache.byId.get(id) ?? -1;
  }

  function findNextEnabledId(fromId: string | null, direction: 1 | -1) {
    const visibleOptions = state.visibleOptions;
    let fromIndex = indexOfOption(fromId);
    const length = visibleOptions.length;

    if (fromIndex === -1 && direction === -1) {
      fromIndex = length;
    }

    for (let step = 1; step <= length; step++) {
      let index = fromIndex + step * direction;
      if (index < 0 || index >= length) {
        if (!loop) return null;

        index = (index + length) % length;
      }
      if (visibleOptions[index].disabled) continue;

      return visibleOptions[index].id;
    }

    return null;
  }

  function setState(patch: Partial<ComboboxState<T>>) {
    const hasChanges = Object.keys(patch).some((key) => {
      const indexKey = key as keyof ComboboxState<T>;

      return patch[indexKey] !== state[indexKey];
    });

    if (hasChanges) {
      state = { ...state, ...patch };

      listeners.forEach((listener) => listener(state));
    }
  }

  function getState() {
    return state;
  }

  function getSelectableOption(id: string): ComboboxOption<T> | undefined {
    const option = state.visibleOptions[indexOfOption(id)];

    if (!option || option.disabled) return undefined;

    return option;
  }

  function selectOption(id: string) {
    const option = getSelectableOption(id);

    if (!option) return;

    if (selectionMode === "single") {
      const isAlreadySelected =
        state.selectedIds.size === 1 && state.selectedIds.has(id);

      if (isAlreadySelected) {
        close({ inputValue: option.label });
        return;
      }
      selectedOptions.clear();
      selectedOptions.set(option.id, option);
      close({ selectedIds: new Set([id]), inputValue: option.label });
      onChange?.(getSelectedOptions());
    } else {
      // A results announcement still pending would overwrite this one.
      clearTimeout(announceTimer);
      const selectedIds = new Set(state.selectedIds);

      if (state.selectedIds.has(id)) {
        selectedIds.delete(id);
        selectedOptions.delete(option.id);
        setState({
          selectedIds,
          announcement: `${option.label} deselected.`,
        });
      } else {
        selectedOptions.set(option.id, option);
        selectedIds.add(id);
        setState({
          selectedIds,
          announcement: `${option.label} selected.`,
        });
      }
      onChange?.(getSelectedOptions());
    }
  }

  function getSelectedOptions() {
    return [...selectedOptions.values()];
  }

  function toResults(count: number) {
    if (count === 0) return "No results.";
    if (count === 1) return "One result available.";

    return `${count} results available.`;
  }

  function destroy() {
    isDestroyed = true;
    listeners.clear();
    cancelPending();
    clearTimeout(pointerTimer);
  }

  function cancelPending() {
    abortController?.abort();
    clearTimeout(debounceTimer);
    clearTimeout(announceTimer);
  }

  function getInputProps() {
    let activedescendant = undefined;
    if (state.isOpen && state.activeId) {
      activedescendant = getOptionId(state.activeId);
    }
    return {
      role: "combobox",
      "aria-expanded": state.isOpen,
      "aria-controls": getListboxId(),
      "aria-activedescendant": activedescendant,
      "aria-busy": state.status === "loading",
      "aria-autocomplete": "list",
    };
  }

  function getOptionProps(id: string) {
    const optionIndex = indexOfOption(id);
    const isKnown = optionIndex !== -1;

    return {
      role: "option",
      id: getOptionId(id),
      "aria-selected": state.selectedIds.has(id),
      "aria-disabled": state.visibleOptions[optionIndex]?.disabled,
      "data-active": state.activeId === id,
      "aria-setsize": isKnown ? state.visibleOptions.length : undefined,
      "aria-posinset": isKnown ? optionIndex + 1 : undefined,
    };
  }

  function getListboxProps() {
    return {
      role: "listbox",
      id: getListboxId(),
      "aria-multiselectable": selectionMode === "multiple",
    };
  }

  function getListboxId() {
    return `${configId}-listbox`;
  }

  function getOptionId(id: string) {
    return `${configId}-option-${id}`;
  }

  return {
    subscribe,
    getState,
    destroy,
    send,
    getInputProps,
    getOptionProps,
    getListboxProps,
  };
}
