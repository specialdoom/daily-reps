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
  let lastSentAt = 0;
  let heartbeatTimerId: number | undefined;
  let claimTimerId: number | undefined;
  /** When each tab's resign was heard; older heartbeats from it are stale. */
  const resignedAt = new Map<string, number>();

  const sendHeartbeat = () => {
    lastSentAt = Date.now();
    channel.postMessage({
      type: "heartbeat",
      from: tabId,
      at: lastSentAt,
    } satisfies Msg);
  };

  const becomeLeader = () => {
    if (role.value === "leader") return;
    leaderId.value = tabId;
    role.value = "leader";
    // Announce right away so other candidates see us before their own
    // timeout check and the tie-break runs within one message hop.
    sendHeartbeat();
    heartbeatTimerId = window.setInterval(sendHeartbeat, HEARTBEAT_MS);
  };

  const stepDown = () => {
    clearInterval(heartbeatTimerId);
    heartbeatTimerId = undefined;
    role.value = "follower";
  };

  channel.onmessage = (e: MessageEvent<Msg>) => {
    const msg = e.data;
    if (msg.from === tabId) return;

    if (msg.type === "heartbeat") {
      // Sent before its tab resigned. A later one means the tab rejoined
      // (e.g. restored from the bfcache) and is a candidate again.
      if (msg.at <= (resignedAt.get(msg.from) ?? -Infinity)) return;
      if (role.value === "leader") {
        // Two leaders. If our own heartbeats stopped for longer than followers
        // tolerate (e.g. timers throttled in a hidden tab), they rightly
        // replaced us: yield regardless of ids, or we would flap back.
        const stale = Date.now() - lastSentAt > LEADER_TIMEOUT_MS;
        if (!stale && tabId > msg.from) {
          sendHeartbeat();
          return;
        }
        stepDown();
      }
      // Local receive time, not the sender's `at`: a heartbeat that arrives
      // late (busy or frozen receiver) still proves the leader is alive.
      lastHeartbeatAt = Date.now();
      leaderId.value = msg.from;
      clearTimeout(claimTimerId);
    } else if (msg.type === "resign") {
      resignedAt.set(msg.from, Date.now());
      if (role.value === "leader" || msg.from !== leaderId.value) return;
      leaderId.value = null;
      // Every follower hears the resign at once; a short random delay lets the
      // first claimant's heartbeat reach the others before they claim too.
      clearTimeout(claimTimerId);
      claimTimerId = window.setTimeout(becomeLeader, Math.random() * 100);
    }
  };

  const leaderTimeoutTimerId = window.setInterval(() => {
    if (
      role.value !== "leader" &&
      Date.now() - lastHeartbeatAt > LEADER_TIMEOUT_MS
    ) {
      becomeLeader();
    }
  }, 500);

  return () => {
    clearInterval(leaderTimeoutTimerId);
    clearTimeout(claimTimerId);
    channel.onmessage = null;
    if (role.value === "leader") {
      stepDown();
      leaderId.value = null;
      channel.postMessage({ type: "resign", from: tabId } satisfies Msg);
    }
  };
}
