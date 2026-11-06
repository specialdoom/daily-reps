import { usePeers } from "./usePeers";

export function App() {
  const { selfId, peers } = usePeers();
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Open tabs: {peers.length}</h1>
      <p>
        This tab: <code>{selfId}</code>
      </p>
      <ul aria-label="Open tabs">
        {peers.map((p) => (
          <li key={p.id}>
            <code>{p.id}</code> {p.id === selfId ? "(you)" : ""} — joined{" "}
            {new Date(p.joinedAt).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    </main>
  );
}
