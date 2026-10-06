import { For } from "solid-js";
import "./App.css";
import { createTicker } from "./ticker";

function App() {
  // createTicker registers its own cleanup with this component.
  const { ticks, status } = createTicker({ url: "http://localhost:3001" });

  return (
    <div class="ticks">
      <span class="counter" role="status">
        {status()}
      </span>
      <For each={ticks()}>
        {(item) => (
          <div>
            {item.id} | {item.symbol}: {item.price}
          </div>
        )}
      </For>
    </div>
  );
}

export default App;
