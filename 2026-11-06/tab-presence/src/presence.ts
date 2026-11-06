export type Peer = { id: string; joinedAt: number; lastSeen: number };

export type PresenceOptions = {
  /** How often this tab announces that it is alive. */
  heartbeatMs: number;
  /** A peer not heard from for this long is considered gone. */
  ttlMs: number;
  /** Injected clock, so expiry is testable. */
  now?: () => number;
};

export type Presence = {
  /** Called whenever the peer list changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Current peers (including this tab), oldest `joinedAt` first. */
  getSnapshot(): readonly Peer[];
  /** Announce departure, stop timers, close the channel. Idempotent. */
  close(): void;
};

export function createPresence(
  channelName: string,
  selfId: string,
  options: PresenceOptions,
): Presence {
  // TODO: implement presence over BroadcastChannel.
  void channelName;
  void options;
  const self: readonly Peer[] = [{ id: selfId, joinedAt: Date.now(), lastSeen: Date.now() }];
  return {
    subscribe: () => () => {},
    getSnapshot: () => self, // TODO: replace this inert stub
    close: () => {},
  };
}
