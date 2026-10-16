import { render } from "preact";
import { useEffect } from "preact/hooks";
import { leaderId, role, startElection, tabId } from "./election";
import { startFeed } from "./feed";

function App() {
  useEffect(() => {
    let stop = startElection();
    const onPageHide = () => stop();
    // pagehide already stopped us; a page restored from the bfcache must rejoin.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) stop = startElection();
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
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
