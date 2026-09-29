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
  source: readonly ComboboxOption<T>[];
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
  send(event: ComboboxEvent): void;
  getInputProps(): Record<string, string | number | boolean | undefined>;
  getListboxProps(): Record<string, string | number | boolean | undefined>;
  getOptionProps(
    id: string,
  ): Record<string, string | number | boolean | undefined>;
  destroy(): void;
}

export function createCombobox<T>({
  source,
  filter,
  loop = true,
  selectionMode = 'single'
}: ComboboxConfig<T>) {
  let state: ComboboxState<T> = {
    isOpen: false,
    inputValue: "",
    activeId: null,
    selectedIds: new Set(),
    status: "idle",
    error: null,
    visibleOptions: [],
    announcement: "",
  };
  const listeners = new Set<Listener<T>>();
  let abortController: AbortController | undefined;
  let debounceTimer: number | undefined;

  function subscribe(listener: Listener<T>) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function send(event: ComboboxEvent) {
    switch (event.type) {
      case "INPUT": {
        let visibleOptions = source.filter((option) => {
          if (filter) {
            return filter(option, event.value);
          }
          return option.label.toLowerCase().includes(event.value.toLowerCase());
        });
        let activeId = state.activeId;
        if (!visibleOptions.some((option) => option.id === state.activeId)) {
          activeId = null;
        }
        setState({
          inputValue: event.value,
          isOpen: true,
          visibleOptions,
          activeId,
        });
      }

      case "KEYDOWN": {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          if (!state.isOpen) {
            setState({ isOpen: true });
          } else {
            const direction = event.key === "ArrowDown" ? 1 : -1;
            const nextId =
              findNextEnabledId(state.activeId, direction) ?? state.activeId;

            setState({
              activeId: nextId,
            });
          }
        } else if(event.key === "Enter") {
          if(selectionMode === 'single') {
            state.selectedIds.add(activeId);
          }
        }
      }
    }
  }

  function findNextEnabledId(fromId: string | null, direction: 1 | -1) {
    const visibleOptions = state.visibleOptions;
    let fromIndex = visibleOptions.findIndex((option) => option.id === fromId);
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

  function destroy() {
    listeners.clear();
    abortController?.abort();
    if (debounceTimer) clearTimeout(debounceTimer);
  }

  return {
    subscribe,
    getState,
    destroy,
    send,
  };
}
