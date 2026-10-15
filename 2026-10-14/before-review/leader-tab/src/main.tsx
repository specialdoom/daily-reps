import { render } from "preact";
import { useEffect } from "preact/hooks";
import { leaderId, role, startElection, tabId } from "./election";
import { startFeed } from "./feed";

function App() {
  useEffect(() => {
    const stop = startElection();
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, []);

  useEffect(() => startFeed(), []);

  return (
    <main>
      <h1>Tab {tabId}</h1>
      <p>
        Role: <strong data-testid="role">{role}</strong>
      </p>
      <p>Leader: {leaderId}</p>
      <p>Open this page in several tabs, then close the leader tab.</p>
    </main>
  );
}

render(<App />, document.getElementById("app")!);
