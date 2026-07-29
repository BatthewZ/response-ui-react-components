import { Container } from "./Container";

/** Centers page content and caps its width to the default `md` reading measure. */
export function Minimal() {
  return (
    <Container>
      <h1>Release notes</h1>
      <p>Everything that shipped in this version, newest first.</p>
    </Container>
  );
}

/** Five width steps. `full` drops the cap entirely, keeping only the centering and gutters. */
export function Sizes() {
  return (
    <>
      <Container size="sm">Sign-in form</Container>
      <Container size="md">Article body</Container>
      <Container size="lg">Documentation page</Container>
      <Container size="xl">Dashboard grid</Container>
      <Container size="full">Full-bleed section</Container>
    </>
  );
}

/** Container owns width, not background. Put the fill on a wrapper and let the
 *  Container constrain the content — an edge-to-edge band whose copy stays readable.
 *  The same wrapping gives you a landmark: `<main><Container>…</Container></main>`. */
export function FullBleedBackground() {
  return (
    <div className="bg-surface-0">
      <Container size="lg">
        <h2>Trusted by teams everywhere</h2>
        <p>The band stretches edge to edge; the text stays within the measure.</p>
      </Container>
    </div>
  );
}
