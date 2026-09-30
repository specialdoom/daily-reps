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
  send(event: ComboboxEvent): void;
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
  let isComposing = false;
  let announceTimer: number | undefined;
  let selectedOptions = new Map<string, ComboboxOption<T>>();
  let isPointerDown = false;

  function subscribe(listener: Listener<T>) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function send(event: ComboboxEvent) {
    switch (event.type) {
      case "INPUT": {
        if (isComposing) {
          setState({ inputValue: event.value });
          return;
        }
        filtering(event.value, { isOpen: true });
        break;
      }
      case "KEYDOWN": {
        if (event.isComposing || isComposing) return;

        if (event.key === "ArrowDown" && event.altKey) {
          if (!state.isOpen) open();
          return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          if (!state.isOpen) {
            open();
          } else {
            const direction = event.key === "ArrowDown" ? 1 : -1;
            const nextId =
              findNextEnabledId(state.activeId, direction) ?? state.activeId;

            setState({
              activeId: nextId,
            });
          }
        } else if (event.key === "Enter") {
          if (state.activeId) selectOption(state.activeId);
        } else if (
          (event.key === "Home" || event.key === "End") &&
          state.isOpen
        ) {
          const direction = event.key === "Home" ? 1 : -1;

          setState({
            activeId: findNextEnabledId(null, direction),
          });
        } else if (event.key === "Escape") {
          if (state.isOpen) {
            close();
          } else {
            setState({ inputValue: "", announcement: "" });
          }
        } else if (event.key === "Tab") {
          close();
        }
        break;
      }
      case "COMPOSITION_START": {
        isComposing = true;
        break;
      }
      case "COMPOSITION_END": {
        isComposing = false;
        filtering(event.value, { isOpen: true });
        break;
      }
      case "OPTION_CLICK": {
        isPointerDown = false;
        selectOption(event.id);
        break;
      }
      case "OPTION_POINTERDOWN": {
        isPointerDown = true;
        break;
      }
      case "BLUR": {
        if (isPointerDown) {
          isPointerDown = false;
        } else {
          close();
        }
        break;
      }
      case "OPTION_HOVER": {
        const option = getSelectableOption(event.id);
        if (!option) return;

        setState({
          activeId: option.id,
        });
        break;
      }
      case "OPEN": {
        open();
        break;
      }
      case "CLOSE": {
        close();
        break;
      }
      case "FOCUS": {
        isComposing = false;
        break;
      }
    }
  }

  function open() {
    filtering(state.inputValue, { isOpen: true });
  }

  function close() {
    cancelPending();
    setState({ isOpen: false, announcement: "", status: "idle" });
  }

  function filtering(value: string, patch?: Partial<ComboboxState<T>>) {
    if (source instanceof Array) {
      let visibleOptions = source.filter((option) => {
        if (filter) {
          return filter(option, value);
        }
        return option.label.toLowerCase().includes(value.toLowerCase());
      });
      let activeId = state.activeId;
      if (!visibleOptions.some((option) => option.id === state.activeId)) {
        activeId = null;
      }
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
      const controller = new AbortController();
      setState({ ...patch, inputValue: value, status: "loading" });
      clearTimeout(debounceTimer);
      abortController?.abort();
      debounceTimer = setTimeout(() => {
        abortController = controller;
        source(value, controller.signal)
          .then((value) => {
            if (controller.signal.aborted) {
              return;
            }
            let activeId = state.activeId;
            if (!value.some((option) => option.id === state.activeId)) {
              activeId = null;
            }
            setState({
              visibleOptions: value,
              status: "idle",
              error: null,
              activeId,
              announcement: toResults(value.length),
            });
          })
          .catch((error) => {
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

  function getSelectableOption(id: string): ComboboxOption<T> | undefined {
    const option = state.visibleOptions.find((option) => option.id === id);

    if (!option || option.disabled) return undefined;

    return option;
  }

  function selectOption(id: string) {
    const option = getSelectableOption(id);

    if (!option) return;

    if (selectionMode === "single") {
      selectedOptions.clear();
      selectedOptions.set(option.id, option);
      setState({
        selectedIds: new Set([id]),
        inputValue: option?.label,
        isOpen: false,
      });
      onChange?.(getSelectedOptions());
    } else if (selectionMode === "multiple") {
      const selectedIds = new Set(state.selectedIds);
      if (option.disabled) return;

      if (state.selectedIds.has(id)) {
        selectedIds.delete(id);
        selectedOptions.delete(option.id);
        setState({
          selectedIds,
          announcement: `${option?.label} deselected.`,
        });
      } else {
        selectedOptions.set(option.id, option);
        selectedIds.add(id);
        setState({
          selectedIds: selectedIds,
          announcement: `${option?.label} selected.`,
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
    listeners.clear();
    cancelPending();
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
      "aria-controls": `${configId}-listbox`,
      "aria-activedescendant": activedescendant,
      "aria-busy": state.status === "loading",
      "aria-autocomplete": "list",
    };
  }

  function getOptionProps(id: string) {
    const optionIndex = state.visibleOptions.findIndex(
      (option) => option.id === id,
    );
    const isDisabled = state.visibleOptions[optionIndex]?.disabled;

    return {
      role: "option",
      id: getOptionId(id),
      "aria-selected": state.selectedIds.has(id),
      "aria-disabled": isDisabled,
      "data-active": state.activeId === id,
      "aria-setsize": state.visibleOptions.length,
      "aria-posinset": optionIndex + 1,
    };
  }

  function getListboxProps() {
    return {
      role: "listbox",
      id: `${configId}-listbox`,
      "aria-multiselectable": selectionMode === "multiple",
    };
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
