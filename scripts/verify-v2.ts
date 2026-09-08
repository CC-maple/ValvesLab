import assert from "node:assert/strict";
import { evaluateValve } from "../src/models/valveModels.ts";
import { flowLanes } from "../src/valves/geometry.ts";
import {
  advance,
  defaultConfig,
  initialState,
  processFlow,
  transferController,
  validateConfig,
  STEP,
  actuatorDefaults,
} from "../src/legacy/browserSimulation/engine.ts";
import type { ValveId } from "../src/domain/types.ts";
import type {
  SimulationConfig,
  SimulationState,
} from "../src/domain/types.ts";

const ids: ValveId[] = ["ball", "butterfly", "gate", "globe", "control"];
let geometrySamples = 0;
for (const id of ids)
  for (let opening = 1; opening <= 1000; opening++) {
    const lanes = flowLanes(id, evaluateValve(id, opening / 10));
    for (let lane = 0; lane < lanes.length; lane++)
      for (let point = 0; point < lanes[lane].length; point++) {
        const current = lanes[lane][point];
        assert.ok(Number.isFinite(current.x) && Number.isFinite(current.y));
        if (point)
          assert.ok(current.x > lanes[lane][point - 1].x, `${id}: forward x`);
        if (lane)
          assert.ok(
            current.y > lanes[lane - 1][point].y,
            `${id}: ordered streamlines at ${opening / 10}%`,
          );
      }
    geometrySamples++;
  }
const gate795 = flowLanes("gate", evaluateValve("gate", 79.5));
assert.ok(
  gate795[0][64].y < gate795[1][64].y && gate795[1][64].y < gate795[2][64].y,
  "Screenshot regression 79.5%",
);
for (const lane of flowLanes("gate", evaluateValve("gate", 100)))
  assert.ok(
    lane.every((point) => point.y === lane[0].y),
    "Full gate has straight flow lanes",
  );

let dynamicSteps = 0;
function simulate(
  config: SimulationConfig,
  seconds: number,
  state = initialState(config),
): SimulationState {
  validateConfig(config);
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    const previousOpening = state.opening;
    state = advance(state, config);
    for (const value of Object.values(state))
      if (typeof value === "number") assert.ok(Number.isFinite(value));
    assert.ok(state.opening >= 0 && state.opening <= 100);
    assert.ok(state.command >= 0 && state.command <= 100);
    assert.ok(state.trueFlow >= 0 && state.trueFlow <= 200.000001);
    const speed =
      config.fault === "supply" && config.actuator === "pneumatic"
        ? 25
        : config.maxSpeed;
    assert.ok(
      Math.abs(state.opening - previousOpening) <= speed * STEP + 0.001,
      "Actuator rate bound",
    );
    dynamicSteps++;
  }
  return state;
}
const convergence: object[] = [];
for (const id of ids)
  for (const actuator of ["electric", "pneumatic"] as const) {
    const config = {
      ...defaultConfig(id),
      mode: "auto" as const,
      actuator,
      ...actuatorDefaults[actuator],
    };
    const end = simulate(config, 60);
    assert.ok(
      Math.abs(end.measuredFlow - config.setpoint) < 0.5,
      `${id}/${actuator} PID convergence: ${end.measuredFlow}`,
    );
    convergence.push({
      valve: id,
      actuator,
      PV: end.measuredFlow.toFixed(3),
      opening: end.opening.toFixed(3),
    });
  }
let c = defaultConfig("control");
assert.equal(processFlow(c, 50).flow, 50);
assert.equal(
  processFlow({ ...c, inlet: 4, outlet: 0 }, 50).flow,
  100,
  "4x pressure produces 2x flow",
);
assert.equal(
  processFlow({ ...c, inlet: 1, outlet: 1 }, 100).flow,
  0,
  "Equal pressure",
);
assert.equal(
  processFlow({ ...c, inlet: 0, outlet: 2 }, 100).flow,
  0,
  "No reverse-flow model",
);
assert.equal(processFlow(c, 0).flow, 0, "Healthy shutoff");
assert.equal(
  processFlow({ ...c, fault: "leak" }, 0).flow,
  5,
  "Closed seat leakage",
);
assert.equal(
  processFlow({ ...c, fault: "leak", inlet: 1, outlet: 1 }, 0).flow,
  0,
  "No leakage without pressure",
);

