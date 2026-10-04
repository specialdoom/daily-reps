import { scheduleHydration } from "../island-hydration";
import { domEnv } from "./dom-env";

type Strategy = Exclude<Parameters<typeof scheduleHydration>[1], readonly unknown[]>;
type Cancel = ReturnType<typeof scheduleHydration>;

/* ---------- timeline log ---------- */

const logEl = document.querySelector<HTMLOListElement>("#log")!;
function record(message: string) {
  const li = document.createElement("li");
  li.textContent = `${Math.round(performance.now())} ms  ${message}`;
  logEl.append(li);
  logEl.scrollTop = logEl.scrollHeight;
}

/* ---------- components: what "hydrating" means for each island ---------- */

const components: Record<string, (el: HTMLElement) => void> = {
  search(el) {
    const input = el.querySelector("input")!;
    const items = [...el.querySelectorAll("li")];
    input.addEventListener("input", () => {
      const q = input.value.toLowerCase();
      for (const li of items) li.hidden = !li.textContent!.toLowerCase().includes(q);
    });
  },

  // Hydrates on pointerdown/focusin, which fire *before* click / Enter,
  // so the click listener is attached in time and the first click isn't lost.
  cart(el) {
    const count = el.querySelector("output")!;
    el.querySelector("button")!.addEventListener("click", () => {
      count.value = String(Number(count.value) + 1);
    });
  },

  chat(el) {
    const panel = el.querySelector<HTMLElement>(".chat-panel")!;
    el.querySelector("button")!.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
    });
  },

  reviews(el) {
    const more = el.querySelector<HTMLElement>(".more")!;
    const button = el.querySelector("button")!;
    button.addEventListener("click", () => {
      more.hidden = false;
      button.remove();
    });
  },

  recommendations(el) {
    for (const button of el.querySelectorAll("button")) {
      button.addEventListener("click", () => button.classList.toggle("liked"));
    }
  },
};

/* ---------- declarative strategies, Astro-style: data-hydrate="visible:200px, interaction" ---------- */

function parseStrategies(spec: string): Strategy[] {
  return spec.split(",").map((part): Strategy => {
    const [kind, arg] = part.trim().split(":");
    switch (kind) {
      case "load":
        return { kind: "load" };
      case "idle":
        return { kind: "idle", timeout: arg ? Number(arg) : undefined };
      case "visible":
        return { kind: "visible", rootMargin: arg };
      case "interaction":
        return { kind: "interaction", events: arg ? arg.split("|") : undefined };
      default:
        throw new Error(`Unknown hydration strategy "${part}"`);
    }
  });
}

/* ---------- boot: schedule every server-rendered island ---------- */

const cancels = new Map<HTMLElement, Cancel>();

for (const el of document.querySelectorAll<HTMLElement>("[data-island]")) {
  const name = el.dataset.island!;
  const component = components[name];
  if (!component) throw new Error(`No component registered for island "${name}"`);

  const spec = el.dataset.hydrate ?? "load";
  el.dataset.state = "pending";
  record(`${name}: scheduled (${spec})`);

  const cancel = scheduleHydration(
    {
      el,
      hydrate() {
        cancels.delete(el);
        component(el);
        el.dataset.state = "hydrated";
        record(`${name}: hydrated`);
      },
    },
    parseStrategies(spec),
    domEnv,
  );
  if (el.dataset.state === "pending") cancels.set(el, cancel);
}

/* ---------- islands removed before hydrating get cancelled (no leaked observers/listeners) ---------- */

new MutationObserver(() => {
  for (const [el, cancel] of cancels) {
    if (el.isConnected) continue;
    cancel();
    cancels.delete(el);
    record(`${el.dataset.island}: removed before hydrating, cancelled`);
  }
}).observe(document.body, { childList: true, subtree: true });

document.querySelector("#dismiss-recs")!.addEventListener("click", (event) => {
  document.querySelector("[data-island='recommendations']")?.remove();
  (event.currentTarget as HTMLElement).closest(".banner")!.remove();
});
