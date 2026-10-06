import { createSignal } from "solid-js";
import "./App.css";
import { createTicker } from "./ticker";

function App() {
  const [count, setCount] = createSignal(0);
  const ticker = createTicker({ url: "http://localhost:3001" });

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

      <div class="ticks"></div>
    </>
  );
}

export default App;
