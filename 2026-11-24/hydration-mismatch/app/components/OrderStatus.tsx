"use client";

import { useState } from "react";

type Props = { placedAt: string }; // ISO timestamp from the server

export function OrderStatus({ placedAt }: Props) {
  // 1) Pick the saved density preference (a browser-only API).
  const compact = typeof window !== "undefined" && localStorage.getItem("density") === "compact";

  // 2) Show when the order was placed, in the user's locale and timezone.
  const placedLabel = new Date(placedAt).toLocaleString();

  // 3) A "minutes ago" label.
  const minutesAgo = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);

  // 4) An id to connect the label and the input.
  const inputId = `note-${Math.random().toString(36).slice(2, 8)}`;

  const [note, setNote] = useState("");

  return (
    <section style={{ padding: compact ? 8 : 24, border: "1px solid #ccc" }}>
      <p>Placed: {placedLabel}</p>
      <p>{minutesAgo} minutes ago</p>
      <label htmlFor={inputId}>Delivery note</label>{" "}
      <input id={inputId} value={note} onChange={(e) => setNote(e.target.value)} />
    </section>
  );
}
