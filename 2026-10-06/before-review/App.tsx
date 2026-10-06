import { createSignal, For, onCleanup } from "solid-js";
import "./App.css";
import { createTicker } from "./ticker";

function App() {
  const [count, setCount] = createSignal(0);
  const { ticks, status } = createTicker({ url: "http://localhost:3001" });

  return (
    <>
      <section id="center">
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          class="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count()}
        </button>
      </section>

      <div class="ticks">
        <span class="counter">{status()}</span>
        <For each={ticks()}>
          {(item) => (
            <div>
              {item.id} | {item.symbol}: {item.price}
            </div>
          )}
        </For>
      </div>
    </>
  );
}

export default App;
