import { useTheme } from "../../hooks/use-theme";
import { Button } from "./Button";
import { ThemeSwitcher } from "./ThemeSwitcher";

const APP_THEMES = ["default", "grimdark", "aurora"] as const;

/** No props, no wiring — it renders the four shipped themes and writes `<html data-theme>`. */
export function Minimal() {
  return <ThemeSwitcher />;
}

/** Its natural home: the trailing edge of a header bar. */
export function InANavbar() {
  return (
    <header className="flex items-center justify-between gap-r4 rounded-lg bg-surface-1 px-r4 py-r5">
      <span className="text-h6">Response UI</span>
      <ThemeSwitcher />
    </header>
  );
}

/** `useTheme` and `ThemeSwitcher` both read `<html data-theme>`, so the readout tracks the clicks. */
export function WithLiveReadout() {
  const { theme } = useTheme();
  return (
    <div className="flex items-center gap-r5">
      <ThemeSwitcher />
      <span className="text-body-3 text-fg-secondary">Active theme: {theme}</span>
    </div>
  );
}

/** Nothing in the library reads localStorage back — without this in `<head>`, the theme is lost on reload. */
export function RestoreThemeBeforeFirstPaint() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
      }}
    />
  );
}

/** `aria-label` is spread after the built-in one, so the group's name is the one string you can change. */
export function RenameTheGroup() {
  return <ThemeSwitcher aria-label="Colour theme" />;
}

/** App-registered themes and translated option text: `themes` and `labels` keep both inside the component. */
export function AppThemesAndLabels() {
  return (
    <ThemeSwitcher
      themes={APP_THEMES}
      labels={{ default: "Standard", grimdark: "Sombre", aurora: "Aurore" }}
      aria-label="Thème"
    />
  );
}

/** For different markup — buttons, a select, a menu — skip the component and drive `useTheme` yourself. */
export function CustomSwitcher() {
  const { theme, setTheme } = useTheme({ themes: APP_THEMES });
  return (
    <div role="group" aria-label="Theme">
      <Button
        type="button"
        size="sm"
        variant={theme === "default" ? "primary" : "ghost"}
        aria-pressed={theme === "default"}
        onClick={() => setTheme("default")}
      >
        System
      </Button>
      <Button
        type="button"
        size="sm"
        variant={theme === "grimdark" ? "primary" : "ghost"}
        aria-pressed={theme === "grimdark"}
        onClick={() => setTheme("grimdark")}
      >
        Grimdark
      </Button>
      <Button
        type="button"
        size="sm"
        variant={theme === "aurora" ? "primary" : "ghost"}
        aria-pressed={theme === "aurora"}
        onClick={() => setTheme("aurora")}
      >
        Aurora
      </Button>
    </div>
  );
}
