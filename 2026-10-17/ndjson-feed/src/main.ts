import { readNdjson } from "./ndjson";

interface FeedEvent {
  id: number;
  text: string;
}

const startBtn = document.querySelector<HTMLButtonElement>("#start")!;
const stopBtn = document.querySelector<HTMLButtonElement>("#stop")!;
const statusEl = document.querySelector<HTMLElement>("#status")!;
const list = document.querySelector<HTMLUListElement>("#list")!;

let controller: AbortController | null = null;

function setStatus(state: string, text: string) {
  statusEl.dataset.state = state;
  statusEl.textContent = text;
}

async function start() {
  controller?.abort();
  const mine = (controller = new AbortController());
  list.replaceChildren();
  startBtn.disabled = true;
  stopBtn.disabled = false;
  setStatus("loading", "streaming…");

  let count = 0;
  try {
    const res = await fetch("/api/events", { signal: mine.signal });
    // TODO: consume res.body with readNdjson and append one <li> per event
    // (`#${id} ${text}`), updating the status as the count grows.
  } catch (err) {
    if (mine.signal.aborted) setStatus("stopped", `stopped after ${count} events`);
    else setStatus("error", `failed after ${count} events: ${String(err)}`);
  } finally {
    if (controller === mine) {
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  }
}

startBtn.addEventListener("click", start);
stopBtn.addEventListener("click", () => controller?.abort());
