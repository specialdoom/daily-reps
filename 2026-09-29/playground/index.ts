import {
  type ComboboxConfig,
  type ComboboxEvent,
  type ComboboxOption,
  type ComboboxState,
  createCombobox,
} from "../combobox.js";

const fruits: ComboboxOption<string>[] = [
  { id: "apple", value: "apple", label: "Apple" },
  { id: "apricot", value: "apricot", label: "Apricot" },
  { id: "banana", value: "banana", label: "Banana" },
  {
    id: "bandana",
    value: "bandana",
    label: "Bandana (disabled)",
    disabled: true,
  },
  { id: "blueberry", value: "blueberry", label: "Blueberry" },
  { id: "cherry", value: "cherry", label: "Cherry" },
  { id: "grape", value: "grape", label: "Grape" },
  { id: "kiwi", value: "kiwi", label: "Kiwi" },
  { id: "mango", value: "mango", label: "Mango" },
  { id: "pear", value: "pear", label: "Pear" },
];

// ---- async fake backend -----------------------------------------------------

const asyncControls = { ignoreSignal: false, failNext: false };
const requestLog: string[] = [];
let renderRequestLog: () => void = () => {};

function fakeFetch(
  query: string,
  signal: AbortSignal,
): Promise<readonly ComboboxOption<string>[]> {
  // Random latency so out-of-order responses happen naturally.
  const latency = 100 + Math.round(Math.random() * 1100);
  const shouldFail = asyncControls.failNext;
  asyncControls.failNext = false;
  syncControlCheckboxes();
  const tag = `"${query}" (${latency}ms)`;
  log(`→ request ${tag}`);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (shouldFail) {
        log(`✗ rejected ${tag}`);
        reject(new Error(`Server error for "${query}"`));
        return;
      }
      const q = query.toLowerCase();
      log(`← resolved ${tag}`);
      resolve(fruits.filter((f) => f.label.toLowerCase().includes(q)));
    }, latency);

    if (!asyncControls.ignoreSignal) {
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        log(`⊘ aborted ${tag}`);
        reject(new DOMException("Aborted", "AbortError"));
      });
    }
  });

  function log(line: string) {
    requestLog.unshift(`${new Date().toLocaleTimeString()} ${line}`);
    requestLog.length = Math.min(requestLog.length, 30);
    renderRequestLog();
  }
}

// ---- mounting a demo (a tiny vanilla "adapter") ----------------------------

interface DemoSpec {
  title: string;
  desc: string;
  config: ComboboxConfig<string>;
  extraControls?: (container: HTMLElement) => void;
  showRequestLog?: boolean;
}

