import { mkdirSync, writeFileSync } from "node:fs";
import {
  advance,
  defaultConfig,
  initialState,
  transferController,
} from "../src/simulation/engine.ts";
import type { SimulationConfig } from "../src/simulation/types.ts";
import type { ValveId } from "../src/types.ts";

const cases: object[] = [];
function scenario(
  name: string,
  initial: SimulationConfig,
  segments: { patch: Partial<SimulationConfig>; steps: number }[],
) {
  let c = initial,
    s = initialState(c);
  const checkpoints = segments.map((segment) => {
    const next = { ...c, ...segment.patch };
    if (next.mode === "manual" && c.mode === "auto") next.manual = s.command;
    s = transferController(s, c, next);
    c = next;
    for (let i = 0; i < segment.steps; i++) s = advance(s, c);
    return { config: c, steps: segment.steps, expected: s };
  });
  cases.push({ name, initial, checkpoints });
}
for (const valve of [
  "ball",
  "butterfly",
  "gate",
  "globe",
  "control",
] as ValveId[]) {
  for (const actuator of ["electric", "pneumatic"] as const) {
    const c = {
      ...defaultConfig(valve),
      mode: "auto" as const,
      actuator,
      ...(actuator === "electric"
        ? { timeConstant: 0.8, maxSpeed: 12 }
        : { timeConstant: 0.35, maxSpeed: 35 }),
    };
    scenario(valve + "-" + actuator, c, [
      { patch: {}, steps: 800 },
      { patch: { inlet: 1.5 }, steps: 500 },
      { patch: { setpoint: 30 }, steps: 500 },
    ]);
  }
}
scenario("faults-and-transfer", defaultConfig("control"), [
  { patch: { manual: 100 }, steps: 40 },
  { patch: { fault: "stuck" }, steps: 40 },
  { patch: { fault: "supply" }, steps: 40 },
  { patch: { actuator: "pneumatic", failPosition: 0 }, steps: 240 },
  { patch: { failPosition: 100 }, steps: 240 },
  { patch: { fault: "none", manual: 0 }, steps: 400 },
  { patch: { fault: "leak" }, steps: 20 },
  { patch: { fault: "none" }, steps: 20 },
  { patch: { mode: "auto" }, steps: 800 },
  { patch: { fault: "sensor", sensorBias: 15 }, steps: 800 },
  { patch: { fault: "none" }, steps: 800 },
  { patch: { kp: 1.5, ki: 0.6, kd: 0.1 }, steps: 1 },
  { patch: { mode: "manual" }, steps: 1 },
  { patch: { inlet: 0.5 }, steps: 40 },
]);
scenario("saturation-recovery", { ...defaultConfig("control"), mode: "auto" }, [
  { patch: { inlet: 1.25, setpoint: 150 }, steps: 1600 },
  { patch: { setpoint: 25 }, steps: 1200 },
]);
mkdirSync("output/validation", { recursive: true });
writeFileSync("output/validation/v3-fixtures.json", JSON.stringify(cases));
console.log(
  "Generated " +
    cases.length +
    " independent v2 reference scenarios for actual Simulink execution.",
);
