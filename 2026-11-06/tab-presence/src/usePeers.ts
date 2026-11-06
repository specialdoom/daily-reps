import { useEffect, useState, useSyncExternalStore } from "react";
import { createPresence, type Peer, type Presence } from "./presence";

const OPTIONS = { heartbeatMs: 1000, ttlMs: 3500 };

export function usePeers(): { selfId: string; peers: readonly Peer[] } {
  const [selfId] = useState(() => crypto.randomUUID().slice(0, 8));
  const [presence, setPresence] = useState<Presence | null>(null);

  useEffect(() => {
    const p = createPresence("tab-presence", selfId, OPTIONS);
    setPresence(p);
    return () => p.close();
  }, [selfId]);

  const peers = useSyncExternalStore(
    (cb) => (presence ? presence.subscribe(cb) : () => {}),
    () => (presence ? presence.getSnapshot() : EMPTY),
  );
  return { selfId, peers };
}

const EMPTY: readonly Peer[] = [];
