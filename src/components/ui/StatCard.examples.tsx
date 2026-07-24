import { StatCard } from "./StatCard";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Label, value, and a trend — the three parts most stat cards need. */
export function Minimal() {
  return (
    <StatCard>
      <StatCard.Label>Monthly revenue</StatCard.Label>
      <StatCard.Value>$48,120</StatCard.Value>
      <StatCard.Trend value={12.5} direction="up" />
    </StatCard>
  );
}

/** Every slot, in reading order: icon chip, label, value, trend, sparkline. Compose only the parts you need — there is no shared state, so any can be dropped. */
export function Anatomy() {
  return (
    <StatCard>
      <StatCard.Icon>
        <svg
          viewBox="0 0 24 24"
          width={20}
          height={20}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </StatCard.Icon>
      <StatCard.Label>Monthly revenue</StatCard.Label>
      <StatCard.Value>$48,120</StatCard.Value>
      <StatCard.Trend value={12.5} direction="up" />
      <StatCard.Sparkline direction="up" values={[31, 34, 33, 38, 40, 44, 48]} />
    </StatCard>
  );
}

/** `animateValue` counts from `from` (default 0) to `to` when the card first scrolls into view; `format` styles the number. Without `to`, `animateValue` no-ops and `children` render instead. */
export function CountUp() {
  return (
    <StatCard>
      <StatCard.Label>Monthly revenue</StatCard.Label>
      <StatCard.Value animateValue to={48120} format={usd.format} />
    </StatCard>
  );
}

/** `direction` alone drives the arrow, sign, and colour — up is green, down is red, neutral is grey. The `value` is shown as its magnitude; its own sign is ignored. */
export function TrendDirections() {
  return (
    <>
      <StatCard>
        <StatCard.Label>New signups</StatCard.Label>
        <StatCard.Value>1,204</StatCard.Value>
        <StatCard.Trend value={12.5} direction="up" />
      </StatCard>
      <StatCard>
        <StatCard.Label>Refund rate</StatCard.Label>
        <StatCard.Value>3.2%</StatCard.Value>
        <StatCard.Trend value={0.8} direction="down" />
      </StatCard>
      <StatCard>
        <StatCard.Label>Open rate</StatCard.Label>
        <StatCard.Value>41%</StatCard.Value>
        <StatCard.Trend value={0} direction="neutral" />
      </StatCard>
    </>
  );
}

/** Pass `direction` to tint the sparkline to match the trend — green up, red down, muted neutral. */
export function SparklineTint() {
  return (
    <StatCard>
      <StatCard.Label>Weekly active users</StatCard.Label>
      <StatCard.Value>12,940</StatCard.Value>
      <StatCard.Sparkline direction="up" values={[8, 9, 7, 11, 10, 13, 14]} />
    </StatCard>
  );
}