function mount(spec: DemoSpec) {
  const combobox = createCombobox(spec.config);
  const id = spec.config.id;

  const root = document.createElement("section");
  root.className = "demo";
  root.innerHTML = `
    <h2>${spec.title}</h2>
    <p class="desc">${spec.desc}</p>
    <div class="controls"></div>
    <div class="field">
      <input type="text" id="${id}-input" role="combobox" autocomplete="off"
             aria-autocomplete="list" aria-controls="${id}-listbox" />
      <div class="status"></div>
      <ul role="listbox" id="${id}-listbox" hidden></ul>
    </div>
    <div class="live" aria-live="polite"></div>
    <div class="meta"></div>
    ${spec.showRequestLog ? `<details open><summary>Request log</summary><pre class="requests"></pre></details>` : ""}
    <details><summary>Event log</summary><pre class="events"></pre></details>
    <details><summary>State</summary><pre class="state"></pre></details>
  `;
  document.getElementById("demos")!.appendChild(root);

  const input = root.querySelector<HTMLInputElement>("input")!;
  const listbox = root.querySelector<HTMLUListElement>("ul")!;
  const status = root.querySelector<HTMLDivElement>(".status")!;
  const live = root.querySelector<HTMLDivElement>(".live")!;
  const meta = root.querySelector<HTMLDivElement>(".meta")!;
  const eventsPre = root.querySelector<HTMLPreElement>(".events")!;
  const statePre = root.querySelector<HTMLPreElement>(".state")!;
  spec.extraControls?.(root.querySelector(".controls")!);

  if (spec.showRequestLog) {
    const requestsPre = root.querySelector<HTMLPreElement>(".requests")!;
    renderRequestLog = () => (requestsPre.textContent = requestLog.join("\n"));
  }

  const events: string[] = [];
  let notifications = 0;

  function send(event: ComboboxEvent) {
    events.unshift(JSON.stringify(event));
    events.length = Math.min(events.length, 25);
    eventsPre.textContent = events.join("\n");
    return combobox.send(event);
  }

  // DOM → core
  input.addEventListener("input", () =>
    send({ type: "INPUT", value: input.value }),
  );
  input.addEventListener("compositionstart", () =>
    send({ type: "COMPOSITION_START" }),
  );
  input.addEventListener("compositionend", () =>
    send({ type: "COMPOSITION_END", value: input.value }),
  );
  input.addEventListener("focus", () => send({ type: "FOCUS" }));
  input.addEventListener("blur", () => send({ type: "BLUR" }));
  input.addEventListener("keydown", (e) => {
    // The core decides which keys it handled, so the key rules live in one place.
    const handled = send({
      type: "KEYDOWN",
      key: e.key,
      isComposing: e.isComposing,
      altKey: e.altKey,
    });
    if (handled) e.preventDefault();
  });

  // Delegated option events; ids are parsed back from the DOM id.
  const optionIdFrom = (target: EventTarget | null) => {
    const li = (target as HTMLElement | null)?.closest<HTMLLIElement>(
      "li[role=option]",
    );
    return li?.dataset.optionId;
  };
  // Keep focus in the input while clicking options, so the input never blurs
  // (and multi-select keeps working from the keyboard after a click).
  listbox.addEventListener("mousedown", (e) => e.preventDefault());
  listbox.addEventListener("pointerdown", (e) => {
    const optionId = optionIdFrom(e.target);
    if (optionId) send({ type: "OPTION_POINTERDOWN", id: optionId });
  });
  listbox.addEventListener("click", (e) => {
    const optionId = optionIdFrom(e.target);
    if (optionId) send({ type: "OPTION_CLICK", id: optionId });
  });
  listbox.addEventListener("pointermove", (e) => {
    const optionId = optionIdFrom(e.target);
    if (optionId && optionId !== combobox.getState().activeId) {
      send({ type: "OPTION_HOVER", id: optionId });
    }
  });

  // core → DOM
  let previous: Readonly<ComboboxState<string>> | null = null;
  function render(state: Readonly<ComboboxState<string>>) {
    // Only write the value when it differs, so the caret and IME composition aren't disturbed.
    if (input.value !== state.inputValue) input.value = state.inputValue ?? "";

    input.setAttribute("aria-expanded", String(state.isOpen));
    const activeDomId =
      state.isOpen && state.activeId ? `${id}-option-${state.activeId}` : null;
    if (activeDomId) input.setAttribute("aria-activedescendant", activeDomId);
    else input.removeAttribute("aria-activedescendant");
    if (state.status === "loading") input.setAttribute("aria-busy", "true");
    else input.removeAttribute("aria-busy");

    listbox.hidden = !state.isOpen;
    if (spec.config.selectionMode === "multiple") {
      listbox.setAttribute("aria-multiselectable", "true");
    }

    if (
      !previous ||
      previous.visibleOptions !== state.visibleOptions ||
      previous.activeId !== state.activeId ||
      previous.selectedIds !== state.selectedIds
    ) {
      listbox.replaceChildren(
        ...state.visibleOptions.map((option, index) => {
          const li = document.createElement("li");
          li.role = "option";
          li.id = `${id}-option-${option.id}`;
          li.dataset.optionId = option.id;
          li.dataset.active = String(option.id === state.activeId);
          li.setAttribute(
            "aria-selected",
            String(state.selectedIds.has(option.id)),
          );
          if (option.disabled) li.setAttribute("aria-disabled", "true");
          li.setAttribute("aria-setsize", String(state.visibleOptions.length));
          li.setAttribute("aria-posinset", String(index + 1));
          li.innerHTML = `<span>${option.label}</span><span class="check">${
            state.selectedIds.has(option.id) ? "✓" : ""
          }</span>`;
          return li;
        }),
      );
      if (state.visibleOptions.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty";
        empty.textContent =
          state.status === "loading" ? "Loading…" : "No results";
        listbox.append(empty);
      }
      // Adapter-side side effect: keep the active option in view.
      if (activeDomId)
        document
          .getElementById(activeDomId)
          ?.scrollIntoView({ block: "nearest" });
    }

    status.className = `status${state.status === "error" ? " error" : ""}`;
    status.textContent =
      state.status === "loading"
        ? "Loading…"
        : state.status === "error"
          ? `Error: ${state.error instanceof Error ? state.error.message : String(state.error)}`
          : "";

    live.textContent = state.announcement;
    meta.textContent = `notifications: ${notifications} · selected: ${
      [...state.selectedIds].join(", ") || "—"
    }`;
    statePre.textContent = JSON.stringify(
      {
        ...state,
        selectedIds: [...state.selectedIds],
        error: String(state.error),
      },
      null,
      2,
    );
    previous = state;
  }

  combobox.subscribe((state) => {
    notifications++;
    render(state);
  });
  render(combobox.getState());
}

// ---- demos ------------------------------------------------------------------

mount({
  title: "Sync · single",
  desc: "Static array source. Enter selects the option, fills the input and closes the popup.",
  config: { id: "sync-single", source: fruits },
});

mount({
  title: "Sync · multiple",
  desc: "Enter toggles the option and keeps the popup open. Watch the live region.",
  config: {
    id: "sync-multi",
    source: fruits,
    selectionMode: "multiple",
    loop: false,
  },
});

mount({
  title: "Async · single",
  desc: "Fake server with 100–1200ms random latency. Type quickly to get out-of-order responses.",
  config: { id: "async-single", source: fakeFetch, debounceMs: 150 },
  showRequestLog: true,
  extraControls(container) {
    container.innerHTML = `
      <label><input type="checkbox" data-control="ignoreSignal" /> fetcher ignores AbortSignal</label>
      <label><input type="checkbox" data-control="failNext" /> fail next request</label>
    `;
    container
      .querySelectorAll<HTMLInputElement>("input[data-control]")
      .forEach((box) => {
        box.addEventListener("change", () => {
          const key = box.dataset.control as keyof typeof asyncControls;
          asyncControls[key] = box.checked;
        });
      });
  },
});

function syncControlCheckboxes() {
  document
    .querySelectorAll<HTMLInputElement>('input[data-control="failNext"]')
    .forEach((box) => (box.checked = asyncControls.failNext));
}

