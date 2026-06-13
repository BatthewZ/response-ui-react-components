import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// CSS, in the AGENTS.md-mandated order: Tailwind + foundation first, then the
// local per-component styles. styles.css wires up all of it so the cascade is
// correct and Tailwind scans both the gallery and ../src.
import "./styles.css";

import { App } from "./App";

const el = document.getElementById("root");
if (!el) throw new Error("#root not found");

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
