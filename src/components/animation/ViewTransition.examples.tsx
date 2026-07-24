import { useViewTransition, ViewTransition } from "./ViewTransition";

const products = [
  { id: "aeron", title: "Aeron Chair" },
  { id: "sayl", title: "Sayl Chair" },
];

// Stand-in for a router navigate, e.g. `useNavigate()` from react-router-dom.
const navigate = (_path: string): void => {};

/** Tag an element with a unique `name`; the browser tweens it across the DOM change. */
export function Minimal() {
  return (
    <ViewTransition name="product-hero">
      <img src="/products/aeron-chair.jpg" alt="Aeron office chair" />
    </ViewTransition>
  );
}

/** In a list, each `name` must be unique per render — derive it from a stable id. */
export function UniqueNames() {
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          <ViewTransition name={`product-${product.id}`}>
            {product.title}
          </ViewTransition>
        </li>
      ))}
    </ul>
  );
}

/** `useViewTransition` wraps your router's navigate so the route change animates. */
export function TriggerNavigation() {
  const transition = useViewTransition(navigate);

  return (
    <button type="button" onClick={() => transition("/dashboard")}>
      View dashboard
    </button>
  );
}
