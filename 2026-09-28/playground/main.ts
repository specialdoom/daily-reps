import { createTokenEngine } from "../theme-signal-engine.js";

// Count how many frames the engine actually schedules, to make batching visible.
let setTokenCalls = 0;
let frames = 0;
const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = (callback) => {
  frames++;
  renderStats();
  return nativeRequestAnimationFrame(callback);
};

const themes = {
  light: {
    colors: {
      bg: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
      border: "#e2e8f0",
      brand: { primary: "#3b82f6", secondary: "#111827" },
    },
    spacing: { sm: "8px", md: "16px" },
    radius: { md: "12px" },
  },
  dark: {
    colors: {
      bg: "#0b1120",
      surface: "#111827",
      text: "#e5e7eb",
      muted: "#94a3b8",
      border: "#1f2937",
      brand: { primary: "#8b5cf6", secondary: "#334155" },
    },
    spacing: { sm: "8px", md: "16px" },
    radius: { md: "12px" },
  },
  contrast: {
    colors: {
      bg: "#000000",
      surface: "#000000",
      text: "#ffffff",
      muted: "#ffff00",
      border: "#ffffff",
      brand: { primary: "#ffff00", secondary: "#00ffff" },
    },
    spacing: { sm: "10px", md: "20px" },
    radius: { md: "0px" },
  },
};

type ThemeName = keyof typeof themes;
type TokenTree = { [key: string]: string | TokenTree };

/** Dotted paths + values of every leaf, e.g. ["colors.brand.primary", "#3b82f6"]. */
function leaves(tree: TokenTree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[path, value]] : leaves(value, path);
  });
}

// --- Global engine on :root ------------------------------------------------

const globalEngine = createTokenEngine(themes.light);
globalEngine.applyTheme();

const globalInputs = renderControls(
  document.querySelector("#global-controls")!,
  themes.light,
  (path, value) => setGlobalToken(path, value),
);

function setGlobalToken(path: string, value: string) {
  setTokenCalls++;
  globalEngine.setToken(path, value);
  renderStats();
}

document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    const theme = themes[button.dataset.preset as ThemeName];
    // Many synchronous setToken calls: the engine should flush them in one frame.
    for (const [path, value] of leaves(theme)) {
      setGlobalToken(path, value);
      syncInput(globalInputs, path, value);
    }
  });
});

globalEngine.subscribe((path, value) => {
  log(`global  ${path} = ${value}`);
  renderSsr();
});

// --- Scoped engine on #promo-card ------------------------------------------

const promoCard = document.querySelector<HTMLElement>("#promo-card")!;
const scopedTokens = {
  colors: {
    bg: "#fef3c7",
    text: "#78350f",
    border: "#f59e0b",
    brand: { primary: "#d97706" },
  },
  radius: { md: "24px" },
};

let scopedEngine: ReturnType<typeof createTokenEngine> | null = null;
const scopedControls = document.querySelector<HTMLElement>("#scoped-controls")!;
const scopedToggle = document.querySelector<HTMLButtonElement>("#scoped-toggle")!;

function mountScopedEngine() {
  const engine = createTokenEngine(structuredClone(scopedTokens));
  engine.applyTheme(promoCard);
  engine.subscribe((path, value) => log(`scoped  ${path} = ${value}`));
  renderControls(scopedControls, scopedTokens, (path, value) => {
    setTokenCalls++;
    engine.setToken(path, value);
    renderStats();
  });
  scopedEngine = engine;
  scopedToggle.textContent = "Destroy scoped engine";
}

scopedToggle.addEventListener("click", () => {
  if (scopedEngine) {
    scopedEngine.destroy();
    scopedEngine = null;
    scopedControls.innerHTML = "<em>Destroyed: the card falls back to the global theme.</em>";
    scopedToggle.textContent = "Recreate scoped engine";
    log("scoped  destroy()");
  } else {
    mountScopedEngine();
    log("scoped  created + applyTheme(#promo-card)");
  }
});

mountScopedEngine();

// --- UI helpers ------------------------------------------------------------

function renderControls(
  container: HTMLElement,
  tokens: TokenTree,
  onChange: (path: string, value: string) => void,
) {
  container.innerHTML = "";
  const inputs = new Map<string, HTMLInputElement>();

  for (const [path, value] of leaves(tokens)) {
    const id = `${container.id}-${path}`;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = path;

    const input = document.createElement("input");
    input.id = id;
    if (value.startsWith("#")) {
      input.type = "color";
      input.value = value;
      input.addEventListener("input", () => onChange(path, input.value));
    } else {
      input.type = "range";
      input.min = "0";
      input.max = "40";
      input.value = String(parseInt(value, 10));
      input.addEventListener("input", () => onChange(path, `${input.value}px`));
    }

    container.append(label, input);
    inputs.set(path, input);
  }

  return inputs;
}

function syncInput(inputs: Map<string, HTMLInputElement>, path: string, value: string) {
  const input = inputs.get(path);
  if (!input) return;
  input.value = input.type === "color" ? value : String(parseInt(value, 10));
}

const statCalls = document.querySelector("#stat-calls")!;
const statFrames = document.querySelector("#stat-frames")!;
function renderStats() {
  statCalls.textContent = String(setTokenCalls);
  statFrames.textContent = String(frames);
}

const ssrOutput = document.querySelector("#ssr-output")!;
function renderSsr() {
  ssrOutput.textContent = globalEngine.toCssString(":root");
}

const logList = document.querySelector("#log")!;
function log(message: string) {
  const item = document.createElement("li");
  item.textContent = message;
  logList.prepend(item);
  while (logList.children.length > 50) logList.lastElementChild!.remove();
}

renderSsr();
renderStats();
