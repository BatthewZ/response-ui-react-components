import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AtSign,
  CalendarDays,
  Clock,
  Feather,
  Mail,
  Menu,
  PenLine,
  Quote,
  Rss,
  Sparkles,
  X,
} from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Accordion,
  ActivityFeed,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Carousel,
  CodeBlock,
  Container,
  CopyButton,
  Divider,
  Drawer,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  EXAMPLE_THEMES,
  Field,
  FieldError,
  Grid,
  Hero,
  IconButton,
  Input,
  Label,
  MasonryGrid,
  MediaCard,
  Pagination,
  ProgressBar,
  Rating,
  Row,
  ScrollReveal,
  SearchInput,
  Spotlight,
  Stack,
  Stagger,
  Swimlane,
  Text,
  ThemeSwitcher,
  ToastProvider,
  useToast,
  useViewTransition,
  ViewTransition,
  cn,
} from "../src";
import { DemoRouter, useDemoRouter } from "./demo-router";

/**
 * An editorial site assembled only from this library — the counterpart to the
 * admin console in DashboardDemo.tsx. Where that view stress-tests the dense,
 * data-heavy end of the set, this one exercises the reading end: Hero, MediaCard,
 * Swimlane, Carousel, MasonryGrid, Spotlight, CodeBlock, Pagination and the
 * scroll-driven animations, at the measure and rhythm long-form copy needs.
 *
 * It is four routes, not one page, because half of what goes wrong in an
 * editorial layout only shows up in transit: a card image morphing into an
 * article header, a sticky masthead over a full-bleed hero, a reading-progress
 * bar that has to agree with the document it measures.
 */

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

type Author = {
  name: string;
  role: string;
  bio: string;
};

const AUTHORS = {
  mira: {
    name: "Mira Sandoval",
    role: "Design engineer",
    bio: "Works on the type and colour end of the system. Keeps a list of every ratio that looked good in a specimen and failed in a product.",
  },
  ines: {
    name: "Ines Marchetti",
    role: "Staff engineer, platform UI",
    bio: "Rebuilt the theme layer twice and would do it a third time. Writes mostly about colour spaces and the cost of getting them wrong.",
  },
  ruben: {
    name: "Ruben Oduya",
    role: "Accessibility",
    bio: "Runs the audits nobody enjoys and writes up the findings so they read like design notes rather than a compliance list.",
  },
  ada: {
    name: "Ada Whitlock",
    role: "Systems architecture",
    bio: "Draws the line between what belongs in a universal contract and what belongs to one component. Frequently redraws it.",
  },
} satisfies Record<string, Author>;

type AuthorKey = keyof typeof AUTHORS;

const TOPICS = [
  "Typography",
  "Colour",
  "Motion",
  "Tokens",
  "Accessibility",
  "Layout",
  "Process",
] as const;
type Topic = (typeof TOPICS)[number];

/** The blocks an article body is made of. Each one maps to a component below. */
type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "quote"; text: string; cite: string }
  | { kind: "code"; filename: string; language: string; code: string }
  | { kind: "list"; items: string[] }
  | { kind: "figure"; seed: string; caption: string };

type Post = {
  slug: string;
  title: string;
  dek: string;
  topic: Topic;
  author: AuthorKey;
  date: string;
  isoDate: string;
  minutes: number;
  body: Block[];
};

