import { component$, useSignal } from "@builder.io/qwik";

export default component$(() => {
  const total = useSignal(0);
  const status = useSignal("");

  // A formatter that is expensive to build, so it is created once per component.
  const eur = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <main>
      <h1>Cart</h1>
      <p>
        Total: <strong>{eur.format(total.value)}</strong>
      </p>
      <button
        onClick$={() => {
          total.value += 4.99;
          status.value = `Added 4.99 — new total ${eur.format(total.value)}`;
        }}
      >
        Add item (4.99)
      </button>
      <p role="status">{status.value}</p>
    </main>
  );
});
