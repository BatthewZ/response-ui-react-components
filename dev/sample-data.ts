import type { MultiSelectOption } from "../src";

/** Sample data used by more than one dev view. View-local data stays in its view. */

export const SKILL_OPTIONS: MultiSelectOption[] = [
  { value: "react", label: "React" },
  { value: "typescript", label: "TypeScript" },
  { value: "css", label: "CSS" },
  { value: "node", label: "Node.js" },
  { value: "graphql", label: "GraphQL" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go", disabled: true },
];

export const COLOR_PRESETS = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#6366f1", "#8b5cf6", "#ec4899", "#64748b",
];
