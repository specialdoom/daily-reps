import { createSignal, For, onCleanup } from "solid-js";
import { applyTick, initialState, type FeedState, type Tick } from "./feed";

export function App() {
  const [state, setState] = createSignal<FeedState>(initialState);
  const [status, setStatus] = createSignal<"connecting" | "open">("connecting");

  const source = new EventSource("/events");
  source.onopen = () => setStatus("open");
  source.onerror = () => setStatus("connecting"); // EventSource reconnects by itself and resends Last-Event-ID
  source.onmessage = (e) => setState((s) => applyTick(s, JSON.parse(e.data) as Tick));
  onCleanup(() => source.close());

  return (
    <main style={{ "font-family": "system-ui", "max-width": "28rem", margin: "2rem auto" }}>
      <h1>Live ticker</h1>
      <p role="status">
        Connection: {status()} · epoch: {state().epoch ?? "–"} · last seq: {state().lastSeq} · missed: {state().missed}
      </p>
      <ol reversed>
        <For each={state().items}>
          {(t) => (
            <li>
              #{t.seq} {t.symbol} {t.price.toFixed(2)}
            </li>
          )}
        </For>
      </ol>
    </main>
  );
}
