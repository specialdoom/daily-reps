import { signal } from "@preact/signals";

export type Role = "follower" | "leader";

/** Messages exchanged over the BroadcastChannel. */
export type Msg =
  | { type: "heartbeat"; from: string; at: number }
  | { type: "resign"; from: string };

export const HEARTBEAT_MS = 1000;
/** A leader is considered dead after this long without a heartbeat. */
export const LEADER_TIMEOUT_MS = 3500;

export const tabId = crypto.randomUUID().slice(0, 8);
export const role = signal<Role>("follower");
export const leaderId = signal<string | null>(null);

const channel = new BroadcastChannel("leader-tab");

/**
 * Start participating in the election. Returns a stop function.
 * Contract: at most one tab has role "leader" once things settle,
 * and a closed or crashed leader is replaced within ~LEADER_TIMEOUT_MS.
 */
export function startElection(): () => void {
  channel.onmessage = (e: MessageEvent<Msg>) => {
    void e;
    // TODO
  };

  // TODO: decide when to claim leadership, send heartbeats, detect a dead leader.

  return () => {
    // TODO: cleanup (timers, resign if leader)
  };
}
