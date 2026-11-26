import { useEffect, useState } from "react";
import { connectToRoom, stats, type Message } from "./fake-room";

const ROOMS = ["general", "design", "random"];

function showToast(text: string) {
  console.log("[toast]", text);
}

function Room({ roomId, muted }: { roomId: string; muted: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);

  // TODO: toasts must respect the *current* `muted` value,
  // and toggling `muted` must NOT reconnect.
  useEffect(() => {
    setMessages([]);
    const connection = connectToRoom(roomId, (message) => {
      setMessages((prev) => [...prev, message]);
      if (!muted) showToast(message.text);
    });
    return () => connection.disconnect();
  }, [roomId]);

  return (
    <ul aria-label={`Messages in ${roomId}`}>
      {messages.map((m) => (
        <li key={m.id}>{m.text}</li>
      ))}
    </ul>
  );
}

export function App() {
  const [roomId, setRoomId] = useState(ROOMS[0]);
  const [muted, setMuted] = useState(false);
  const [, force] = useState(0);

  return (
    <main>
      <h1>Chat</h1>
      <label>
        Room{" "}
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          {ROOMS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={muted}
          onChange={(e) => setMuted(e.target.checked)}
        />{" "}
        Mute toasts
      </label>
      <p>
        Connects: {stats.connects} · Disconnects: {stats.disconnects}{" "}
        <button onClick={() => force((n) => n + 1)}>Refresh counts</button>
      </p>
      <Room roomId={roomId} muted={muted} />
    </main>
  );
}
