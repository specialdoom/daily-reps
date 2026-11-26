import { createRoot } from "react-dom/client";
import { App } from "./App";

// No StrictMode on purpose: connect/disconnect counts are easier to read.
createRoot(document.getElementById("root")!).render(<App />);
