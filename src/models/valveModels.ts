import type { ValveId, ValveState } from "../types.ts";

// These functions are deliberately illustrative, not measured manufacturer data.
// Each valve is normalized by its OWN fully-open area and flow.
const models: Record<ValveId, (h: number) => { area: number; flow: number }> = {
  ball: (h) => {
    const area = Math.sin((Math.PI * h) / 2) ** 2;
    return { area, flow: area ** 1.2 };
  },
  butterfly: (h) => {
    const area = 1 - Math.cos((Math.PI * h) / 2);
    return { area, flow: area ** 1.1 };
  },
  gate: (h) => ({ area: h, flow: 1 - (1 - h) ** 2 }),
  globe: (h) => ({ area: h, flow: (1.3 * h) / (1 + 0.3 * h) }),
  control: (h) => ({ area: h, flow: h }),
};

export function constrainOpening(opening: number): number {
  if (!Number.isFinite(opening))
    throw new RangeError("Opening must be a finite number");
  return Math.min(100, Math.max(0, opening));
}

export function evaluateValve(id: ValveId, opening: number): ValveState {
  const value = constrainOpening(opening);
  const h = value / 100;
  const output = models[id](h);
  // Explicit endpoints avoid trigonometric rounding artifacts at closure/full travel.
  const area = h === 0 || h === 1 ? h : output.area;
  const flow = h === 0 || h === 1 ? h : output.flow;
  return {
    opening: value,
    fraction: h,
    area: area * 100,
    flow: flow * 100,
    angle: h * 90,
    travel: value,
  };
}

export const sampleCurve = (id: ValveId) =>
  Array.from({ length: 101 }, (_, opening) => evaluateValve(id, opening));
export const modelFormulas: Record<ValveId, string> = {
  ball: "q = [sin²(πh/2)]¹·²",
  butterfly: "q = [1 − cos(πh/2)]¹·¹",
  gate: "q = 1 − (1 − h)²",
  globe: "q = 1.3h / (1 + 0.3h)",
  control: "q = h",
};
