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
  let lastHeartbeatAt: number = Date.now();
  let leaderTimeoutTimerId: number;
  let heartbeatTimerId: number;

  channel.onmessage = (e: MessageEvent<Msg>) => {
    if (e.data.type === "heartbeat") {
      lastHeartbeatAt = e.data.at;
      leaderId.value = e.data.from;
      if (role.value === "leader" && e.data.from !== tabId) {
        if (tabId < e.data.from) {
          role.value = "follower";
          clearInterval(heartbeatTimerId);
        } else {
          role.value = "leader";
          leaderId.value = tabId;
        }
      }
    } else if (e.data.type === "resign") {
      leaderId.value = null;
      lastHeartbeatAt = LEADER_TIMEOUT_MS;
    }
  };

  leaderTimeoutTimerId = window.setInterval(() => {
    if (
      Date.now() - lastHeartbeatAt > LEADER_TIMEOUT_MS &&
      leaderId.value !== tabId
    ) {
      leaderId.value = tabId;
      role.value = "leader";
      heartbeatTimerId = setInterval(() => {
        channel.postMessage({
          type: "heartbeat",
          from: tabId,
          at: Date.now(),
        });
      }, HEARTBEAT_MS);
    }
  }, 500);

  return () => {
    clearInterval(leaderTimeoutTimerId);
    clearInterval(heartbeatTimerId);
    if (role.value === "leader") {
      role.value = "follower";
      leaderId.value = null;
      channel.postMessage({
        type: "resign",
        from: tabId,
      });
    }
  };
}