const manual = simulate(c, 5);
const automatic = { ...c, mode: "auto" as const, setpoint: 30 };
const transferred = transferController(manual, c, automatic);
assert.ok(
  Math.abs(advance(transferred, automatic).command - manual.command) < 1e-8,
  "Manual to auto bumpless transfer",
);
const changedGains = { ...automatic, kp: 4, ki: 2, kd: 0.5 };
assert.ok(
  Math.abs(
    advance(
      transferController(transferred, automatic, changedGains),
      changedGains,
    ).command - manual.command,
  ) < 1e-8,
  "Gain change output tracking",
);

c = { ...c, manual: 100, maxSpeed: 2 };
const slow = simulate(c, 5, initialState(c, 0));
assert.ok(
  slow.opening <= 10.001 && slow.opening > 9,
  "Manual command respects travel speed",
);
c = { ...defaultConfig("control"), manual: 0, fault: "stuck" };
const stuck = simulate(c, 20);
assert.equal(stuck.opening, 65, "Stuck position");
assert.equal(stuck.command, 0);
assert.equal(
  simulate({ ...c, fault: "none" }, 30, stuck).opening,
  0,
  "Stuck recovery",
);
assert.equal(
  simulate({ ...c, fault: "supply", actuator: "electric" }, 20).opening,
  65,
  "Electric power-loss hold",
);
assert.equal(
  simulate(
    { ...c, fault: "supply", actuator: "pneumatic", failPosition: 0 },
    30,
  ).opening,
  0,
  "Pneumatic fail close",
);
assert.equal(
  simulate(
    { ...c, fault: "supply", actuator: "pneumatic", failPosition: 100 },
    30,
  ).opening,
  100,
  "Pneumatic fail open",
);

c = {
  ...defaultConfig("control"),
  mode: "auto",
  fault: "sensor",
  sensorBias: 15,
};
const biased = simulate(c, 80);
assert.ok(Math.abs(biased.measuredFlow - 60) < 0.5);
assert.ok(
  Math.abs(biased.trueFlow - 45) < 0.5,
  "PID follows biased measurement",
);
const recovered = simulate({ ...c, fault: "none" }, 80, biased);
assert.ok(Math.abs(recovered.trueFlow - 60) < 0.5, "Sensor bias recovery");
c = { ...defaultConfig("control"), mode: "auto" };
const settled = simulate(c, 50);
const disturbed = simulate({ ...c, inlet: 1.5 }, 80, settled);
assert.ok(
  Math.abs(disturbed.measuredFlow - 60) < 0.5,
  "Pressure disturbance rejection",
);
const saturatedConfig = { ...c, setpoint: 150, inlet: 1.25 };
const saturated = simulate(saturatedConfig, 120);
assert.ok(
  saturated.command > 99.9 && saturated.saturated && saturated.integrationHeld,
);
assert.ok(
  Math.abs(saturated.integral) < 500,
  "No integral windup during saturation",
);
const reachable = simulate({ ...saturatedConfig, setpoint: 25 }, 80, saturated);
assert.ok(
  Math.abs(reachable.measuredFlow - 25) < 0.5,
  "Recovers from saturation",
);
const blocked = simulate({ ...c, fault: "stuck", setpoint: 100 }, 180);
assert.ok(
  Math.abs(blocked.integral) < 500,
  "Bounded integral under persistent fault",
);

assert.throws(() => validateConfig({ ...c, kp: NaN }), RangeError);
assert.throws(() => validateConfig({ ...c, inlet: 5 }), RangeError);
assert.throws(() => advance(initialState(c), c, 0), RangeError);
assert.throws(() => advance(initialState(c), c, 1), RangeError);
console.log(
  `PASS: ${geometrySamples} streamline configurations, screenshot regression, ${dynamicSteps} dynamic steps, actuator/PID/pressure/fault/transfer checks.`,
);
console.table(convergence);
