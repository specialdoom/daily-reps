import { effect } from "@preact/signals";
import { role, tabId } from "./election";

/**
 * Stand-in for an expensive shared connection (WebSocket / SSE).
 * It must only be "open" in the leader tab.
 */
export function startFeed(): () => void {
  let timer: number | undefined;
  const dispose = effect(() => {
    clearInterval(timer);
    if (role.value === "leader") {
      console.log(`[${tabId}] feed OPEN`);
      timer = window.setInterval(() => console.log(`[${tabId}] tick`), 2000);
    } else {
      console.log(`[${tabId}] feed closed`);
    }
  });
  return () => {
    dispose();
    clearInterval(timer);
  };
}
