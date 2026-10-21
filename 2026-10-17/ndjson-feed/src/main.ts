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
  // Disabling the focused button would drop keyboard focus to <body>.
  const hadFocus = document.activeElement === startBtn;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  if (hadFocus) stopBtn.focus();
  // A polite live region updated on every event floods screen readers;
  // aria-busy holds the announcements until the stream settles.
  statusEl.ariaBusy = "true";
  setStatus("loading", "streaming…");

  let count = 0;
  try {
    // Forwards ?trailingNewline=0 / ?fail=1 from the page URL to the mock.
    const res = await fetch(`/api/events${location.search}`, { signal: mine.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    if (!res.body) throw new Error("empty response body");

    for await (const json of readNdjson<FeedEvent>(res.body)) {
      const li = document.createElement("li");
      li.textContent = `#${json.id} ${json.text}`;
      list.append(li);
      count++;
      setStatus("streaming", `streaming… ${count} events`);
    }
    setStatus("done", `done: ${count} events`);
  } catch (err) {
    if (mine.signal.aborted)
      setStatus("stopped", `stopped after ${count} events`);
    else setStatus("error", `failed after ${count} events: ${String(err)}`);
  } finally {
    if (controller === mine) {
      const hadFocus = document.activeElement === stopBtn;
      startBtn.disabled = false;
      stopBtn.disabled = true;
      if (hadFocus) startBtn.focus();
      statusEl.ariaBusy = "false";
    }
  }
}

startBtn.addEventListener("click", start);
stopBtn.addEventListener("click", () => controller?.abort());