const POSTS: Post[] = [
  {
    slug: "a-type-scale-that-survives-real-copy",
    title: "A type scale that survives real copy",
    dek: "Every scale looks right on a specimen sheet and falls apart in a product. Here is the test we run before a ratio ships.",
    topic: "Typography",
    author: "mira",
    date: "24 July 2026",
    isoDate: "2026-07-24",
    minutes: 11,
    body: [
      {
        kind: "p",
        text: "A type scale is easy to admire and hard to live with. On a specimen sheet you get nine sizes, evenly spaced, each a clean multiple of the last, and the eye reads the progression as order. In a product you get a card title beside a timestamp beside a badge, and the question is no longer whether the ratio is elegant. It is whether two adjacent steps are far enough apart that a reader can tell them apart without stopping to compare.",
      },
      { kind: "h", text: "The specimen lies by omission" },
      {
        kind: "p",
        text: "The specimen shows every step in one column, in order, in the same weight, at the same measure. Nothing in a real interface arrives that way. Steps meet each other out of order, in different weights, at different measures, in whatever colour the surrounding surface demands — and the pairs that meet most often are the ones a specimen never puts next to each other.",
      },
      {
        kind: "quote",
        text: "If two steps of your scale never appear beside each other, the ratio between them is decoration.",
        cite: "Design review, week 12",
      },
      {
        kind: "p",
        text: "So we stopped reviewing scales as ladders and started reviewing them as pairs. For a seven-step scale that is twenty-one pairs, which sounds like a lot until you notice that only five or six of them ever occur, and that those five carry every hierarchy decision the product makes.",
      },
      { kind: "h", text: "What we test instead" },
      {
        kind: "list",
        items: [
          "Every adjacent pair, side by side, at the weight each one actually ships in.",
          "The smallest step against the smallest viewport, with the responsive scale doing its worst.",
          "A heading and its own body copy at the widest measure the layout allows.",
          "Two steps in muted colour on the lowest-contrast surface in the theme.",
        ],
      },
      {
        kind: "p",
        text: "The fourth test is the one that fails most often. A ratio that reads clearly in primary ink at full contrast collapses the moment both sides of the pair are muted, because the size difference was doing less work than the colour difference all along.",
      },
      {
        kind: "code",
        filename: "tokens/type-scale.css",
        language: "CSS",
        code: ":root {\n  /* Steps, not a formula. The ratio between h4 and h5 is smaller\n     than the rest on purpose — they meet in every card header. */\n  --T-SIZE-H3: 1.75rem;\n  --T-SIZE-H4: 1.375rem;\n  --T-SIZE-H5: 1.125rem;\n  --T-SIZE-BODY-1: 1rem;\n  --T-SIZE-BODY-2: 0.9375rem;\n  --T-SIZE-BODY-3: 0.8125rem;\n}",
      },
      {
        kind: "p",
        text: "Note what that costs: the scale is no longer a single ratio, and you can no longer regenerate it from one number. That is the trade. A scale you can regenerate is a scale nobody has had to defend against a real screen.",
      },
      {
        kind: "figure",
        seed: "type-specimen",
        caption: "The same six steps, first as a ladder and then as the pairs the product actually renders.",
      },
      {
        kind: "p",
        text: "None of this makes the specimen useless. It makes it a starting position rather than a verdict — the thing you bring to the pair test, not the thing the pair test is meant to confirm.",
      },
    ],
  },
  {
    slug: "why-we-recut-the-palette-in-oklch",
    title: "Why we re-cut every palette in OKLCH",
    dek: "The hue shifts were not a rendering bug. They were arithmetic, and they were in the colour space we had chosen.",
    topic: "Colour",
    author: "ines",
    date: "9 July 2026",
    isoDate: "2026-07-09",
    minutes: 8,
    body: [
      {
        kind: "p",
        text: "Our first palette was a set of hex values with a lightness curve applied in HSL. It looked fine in blue and grey. It looked wrong in yellow, and it looked wrong in exactly the way HSL always goes wrong: the mid steps were far brighter than their neighbours, and the dark steps drifted green.",
      },
      {
        kind: "p",
        text: "HSL's lightness is not perceptual. Two colours at the same L can differ by a factor of three in how bright they read, so a ramp built by stepping L evenly is a ramp that steps unevenly to a human eye. Every fix we applied by hand was a correction for that, one swatch at a time.",
      },
      {
        kind: "code",
        filename: "tokens/ramp.css",
        language: "CSS",
        code: "/* Same hue, same chroma, evenly stepped lightness.\n   In OKLCH that is also an even step to the eye. */\n--C-ACCENT-100: oklch(0.94 0.03 264);\n--C-ACCENT-300: oklch(0.82 0.08 264);\n--C-ACCENT-500: oklch(0.63 0.16 264);\n--C-ACCENT-700: oklch(0.48 0.14 264);\n--C-ACCENT-900: oklch(0.32 0.09 264);",
      },
      {
        kind: "p",
        text: "Re-cutting in OKLCH removed the hand corrections entirely. It also removed an argument: when a ramp is generated from a curve everyone can read, a request to nudge one swatch becomes a request to change the curve, which is a discussion about the whole system rather than about a favourite blue.",
      },
      {
        kind: "quote",
        text: "The palette stopped being a list of colours somebody chose and became a shape somebody can defend.",
        cite: "Ines Marchetti",
      },
      {
        kind: "p",
        text: "The cost is real and worth stating. Chroma clips differently per hue, so an evenly stepped ramp in one hue may leave gamut in another before it reaches the same step. We cap chroma per hue family rather than per swatch, which keeps the curve honest and the reds slightly quieter than a designer picking freely would have made them.",
      },
    ],
  },
  {
    slug: "motion-that-explains",
    title: "Motion that explains, not motion that decorates",
    dek: "Three questions we ask of every animation before it ships, and the one that kills most of them.",
    topic: "Motion",
    author: "mira",
    date: "27 June 2026",
    isoDate: "2026-06-27",
    minutes: 6,
    body: [
      {
        kind: "p",
        text: "An animation earns its place by answering a question the user would otherwise have to ask. Where did that panel come from? Is this the same object I just clicked, or a new one? Did anything change when I pressed that? If a transition answers none of those, it is a delay with a curve on it.",
      },
      {
        kind: "list",
        items: [
          "What did this movement tell the reader that stillness would not have?",
          "If it played twice in a row, would the second time still be welcome?",
          "Under reduced motion, does the interface still explain itself?",
        ],
      },
      {
        kind: "p",
        text: "The second question is the one that kills most candidates. A flourish is charming once and grating on the fourth visit to the same screen, and the screens people visit most are the ones we tend to decorate first.",
      },
      {
        kind: "quote",
        text: "Design the reduced-motion version first. If it is worse than what you had before you started, the animation was carrying meaning that should have been in the layout.",
        cite: "Motion review checklist",
      },
      {
        kind: "p",
        text: "That inversion — reduced motion as the design, full motion as the enhancement — is why our entrance animations are all reveals of content that was already laid out correctly, rather than assemblies of content that only makes sense once the movement finishes.",
      },
    ],
  },
  {
    slug: "the-token-that-should-not-exist",
    title: "The token that should not exist",
    dek: "A universal contract survives on what it refuses. Three tests, and every one of them has to pass.",
    topic: "Tokens",
    author: "ada",
    date: "14 June 2026",
    isoDate: "2026-06-14",
    minutes: 7,
    body: [
      {
        kind: "p",
        text: "The pressure on a design token contract is always in one direction: add. Someone needs a value, the contract is where values live, and refusing feels like obstruction. But every token in a universal contract is a promise to every consumer that the name means something to them — and most proposed tokens fail that on the first read.",
      },
      { kind: "h", text: "Three tests, all of which must hold" },
      {
        kind: "list",
        items: [
          "Standalone-meaningful: useful to someone with only this package and no component library.",
          "Cross-cutting: read by many contexts, not the configuration of a single component.",
          "Domain-neutral: part of the universal language, with a name that encodes no component and no domain.",
        ],
      },
      {
        kind: "p",
        text: "A name like MEDIA-CARD-HOVER-LIFT fails the third test on sight. It is a fine token; it just belongs to the library that owns media cards, not to the language every consumer inherits.",
      },
      {
        kind: "quote",
        text: "If it needs a component, or a specific kind of app, to mean anything, it is an extension.",
        cite: "The one-line rule",
      },
      {
        kind: "p",
        text: "Nothing is lost by keeping a token out. Custom properties cascade by name regardless of which package declared them, so a theme can still override an extension token, and the owning library can register its own utilities for merging. What is gained is that the contract stays readable by someone who has never seen the rest of the family.",
      },
    ],
  },
  {
    slug: "focus-rings-nobody-removes",
    title: "Focus rings nobody wants to remove",
    dek: "Every outline: none in a codebase is a design failure that was reported as a styling preference.",
    topic: "Accessibility",
    author: "ruben",
    date: "2 June 2026",
    isoDate: "2026-06-02",
    minutes: 9,
    body: [
      {
        kind: "p",
        text: "Nobody sets outline: none because they dislike keyboard users. They set it because the default ring looked wrong on their component and no better option was within reach. Treat each instance as a bug report about the ring, not about the person who removed it.",
      },
      {
        kind: "p",
        text: "The default ring goes wrong in three predictable ways: it hugs a rounded corner badly, it disappears against a filled background, and it gets clipped by an ancestor with overflow hidden. All three are fixable in the system, which means all three are the system's problem.",
      },
      {
        kind: "code",
        filename: "util/focus.ts",
        language: "TypeScript",
        code: "// Filled variants get the offset band so the ring never sits\n// directly on the fill and lose contrast against it.\nexport const focusRingButton =\n  \"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus\";\n\nexport const focusRingButtonFilled =\n  focusRingButton + \" focus-visible:outline-offset-[3px]\";",
      },
      {
        kind: "p",
        text: "Once the ring follows the component's own radius, sits outside a fill rather than on it, and is drawn where an ancestor cannot clip it, the removals stop arriving. Not because a rule forbids them — because the reason for them is gone.",
      },
    ],
  },
  {
    slug: "dark-mode-is-not-an-inversion",
    title: "Dark mode is not an inversion",
    dek: "Flip the lightness curve and you get a theme where every elevation reads backwards. Here is what to flip instead.",
    topic: "Colour",
    author: "ines",
    date: "19 May 2026",
    isoDate: "2026-05-19",
    minutes: 10,
    body: [
      {
        kind: "p",
        text: "In a light theme, surfaces rise toward the viewer by getting lighter, and shadow does the separating. Invert the palette and both of those stop working at once: the raised surface is now darker than the page, and the shadow it casts is invisible against a dark ground.",
      },
      {
        kind: "p",
        text: "The fix is not a different curve. It is accepting that elevation is signalled by a different property in each theme — lightness plus shadow in one, lightness plus border in the other — and letting the surface tokens carry that difference instead of asking every component to know about it.",
      },
      {
        kind: "figure",
        seed: "dark-surfaces",
        caption: "The same three surfaces in both themes. The step between them is even in each, and it is not the same step.",
      },
      {
        kind: "p",
        text: "Once surfaces carry it, components stop caring which theme is active, and a consumer writing a third theme gets the same deal as the two that shipped — which is the entire point of putting it in the tokens.",
      },
    ],
  },
  {
    slug: "the-cost-of-one-more-breakpoint",
    title: "The cost of one more breakpoint",
    dek: "Each breakpoint you add multiplies the states every reviewer has to hold in their head. Most layouts need fewer than they have.",
    topic: "Layout",
    author: "ada",
    date: "5 May 2026",
    isoDate: "2026-05-05",
    minutes: 5,
    body: [
      {
        kind: "p",
        text: "A breakpoint is not a line in a config file. It is a promise that someone will check this layout at that width, forever, on every change. Five breakpoints across four components is twenty checks per review, and nobody does twenty checks per review.",
      },
      {
        kind: "p",
        text: "Most of what we used breakpoints for turned out to be container queries in disguise: the card did not care how wide the window was, it cared how wide its column was. Moving those cases off the viewport removed both the breakpoint and the coupling.",
      },
      {
        kind: "quote",
        text: "Add a breakpoint when the content changes shape, not when the numbers stop being round.",
        cite: "Layout review notes",
      },
    ],
  },
  {
    slug: "empty-states-are-product-design",
    title: "Empty states are product design",
    dek: "The screen with nothing on it is the one that decides whether someone comes back.",
    topic: "Process",
    author: "ruben",
    date: "21 April 2026",
    isoDate: "2026-04-21",
    minutes: 6,
    body: [
      {
        kind: "p",
        text: "Every empty state is one of three things, and treating them alike is why so many read as apologies: nothing has happened yet, nothing matches the filter, or something went wrong. The first is an invitation, the second is a correction, and only the third is bad news.",
      },
      {
        kind: "list",
        items: [
          "First run: say what will appear here and give the one action that starts it.",
          "No results: say what was filtered out and offer the way back.",
          "Error: say what failed, whether it is being retried, and what the reader can do meanwhile.",
        ],
      },
      {
        kind: "p",
        text: "The no-results case is the one worth spending on. It is the only empty state a returning user sees, it is usually reachable in one click from a state that had content, and the way back is always known — which means there is no excuse for not offering it.",
      },
    ],
  },
  {
    slug: "docs-your-components-cannot-outrun",
    title: "Docs your components cannot outrun",
    dek: "If the examples in the documentation do not compile, they are marketing. Ours are typechecked, and that changed what we write.",
    topic: "Process",
    author: "mira",
    date: "3 April 2026",
    isoDate: "2026-04-03",
    minutes: 12,
    body: [
      {
        kind: "p",
        text: "Documentation drifts because nothing breaks when it does. Rename a prop and the code moves; the snippet in the guide sits there being wrong until a reader trusts it and loses an afternoon.",
      },
      {
        kind: "p",
        text: "So the examples stopped being fenced code blocks in a markdown file and became real modules beside each component — imported, typechecked, rendered in the dev gallery, and read by the docs generator. A renamed prop now fails the build, in the examples, before anyone reads them.",
      },
      {
        kind: "code",
        filename: "src/components/ui/Badge.examples.tsx",
        language: "TypeScript",
        code: "/** `variant` picks the status colour. `default` is neutral metadata. */\nexport function Variants() {\n  return (\n    <>\n      <Badge>Draft</Badge>\n      <Badge variant=\"success\">Published</Badge>\n      <Badge variant=\"warning\">Expiring</Badge>\n    </>\n  );\n}",
      },
      {
        kind: "p",
        text: "The side effect was the interesting part. Once an example had to compile, it had to be complete, and once it was complete it was too long to bury a caveat in prose beside it. The docblock above each example became the whole explanation — one sentence, load-bearing, and impossible to leave stale.",
      },
      {
        kind: "quote",
        text: "A documentation example that cannot break is a documentation example nobody is maintaining.",
        cite: "Contributing guide",
      },
    ],
  },
];

