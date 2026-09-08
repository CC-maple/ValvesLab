import type { ValveId, ValveState } from "../domain/types.ts";

export const PIPE = "M60 200H700V296H60Z";
export const CHAMBER =
  "M60 200H238Q268 156 320 156H439Q493 156 522 200H700V296H522Q498 340 445 340H317Q262 340 238 296H60Z";
export const PARTITION_LEFT = "M235 156H257V256H343V274H235Z";
export const PARTITION_RIGHT = "M417 256H518V340H496V274H417Z";
export const GATE_TRAVEL = 96;
export const GLOBE_TRAVEL = 76;
export const CONTROL_TRAVEL = 70;

export interface FlowPoint {
  x: number;
  y: number;
}
type Band = [x: number, upper: number, lower: number];
const smooth = (v: number) => v * v * (3 - 2 * v);
function bandAt(x: number, bands: Band[]): [number, number] {
  const index = bands.findIndex((point, i) => i > 0 && x <= point[0]);
  const right = bands[index];
  const left = bands[index - 1];
  const weight = smooth((x - left[0]) / (right[0] - left[0]));
  return [
    left[1] + (right[1] - left[1]) * weight,
    left[2] + (right[2] - left[2]) * weight,
  ];
}

// Each cross-section has a shared, ordered band. Fixed lane fractions cannot
// exchange order. Monotone x + ordered y also prevents segment intersections.
export function flowLanes(id: ValveId, state: ValveState): FlowPoint[][] {
  const h = state.fraction;
  let bands: Band[];
  if (id === "gate") {
    const top = 296 - GATE_TRAVEL * h;
    bands = [
      [60, 200, 296],
      [260, 200, 296],
      [350, top, 296],
      [415, top, 296],
      [505, 200, 296],
      [700, 200, 296],
    ];
  } else if (id === "globe" || id === "control") {
    const gap = h * (id === "globe" ? GLOBE_TRAVEL : CONTROL_TRAVEL);
    bands = [
      [60, 200, 296],
      [200, 200, 296],
      [226, 281, 310],
      [280, 283, 330],
      [338, 280, 312],
      [380, 256 - gap * 0.8, 256 - gap * 0.2],
      [409, 256 - gap * 0.8, 256 - gap * 0.2],
      [445, 213, 244],
      [487, 205, 249],
      [545, 200, 296],
      [700, 200, 296],
    ];
  } else if (id === "butterfly") {
    const span = 94 - 46 * h;
    bands = [
      [60, 200, 296],
      [280, 200, 296],
      [365, 248 - span, 248 + span],
      [395, 248 - span, 248 + span],
      [480, 200, 296],
      [700, 200, 296],
    ];
  } else if (id === "ball") {
    const slope = Math.tan(((90 - state.angle) * Math.PI) / 180);
    const excursion = Math.min(69, 65 * slope);
    bands = [
      [60, 200, 296],
      [265, 200, 296],
      [315, 248 - excursion - 28, 248 - excursion + 28],
      [445, 248 + excursion - 28, 248 + excursion + 28],
      [495, 200, 296],
      [700, 200, 296],
    ];
  } else {
    throw new RangeError(`No streamline geometry for ${id}`);
  }
  const fractions = id === "butterfly" ? [0.25, 0.75] : [0.25, 0.5, 0.75];
  return fractions.map((fraction) =>
    Array.from({ length: 129 }, (_, i) => {
      const x = 60 + i * 5;
      const [upper, lower] = bandAt(x, bands);
      return { x, y: upper + (lower - upper) * fraction };
    }),
  );
}

export function flowPaths(id: ValveId, state: ValveState): string[] {
  return flowLanes(id, state).map((points) =>
    points
      .map(({ x, y }, i) => `${i === 0 ? "M" : "L"}${x} ${y.toFixed(3)}`)
      .join(" "),
  );
}
