import { useState } from "react";

import { Button, EXAMPLE_THEMES, ThemeSwitcher } from "../src";
import { CuratedGallery } from "./CuratedGallery";
import { DashboardDemo } from "./DashboardDemo";
import { ExamplesGallery } from "./ExamplesGallery";
import { FormsTab } from "./FormsTab";

/**
 * The dev shell: a header (theme + viewport controls) and one component per tab.
 * Each tab owns its own state and sample data — this file only decides which is
 * on screen. Add a tab by adding an entry to TABS and a case to <TabView>.
 */

/** Labels for the example themes this gallery opts into. Gallery-local, as an app's would be. */
const EXAMPLE_THEME_LABELS = {
  default: "Default",
  events: "Events",
  grimdark: "Grimdark",
  tech: "Tech",
};

const TABS = {
  gallery: "Gallery",
  forms: "Forms",
  dashboard: "Dashboard",
  examples: "Examples",
};
type TabKey = keyof typeof TABS;

/* ------------------------------------------------------------------ */
/*  Viewport harness                                                   */
/* ------------------------------------------------------------------ */

const VIEWPORTS = {
  full: { label: "Full", width: undefined as string | undefined },
  desktop: { label: "Desktop (1024)", width: "1024px" },
  mobile: { label: "Mobile (375)", width: "375px" },
};
type ViewportKey = keyof typeof VIEWPORTS;

function TabView({ tab, maxWidth }: { tab: TabKey; maxWidth?: string }) {
  switch (tab) {
    case "examples":
      return <ExamplesGallery />;
    case "dashboard":
      /* Not viewport-constrained: AppShell is the page shell, and it owns its
         own responsive behaviour. Narrow the browser to exercise it. */
      return <DashboardDemo />;
    case "forms":
      return <FormsTab />;
    case "gallery":
      return <CuratedGallery maxWidth={maxWidth} />;
  }
}

export function App() {
  const [viewport, setViewport] = useState<ViewportKey>("full");
  const [tab, setTab] = useState<TabKey>("gallery");

  return (
    <div className="min-h-screen bg-surface-0 text-fg-primary">
      {/* Top bar: theme switcher + a light/dark note + a viewport toggle. The
          switcher is handed EXAMPLE_THEMES because this gallery imports the
          example theme CSS (see dev/styles.css); an app passes its own list. */}
      {/* Not sticky on the dashboard tab: AppShell pins its own navbar at top:0,
          and a second sticky bar above it would swallow the one being demoed. */}
      <header
        className={`${
          tab === "dashboard" ? "" : "sticky top-0 z-50 "
        }flex flex-wrap items-center justify-between gap-r4 border-b border-border-default bg-surface-1 px-r3 py-r4`}
      >
        <div className="flex flex-col gap-r6">
          <span className="text-h4 font-bold">response-ui gallery</span>
          <span className="text-body-3 text-fg-muted">
            Theme switches default / events / grimdark / tech. Light vs dark
            follows the OS color-scheme via the foundation tokens.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-r3">
          <div className="flex items-center gap-r6 rounded-md border border-border-default p-r6">
            {(Object.keys(TABS) as TabKey[]).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={tab === key ? "primary" : "ghost"}
                onClick={() => setTab(key)}
              >
                {TABS[key]}
              </Button>
            ))}
          </div>
          <ThemeSwitcher themes={EXAMPLE_THEMES} labels={EXAMPLE_THEME_LABELS} />
          <div className="flex items-center gap-r6 rounded-md border border-border-default p-r6">
            {(Object.keys(VIEWPORTS) as ViewportKey[]).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={viewport === key ? "primary" : "ghost"}
                onClick={() => setViewport(key)}
              >
                {VIEWPORTS[key].label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <TabView tab={tab} maxWidth={VIEWPORTS[viewport].width} />
    </div>
  );
}
