import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// CSS in the order README.md prescribes for a consumer: the foundation first, then
// this package's per-component styles. styles.css wires all of it and registers both
// the site's and the library's sources with Tailwind.
import "./styles.css";

import { App } from "./App";
import { SiteRouter } from "./router";

const el = document.getElementById("root");
if (!el) throw new Error("#root not found");

createRoot(el).render(
  <StrictMode>
    <SiteRouter>
      <App />
    </SiteRouter>
  </StrictMode>,
);