const POST_BY_SLUG = new Map(POSTS.map((post) => [post.slug, post]));
const FEATURED = POSTS[0];
const PICKS = POSTS.slice(1, 7);
const PAGE_SIZE = 6;

const FAQ = [
  {
    value: "cadence",
    question: "How often does this publish?",
    answer:
      "Roughly fortnightly, whenever something has actually been decided. There is no editorial calendar and no obligation to fill a slot, which is why the archive has gaps in it.",
  },
  {
    value: "corrections",
    question: "What happens when a post turns out to be wrong?",
    answer:
      "It gets a correction note at the top with the date and what changed, and the original claim stays visible underneath it. Quietly editing an argument after the fact is how a blog stops being worth reading.",
  },
  {
    value: "guests",
    question: "Do you take guest posts?",
    answer:
      "Occasionally, from people who have shipped the thing they want to write about. Send the argument rather than the pitch — a paragraph that states the position is more useful than an outline.",
  },
  {
    value: "feeds",
    question: "Is there a feed?",
    answer:
      "Yes, and it carries full article text rather than a teaser. If you would rather read this somewhere else, that is a reasonable preference and not one worth taxing.",
  },
];

/* ------------------------------------------------------------------ */
/*  Routing                                                            */
/* ------------------------------------------------------------------ */

