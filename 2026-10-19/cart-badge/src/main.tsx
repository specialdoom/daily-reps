import { createRoot } from "react-dom/client";
import { useLayoutEffect } from "react";
import { cartStore } from "./store";
import { useStore, useStoreSelector } from "./useStore";

// Restores the saved cart before the browser paints.
function RestoreCart() {
  useLayoutEffect(() => {
    cartStore.set({ items: 3, total: 59.97 });
  }, []);
  return null;
}

function CartBadge() {
  const items = useStoreSelector(cartStore, (state) => state.items);
  return <span aria-label={`${items} items in cart`}>🛒 {items}</span>;
}

function CartTotal() {
  const total = useStoreSelector(cartStore, (state) => state.total);
  return <strong>${total.toFixed(2)}</strong>;
}

function App() {
  return (
    <>
      <header>
        <CartBadge />
      </header>
      <main>
        <RestoreCart />
        <p>
          Total: <CartTotal />
        </p>
        <button
          onClick={() => {
            const s = cartStore.get();
            cartStore.set({ items: s.items + 1, total: s.total + 19.99 });
          }}
        >
          Add item
        </button>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
