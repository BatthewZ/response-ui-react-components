import { AppShell, EXAMPLE_THEMES, ThemeSwitcher } from "../src";
import { ComponentsHub } from "./ComponentsHub";
import { ComponentRoute, GuideRoute } from "./DocRoute";
import { HomePage } from "./HomePage";
import { Nav } from "./Nav";
import { componentsBySlug, guidesBySlug } from "./registry";
import { SiteLink, useRouter } from "./router";

/**
 * The site chrome, built out of the library it documents — `AppShell` really is the
 * navbar, the collapsing rail and the mobile drawer here, so every page is also a
 * specimen of the component holding it.
 */

const REPO = "https://github.com/BatthewZ/response-ui-react-components";

/**
 * Labels derived from the theme list rather than written against it. The example themes
 * are worked examples, outside semver and deletable; a switch that only labels names it
 * was told about in advance would give a consumer's own theme a worse deal than the
 * samples, which is the exact privilege the theming contract refuses.
 */
const themeLabels = Object.fromEntries(
  EXAMPLE_THEMES.map((theme) => [theme, theme.charAt(0).toUpperCase() + theme.slice(1)]),
);

function View() {
  const { path } = useRouter();

  if (path === "/") return <HomePage />;
  if (path === "/components") return <ComponentsHub />;

  if (path.startsWith("/components/")) {
    const entry = componentsBySlug.get(path.slice("/components/".length));
    if (entry) return <ComponentRoute key={entry.slug} entry={entry} />;
  }

  const guide = guidesBySlug.get(path.slice(1));
  if (guide) return <GuideRoute key={guide.slug} entry={guide} />;

  return (
    <div className="flex max-w-[40rem] flex-col gap-r4">
      <h1 className="text-h2 text-fg-primary">Not found</h1>
      <p className="text-body-2 text-fg-secondary">
        Nothing lives at <code>{path}</code>.
      </p>
      <SiteLink to="/components" className="text-body-2 text-accent underline underline-offset-2">
        Browse all components →
      </SiteLink>
    </div>
  );
}

export function App() {
  return (
    <AppShell>
      <AppShell.Navbar>
        <AppShell.Toggle />
        <AppShell.Brand>
          <SiteLink to="/" className="text-h5 font-bold text-fg-primary">
            response-ui
          </SiteLink>
        </AppShell.Brand>
        {/* `min-w-0` and the clamp below are what keep a phone from scrolling sideways.
            The navbar is one non-wrapping row of a fixed height, so anything it cannot
            fit widens the whole document rather than folding — and four theme options
            plus the brand plus the toggle do not fit in 375px. The switcher scrolls
            inside its own clamp instead of pushing, which keeps every theme reachable;
            the repository link is the one item a phone can do without. */}
        <AppShell.NavbarActions className="min-w-0">
          <ThemeSwitcher
            themes={EXAMPLE_THEMES}
            labels={themeLabels}
            className="max-w-[10.5rem] overflow-x-auto sm:max-w-none sm:overflow-visible"
          />
          <a
            href={REPO}
            className="hidden text-body-3 text-fg-secondary underline underline-offset-2 hover:text-fg-primary sm:inline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </AppShell.NavbarActions>
      </AppShell.Navbar>

      <AppShell.Sidebar>
        <Nav />
      </AppShell.Sidebar>

      {/* `AppShell.Main` is an unpadded box on purpose — it does not know what an app
          puts in it. Documentation is prose, so it gets a gutter here rather than every
          page inventing one. */}
      <AppShell.Main className="p-r3">
        <View />
      </AppShell.Main>
    </AppShell>
  );
}