type Route =
  | { name: "home" }
  | { name: "archive" }
  | { name: "about" }
  | { name: "post"; post: Post }
  | { name: "missing" };

function routeFor(pathname: string): Route {
  if (pathname === "/") return { name: "home" };
  if (pathname === "/archive") return { name: "archive" };
  if (pathname === "/about") return { name: "about" };
  const slug = pathname.startsWith("/posts/") ? pathname.slice("/posts/".length) : null;
  const post = slug ? POST_BY_SLUG.get(slug) : undefined;
  return post ? { name: "post", post } : { name: "missing" };
}

const postPath = (post: Post) => `/posts/${post.slug}`;

/**
 * Navigation, wrapped in a view transition so the card image a reader clicked
 * morphs into the article header rather than being replaced by it. The pairing
 * is by `ViewTransition name`, which is why both ends use `post-${slug}`.
 */
function useBlogNavigate() {
  const { navigate } = useDemoRouter();
  return useViewTransition(navigate);
}

/** `href` + `onClick` for anything that navigates: an `<a>`, a `Button as="a"`, a Swimlane link. */
function useLinkProps() {
  const navigate = useBlogNavigate();
  return useCallback(
    (to: string) => ({
      href: to,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        navigate(to);
      },
    }),
    [navigate],
  );
}

/* ------------------------------------------------------------------ */
/*  Shared pieces                                                      */
/* ------------------------------------------------------------------ */

function BlogLink({
  to,
  className,
  children,
  ...rest
}: { to: string } & Omit<ComponentPropsWithoutRef<"a">, "href" | "onClick">) {
  const link = useLinkProps();
  return (
    <a {...rest} {...link(to)} className={className}>
      {children}
    </a>
  );
}

/** Byline: the same four facts in the same order everywhere they appear. */
function PostMeta({ post, className }: { post: Post; className?: string }) {
  const author = AUTHORS[post.author];
  return (
    <Row gap="r5" wrap className={cn("text-body-3 text-fg-muted", className)}>
      <Row gap="r6">
        <Avatar name={author.name} size="xs" aria-hidden="true" />
        <span className="text-fg-secondary">{author.name}</span>
      </Row>
      <Row gap="r6" as="span">
        <CalendarDays size={13} aria-hidden="true" />
        <time dateTime={post.isoDate}>{post.date}</time>
      </Row>
      <Row gap="r6" as="span">
        <Clock size={13} aria-hidden="true" />
        {post.minutes} min read
      </Row>
    </Row>
  );
}

function PostCard({ post }: { post: Post }) {
  const link = useLinkProps();

  return (
    <Card padding="r4" className="flex h-full flex-col gap-r4">
      {/* The name pairs with the article header's image, so clicking the card
          morphs this crop into the full-bleed one instead of cutting to it. */}
      <ViewTransition
        name={`post-${post.slug}`}
        className="aspect-[var(--ASPECT-WIDE)] overflow-hidden rounded-md bg-surface-2"
      >
        <img
          src={`https://picsum.photos/seed/${post.slug}/800/450`}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      </ViewTransition>

      <Badge className="self-start">{post.topic}</Badge>

      <Stack gap="r5">
        <Text as="h3" variant="h5">
          {/* The whole heading is the target — a "read more" link beside it would
              give screen-reader users a link list of identical names. */}
          <a {...link(postPath(post))} className="hover:underline">
            {post.title}
          </a>
        </Text>
        <Text variant="body-2" color="secondary">
          {post.dek}
        </Text>
      </Stack>

      <PostMeta post={post} className="mt-auto pt-r5" />
    </Card>
  );
}

function NewsletterPanel() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Card padding="r2" className="flex flex-col gap-r4">
      <Row gap="r4" align="start">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-fg-on-primary">
          <Mail size={16} aria-hidden="true" />
        </span>
        <Stack gap="r6">
          <Text as="h2" variant="h5">
            One post, every other Friday
          </Text>
          <Text variant="body-2" color="secondary">
            The whole article in the email, no tracking pixel, and an unsubscribe link that works
            on the first press.
          </Text>
        </Stack>
      </Row>

      <form
        className="flex flex-col gap-r5 sm:flex-row sm:items-start"
        onSubmit={(event) => {
          event.preventDefault();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            setError("That address is missing something — check the domain.");
            return;
          }
          setError(null);
          setEmail("");
          toast("You're on the list. First issue lands Friday.", { variant: "success" });
        }}
      >
        <Field error={error ?? undefined} className="flex-1">
          <Label htmlFor="newsletter-email">Email address</Label>
          <Input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(null);
            }}
          />
          <FieldError />
        </Field>
        {/* mt-auto would follow the Field's error message down; the offset keeps
            the button on the input's baseline whether or not one is showing. */}
        <Button type="submit" className="sm:mt-[1.75rem]">
          Subscribe
        </Button>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Masthead                                                           */
/* ------------------------------------------------------------------ */

const NAV = [
  { to: "/", label: "Home" },
  { to: "/archive", label: "Writing" },
  { to: "/about", label: "About" },
];

/** Decoration, so `aria-hidden` rather than a label — the article says how long it is. */
function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <ProgressBar
      aria-hidden
      value={progress}
      size="sm"
      animate={false}
      className="rounded-none"
      classNames={{ fill: "rounded-none" }}
    />
  );
}

function Masthead({ query, onQueryChange }: { query: string; onQueryChange: (v: string) => void }) {
  const { pathname } = useDemoRouter();
  const navigate = useBlogNavigate();
  const link = useLinkProps();
  const [menuOpen, setMenuOpen] = useState(false);

  const search = (value: string) => {
    onQueryChange(value);
    if (value && pathname !== "/archive") navigate("/archive");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-surface-1/90 backdrop-blur">
      <Container size="xl" className="flex items-center gap-r4 py-r5">
        <BlogLink to="/" className="flex items-center gap-r5 text-h5 font-bold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-fg-on-primary">
            <Feather size={15} aria-hidden="true" />
          </span>
          Kerning
        </BlogLink>

        <nav aria-label="Sections" className="ml-r3 hidden md:block">
          <Row gap="r4" as="ul" className="list-none">
            {NAV.map((item) => (
              <li key={item.to}>
                <a
                  {...link(item.to)}
                  aria-current={pathname === item.to ? "page" : undefined}
                  className={cn(
                    "text-body-2 hover:text-fg-primary",
                    pathname === item.to ? "text-fg-primary font-semibold" : "text-fg-secondary",
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </Row>
        </nav>

        <Row gap="r5" className="ml-auto">
          {/* `.search-input` is `width: 100%` in unlayered CSS, which outranks a
              Tailwind width utility on the same element — so the cap goes on a
              wrapper, not on the control. */}
          <div className="hidden w-56 lg:block">
            <SearchInput
              size="sm"
              value={query}
              onChange={search}
              placeholder="Search the archive"
            />
          </div>
          <span className="hidden sm:block">
            <ThemeSwitcher themes={EXAMPLE_THEMES} />
          </span>
          <IconButton
            type="button"
            aria-label="Open menu"
            className="md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} aria-hidden="true" />
          </IconButton>
        </Row>
      </Container>

      {routeFor(pathname).name === "post" && <ReadingProgress />}

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        side="right"
        aria-label="Site menu"
        className="flex flex-col gap-r3"
      >
        <Row justify="between">
          <Text variant="h5" as="span">
            Kerning
          </Text>
          <IconButton type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <X size={18} aria-hidden="true" />
          </IconButton>
        </Row>
        <SearchInput value={query} onChange={search} placeholder="Search the archive" />
        <nav aria-label="Sections">
          <Stack gap="r4" as="ul" className="list-none">
            {NAV.map((item) => (
              <li key={item.to}>
                <a
                  href={item.to}
                  aria-current={pathname === item.to ? "page" : undefined}
                  className="text-body-1 text-fg-primary"
                  onClick={(event) => {
                    event.preventDefault();
                    setMenuOpen(false);
                    navigate(item.to);
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </Stack>
        </nav>
        <ThemeSwitcher themes={EXAMPLE_THEMES} className="self-start" />
      </Drawer>
    </header>
  );
}

function SiteFooter() {
  const link = useLinkProps();

  return (
    <footer className="mt-r1 border-t border-border-default bg-surface-1">
      <Container size="xl" className="flex flex-col gap-r3 py-r2">
        <Row justify="between" align="start" gap="r3" wrap>
          <Stack gap="r5" className="max-w-sm">
            <Row gap="r5">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-fg-on-primary">
                <Feather size={15} aria-hidden="true" />
              </span>
              <Text variant="h5" as="span">
                Kerning
              </Text>
            </Row>
            <Text variant="body-3" color="secondary">
              Notes on interface craft from the people maintaining one design system, published
              when something has actually been decided.
            </Text>
          </Stack>

          <Row gap="r2" align="start" wrap>
            <Stack gap="r5">
              <Text variant="body-3" weight="semibold" color="muted" as="span">
                Read
              </Text>
              {NAV.map((item) => (
                <a key={item.to} {...link(item.to)} className="text-body-3 text-fg-secondary hover:text-fg-primary">
                  {item.label}
                </a>
              ))}
            </Stack>
            <Stack gap="r5">
              <Text variant="body-3" weight="semibold" color="muted" as="span">
                Topics
              </Text>
              {TOPICS.slice(0, 4).map((topic) => (
                <a
                  key={topic}
                  {...link("/archive")}
                  className="text-body-3 text-fg-secondary hover:text-fg-primary"
                >
                  {topic}
                </a>
              ))}
            </Stack>
          </Row>
        </Row>

        <Divider />

        <Row justify="between" gap="r4" wrap>
          <Text variant="body-3" color="muted" as="span">
            Demo content · built entirely from this library
          </Text>
          <Row gap="r5">
            <IconButton type="button" aria-label="RSS feed">
              <Rss size={16} aria-hidden="true" />
            </IconButton>
            <IconButton type="button" aria-label="Mastodon">
              <AtSign size={16} aria-hidden="true" />
            </IconButton>
            <IconButton type="button" aria-label="Email the editors">
              <Mail size={16} aria-hidden="true" />
            </IconButton>
          </Row>
        </Row>
      </Container>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Home                                                               */
/* ------------------------------------------------------------------ */

function HomePage() {
  const link = useLinkProps();
  const navigate = useBlogNavigate();
  const author = AUTHORS[FEATURED.author];

  return (
    <>
      <Hero size="lg" align="end">
        <Hero.Background
          parallax
          src={`https://picsum.photos/seed/${FEATURED.slug}/1800/1200`}
          imgProps={{ fetchPriority: "high", loading: "eager" }}
        />
        {/* A Container inside the content layer, not a max-width on it: Hero.Content's
            own padding is symmetric, so a container centred within it lands on the
            same left edge as the masthead's rather than 6rem inside it. */}
        <Hero.Content animate>
          <Container size="xl" className="flex flex-col gap-r4">
            <Row gap="r5">
              <Badge variant="info">Featured</Badge>
              <Text variant="body-3" color="on-primary" as="span">
                {FEATURED.topic} · {FEATURED.minutes} min read
              </Text>
            </Row>
            <Text variant="h1" color="on-primary" className="max-w-3xl">
              {FEATURED.title}
            </Text>
            <Text variant="body-1" color="on-primary" className="max-w-2xl opacity-90">
              {FEATURED.dek}
            </Text>
            <Row gap="r4" wrap>
              <Button as="a" size="lg" {...link(postPath(FEATURED))}>
                Read the essay
                <ArrowRight size={16} aria-hidden="true" />
              </Button>
              <Row gap="r5">
                <Avatar name={author.name} size="sm" />
                <Text variant="body-3" color="on-primary" as="span">
                  {author.name} · {FEATURED.date}
                </Text>
              </Row>
            </Row>
          </Container>
        </Hero.Content>
      </Hero>

      {/* gap-r2, not r1: Swimlane already carries `mb-r2`, and the two together
          read as a dropped section rather than a rhythm. */}
      <Container size="xl" className="flex flex-col gap-r2 py-r2">
        <Swimlane
          title="Editor's picks"
          subtitle="Six arguments we keep sending people"
          viewAllHref="/archive"
          viewAllProps={{
            onClick: (event) => {
              event.preventDefault();
              navigate("/archive");
            },
          }}
        >
          <Carousel
            aria-label="Editor's picks"
            style={{ "--carousel-item-width": "20rem" } as CSSProperties}
          >
            <Carousel.Track>
              {PICKS.map((post) => (
                <Carousel.Item key={post.slug}>
                  <MediaCard orientation="landscape">
                    <MediaCard.Image
                      src={`https://picsum.photos/seed/${post.slug}/800/450`}
                      alt=""
                    />
                    <MediaCard.Badge>
                      {/* Default variant, as on the post cards: a topic is
                          metadata, and the status variants come with a glyph. */}
                      <Badge>{post.topic}</Badge>
                    </MediaCard.Badge>
                    <MediaCard.Overlay />
                    <MediaCard.Content>
                      <Text as="h3" variant="h6">
                        <a {...link(postPath(post))} className="hover:underline">
                          {/* The card's own hover lift is the affordance; the
                              stretched hit area is the whole heading link. */}
                          {post.title}
                        </a>
                      </Text>
                      <Text variant="body-3" color="secondary">
                        {AUTHORS[post.author].name} · {post.minutes} min
                      </Text>
                    </MediaCard.Content>
                  </MediaCard>
                </Carousel.Item>
              ))}
            </Carousel.Track>
          </Carousel>
        </Swimlane>

        <section className="flex flex-col gap-r3">
          <Row justify="between" align="end" gap="r4" wrap>
            <Stack gap="r6">
              <Text as="h2" variant="h3">
                Latest
              </Text>
              <Text variant="body-2" color="secondary">
                Everything published this quarter, newest first.
              </Text>
            </Stack>
            <Button as="a" variant="secondary" {...link("/archive")}>
              Browse the archive
              <ArrowUpRight size={16} aria-hidden="true" />
            </Button>
          </Row>

          <Grid columns={{ base: 1, md: 2, lg: 3 }} gap="r3">
            {POSTS.slice(0, 6).map((post, index) => (
              // Delay by position, not by a Stagger container: these reveal on
              // scroll, and only the row entering the viewport should be offset.
              <ScrollReveal key={post.slug} delay={(index % 3) * 80} className="h-full">
                <PostCard post={post} />
              </ScrollReveal>
            ))}
          </Grid>
        </section>

        <NewsletterPanel />
      </Container>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Archive                                                            */
/* ------------------------------------------------------------------ */

function ArchivePage({
  query,
  onQueryChange,
  topic,
  onTopicChange,
  page,
  onPageChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  topic: Topic | "All";
  onTopicChange: (value: Topic | "All") => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POSTS.filter((post) => {
      if (topic !== "All" && post.topic !== topic) return false;
      if (!q) return true;
      return [post.title, post.dek, post.topic, AUTHORS[post.author].name].some((field) =>
        field.toLowerCase().includes(q),
      );
    });
  }, [query, topic]);

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  // A filter change can strand the reader past the end of the new result set.
  const current = Math.min(page, totalPages);
  const shown = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const clear = () => {
    onQueryChange("");
    onTopicChange("All");
    onPageChange(1);
  };

  return (
    <Container size="xl" className="flex flex-col gap-r2 py-r2">
      <Stack gap="r5">
        <Text as="h1" variant="h2">
          Writing
        </Text>
        <Text variant="body-1" color="secondary" className="max-w-2xl">
          {POSTS.length} posts on the parts of interface work that are decided once and then lived
          with for years.
        </Text>
      </Stack>

      <Stack gap="r4">
        <div className="w-full max-w-md">
          <SearchInput
            value={query}
            onChange={(value) => {
              onQueryChange(value);
              onPageChange(1);
            }}
            placeholder="Search titles, topics and authors"
          />
        </div>
        <Row gap="r6" wrap>
          {(["All", ...TOPICS] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={topic === value ? "primary" : "ghost"}
              aria-pressed={topic === value}
              onClick={() => {
                onTopicChange(value);
                onPageChange(1);
              }}
            >
              {value}
            </Button>
          ))}
        </Row>
      </Stack>

      {shown.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <PenLine size="1em" />
          </EmptyStateIcon>
          <EmptyStateTitle>Nothing matches that yet</EmptyStateTitle>
          <EmptyStateDescription>
            No post in the archive mentions “{query.trim() || topic}”. Clearing the filters brings
            all {POSTS.length} back.
          </EmptyStateDescription>
          <EmptyStateActions>
            <Button type="button" variant="secondary" onClick={clear}>
              Clear filters
            </Button>
          </EmptyStateActions>
        </EmptyState>
      ) : (
        <>
          <Text variant="body-3" color="muted" as="p" role="status">
            {matches.length} {matches.length === 1 ? "post" : "posts"}
            {topic === "All" ? "" : ` in ${topic}`} · page {current} of {totalPages}
          </Text>

          {/* Masonry rather than a grid: the deks run to different lengths, and a
              row-aligned grid pads every card up to the tallest in its row. The
              trade is CSS columns' reading order — down each column, not across —
              which a browsable archive can live with and a ranked list could not. */}
          <MasonryGrid columns={{ base: 1, sm: 2, lg: 3 }} gap="r3">
            {shown.map((post) => (
              <MasonryGrid.Item key={post.slug}>
                <PostCard post={post} />
              </MasonryGrid.Item>
            ))}
          </MasonryGrid>

          <Pagination
            aria-label="Archive pages"
            page={current}
            totalPages={totalPages}
            compactBelow="30rem"
            onPageChange={(next) => {
              onPageChange(next);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="self-center"
          />
        </>
      )}
    </Container>
  );
}

/* ------------------------------------------------------------------ */
/*  Article                                                            */
/* ------------------------------------------------------------------ */

function ArticleBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "p":
      return (
        <Text variant="body-1" className="leading-relaxed">
          {block.text}
        </Text>
      );
    case "h":
      return (
        <Text as="h2" variant="h4" className="pt-r4">
          {block.text}
        </Text>
      );
    case "quote":
      return (
        <figure className="flex flex-col gap-r5 border-l-2 border-accent pl-r4">
          <Quote size={18} aria-hidden="true" className="text-accent" />
          <Text variant="h6" as="blockquote" weight="semibold" className="italic">
            {block.text}
          </Text>
          <Text variant="body-3" color="muted" as="figcaption">
            — {block.cite}
          </Text>
        </figure>
      );
    case "code":
      return <CodeBlock filename={block.filename} language={block.language} code={block.code} />;
    case "list":
      return (
        <Stack gap="r5" as="ul" className="list-disc pl-r3">
          {block.items.map((item) => (
            <Text key={item} as="li" variant="body-1">
              {item}
            </Text>
          ))}
        </Stack>
      );
    case "figure":
      return (
        <figure className="flex flex-col gap-r5">
          <img
            src={`https://picsum.photos/seed/${block.seed}/1200/675`}
            alt={block.caption}
            loading="lazy"
            className="aspect-[var(--ASPECT-WIDE)] w-full rounded-lg object-cover"
          />
          <Text variant="body-3" color="muted" as="figcaption">
            {block.caption}
          </Text>
        </figure>
      );
  }
}

function PostPage({ post }: { post: Post }) {
  const { toast } = useToast();
  const link = useLinkProps();
  const author = AUTHORS[post.author];

  const related = useMemo(() => {
    const sameTopic = POSTS.filter((p) => p.slug !== post.slug && p.topic === post.topic);
    const rest = POSTS.filter((p) => p.slug !== post.slug && p.topic !== post.topic);
    return [...sameTopic, ...rest].slice(0, 3);
  }, [post]);

  return (
    <>
      <Container size="lg" className="flex flex-col gap-r2 py-r2">
        <Stack gap="r4">
          <Breadcrumbs>
            <Breadcrumbs.Item href="/">Kerning</Breadcrumbs.Item>
            <Breadcrumbs.Item href="/archive">Writing</Breadcrumbs.Item>
            <Breadcrumbs.Item current>{post.topic}</Breadcrumbs.Item>
          </Breadcrumbs>

          <Stack gap="r4">
            <Badge className="self-start">{post.topic}</Badge>
            <Text as="h1" variant="h2">
              {post.title}
            </Text>
            <Text variant="body-1" color="secondary" className="text-balance">
              {post.dek}
            </Text>
          </Stack>

          <Row justify="between" gap="r4" wrap>
            <PostMeta post={post} />
            <Row gap="r6">
              <Text variant="body-3" color="muted" as="span">
                Copy link
              </Text>
              <CopyButton
                value={`https://kerning.example${postPath(post)}`}
                aria-label="Copy a link to this article"
              />
            </Row>
          </Row>
        </Stack>

        {/* Same name as the card the reader came from — this is the element that
            grows out of it when the view transition runs. */}
        <ViewTransition
          name={`post-${post.slug}`}
          className="aspect-[var(--ASPECT-WIDE)] overflow-hidden rounded-lg bg-surface-2"
        >
          <img
            src={`https://picsum.photos/seed/${post.slug}/1600/900`}
            alt=""
            className="size-full object-cover"
          />
        </ViewTransition>

        <article className="flex flex-col gap-r3">
          {post.body.map((block, index) => (
            <ArticleBlock key={index} block={block} />
          ))}
        </article>

        <Divider />

        <Row justify="between" gap="r4" wrap>
          <Row gap="r5" wrap>
            {[post.topic, "Design systems", "Craft"].map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </Row>
          <Row gap="r5">
            <Text variant="body-3" color="secondary" as="span" aria-hidden="true">
              Was this useful?
            </Text>
            <Rating
              aria-label="Rate this article"
              max={5}
              onValueChange={(value) =>
                toast(
                  value >= 4 ? "Glad it landed — thank you." : "Noted. Tell us what was missing.",
                  { variant: value >= 4 ? "success" : "info" },
                )
              }
            />
          </Row>
        </Row>

        <Card padding="r2" className="flex flex-col gap-r4 sm:flex-row sm:items-start">
          <Avatar name={author.name} size="xl" />
          <Stack gap="r5" className="flex-1">
            <Stack gap="r6">
              <Text variant="h5" as="h2">
                {author.name}
              </Text>
              <Text variant="body-3" color="muted" as="span">
                {author.role}
              </Text>
            </Stack>
            <Text variant="body-2" color="secondary">
              {author.bio}
            </Text>
            <Button as="a" variant="secondary" size="sm" className="self-start" {...link("/archive")}>
              More from {author.name.split(" ")[0]}
            </Button>
          </Stack>
        </Card>

        <Stack gap="r4">
          <Text as="h2" variant="h4">
            Responses
          </Text>
          <Card padding="r2">
            <ActivityFeed>
              <ActivityFeed.Item
                avatar={<Avatar name="Priya Raghunathan" size="sm" />}
                actor="Priya"
                action="replied to"
                target="the pair test"
                timestamp="2 days ago"
              >
                We ran this on our own scale and three of the seven steps turned out to be
                unreachable. Deleting them was the whole fix.
              </ActivityFeed.Item>
              <ActivityFeed.Item
                avatar={<Avatar name="Tomas Berg" size="sm" />}
                actor="Tomas"
                action="asked about"
                target="responsive steps"
                timestamp="4 days ago"
              >
                Does the pair test still hold once the responsive scale compresses the top end?
              </ActivityFeed.Item>
              <ActivityFeed.Item
                icon={<Sparkles />}
                actor="Editors"
                action="pinned"
                target="a correction"
                timestamp="5 days ago"
              >
                An earlier version quoted the wrong ratio in the second example.
              </ActivityFeed.Item>
            </ActivityFeed>
          </Card>
        </Stack>
      </Container>

      <Container size="xl" className="flex flex-col gap-r3 pb-r2">
        <Divider />
        <Row justify="between" align="end" gap="r4" wrap>
          <Text as="h2" variant="h4">
            Keep reading
          </Text>
          <Button as="a" variant="link" size="sm" {...link("/archive")}>
            <ArrowLeft size={14} aria-hidden="true" />
            Back to the archive
          </Button>
        </Row>
        <Grid columns={{ base: 1, md: 3 }} gap="r3">
          {related.map((item) => (
            <PostCard key={item.slug} post={item} />
          ))}
        </Grid>
      </Container>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  About                                                              */
/* ------------------------------------------------------------------ */

const PRINCIPLES = [
  {
    title: "Publish decisions, not opinions",
    body: "Every post here rests on something that shipped. If we are still arguing about it internally, it is not ready to be an argument in public.",
  },
  {
    title: "Show the cost",
    body: "A recommendation without its trade-off is marketing. Each piece names what the approach costs and who should not pay it.",
  },
  {
    title: "Correct in the open",
    body: "Corrections sit at the top of the post with a date, and the original claim stays underneath. Silent edits are how a blog stops being worth reading.",
  },
];

function AboutPage() {
  return (
    <Container size="xl" className="flex flex-col gap-r2 py-r2">
      <Stack gap="r4" className="max-w-2xl">
        <Text as="h1" variant="h2">
          Notes on interface craft
        </Text>
        <Text variant="body-1" color="secondary">
          Kerning is written by the four people who maintain one design system, mostly about the
          decisions that are made once and then lived with for years — a colour space, a type
          scale, the line between a universal token and a component's own.
        </Text>
      </Stack>

      <Spotlight>
        <Spotlight.Item>
          <Spotlight.Image
            src="https://picsum.photos/seed/kerning-studio/1200/900"
            alt="A wall of printed type specimens, annotated in pencil"
          />
          <Spotlight.Content>
            <Text variant="h3" as="h2">
              Written from the maintenance seat
            </Text>
            <Text variant="body-1" color="secondary">
              Nothing here is speculative. Each post comes out of a change that went through
              review, shipped, and then had to be lived with long enough to know whether it was
              right.
            </Text>
          </Spotlight.Content>
        </Spotlight.Item>
        <Spotlight.Item>
          <Spotlight.Image
            src="https://picsum.photos/seed/kerning-review/1200/900"
            alt="Two people reviewing colour ramps on a large display"
          />
          <Spotlight.Content>
            <Text variant="h3" as="h2">
              Arguments, with their costs attached
            </Text>
            <Text variant="body-1" color="secondary">
              We would rather publish one position with its trade-offs stated than five balanced
              summaries that leave the reader exactly where they started.
            </Text>
          </Spotlight.Content>
        </Spotlight.Item>
      </Spotlight>

      <section className="flex flex-col gap-r3">
        <Text as="h2" variant="h3">
          How we work
        </Text>
        {/* Stagger, not ScrollReveal: this sits near the top of a short page and
            plays on mount, so nothing waits on an intersection that already fired. */}
        <Stagger className="grid gap-r3 md:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <Card key={principle.title} padding="r3" className="flex h-full flex-col gap-r5">
              <Text as="h3" variant="h5">
                {principle.title}
              </Text>
              <Text variant="body-2" color="secondary">
                {principle.body}
              </Text>
            </Card>
          ))}
        </Stagger>
      </section>

      <section className="flex flex-col gap-r3">
        <Text as="h2" variant="h3">
          The writers
        </Text>
        <Grid columns={{ base: 1, sm: 2 }} gap="r3">
          {Object.values(AUTHORS).map((author) => (
            <Card key={author.name} padding="r3" className="flex gap-r4">
              <Avatar name={author.name} size="lg" />
              <Stack gap="r6">
                <Text variant="h5" as="h3">
                  {author.name}
                </Text>
                <Text variant="body-3" color="muted" as="span">
                  {author.role}
                </Text>
                <Text variant="body-2" color="secondary">
                  {author.bio}
                </Text>
              </Stack>
            </Card>
          ))}
        </Grid>
      </section>

      <section className="flex flex-col gap-r3">
        <Text as="h2" variant="h3">
          Frequently asked
        </Text>
        <Accordion mode="single" headingLevel={3}>
          {FAQ.map((entry) => (
            <Accordion.Item key={entry.value} value={entry.value}>
              <Accordion.Trigger>{entry.question}</Accordion.Trigger>
              <Accordion.Content>
                <Text variant="body-2" color="secondary">
                  {entry.answer}
                </Text>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </section>

      <NewsletterPanel />
    </Container>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell                                                              */
/* ------------------------------------------------------------------ */

function NotFoundPage() {
  const link = useLinkProps();

  return (
    <Container size="lg" className="py-r1">
      <EmptyState>
        <EmptyStateIcon>
          <PenLine size="1em" />
        </EmptyStateIcon>
        <EmptyStateTitle>That page has not been written</EmptyStateTitle>
        <EmptyStateDescription>
          The link may be from a draft that never shipped. The archive has everything that did.
        </EmptyStateDescription>
        <EmptyStateActions>
          <Button as="a" {...link("/archive")}>
            Go to the archive
          </Button>
        </EmptyStateActions>
      </EmptyState>
    </Container>
  );
}

function BlogSite() {
  const { pathname } = useDemoRouter();
  const route = routeFor(pathname);

  // Archive filters live here, not in ArchivePage: the masthead's search field
  // drives them from every route, and they have to survive the navigation it
  // performs to get there.
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | "All">("All");
  const [page, setPage] = useState(1);

  // Every route change lands at the top, including the ones the router adapter
  // makes on its own (breadcrumbs), which never pass through this component.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-surface-0 text-fg-primary">
      <Masthead query={query} onQueryChange={setQuery} />

      <main>
        {route.name === "home" && <HomePage />}
        {route.name === "archive" && (
          <ArchivePage
            query={query}
            onQueryChange={setQuery}
            topic={topic}
            onTopicChange={setTopic}
            page={page}
            onPageChange={setPage}
          />
        )}
        {route.name === "post" && <PostPage post={route.post} />}
        {route.name === "about" && <AboutPage />}
        {route.name === "missing" && <NotFoundPage />}
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * The editorial counterpart to DashboardDemo: four routes of long-form layout,
 * built from the same components, so a change that reads well in a dense console
 * still has to answer for how it reads at a paragraph's measure.
 */
export function BlogDemo() {
  return (
    <DemoRouter initialPath="/">
      <ToastProvider>
        <BlogSite />
      </ToastProvider>
    </DemoRouter>
  );
}
