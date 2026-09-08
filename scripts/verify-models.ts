import assert from "node:assert/strict";
import {
  evaluateValve,
  constrainOpening,
  sampleCurve,
} from "../src/models/valveModels.ts";
import type { ValveId } from "../src/domain/types.ts";

const ids: ValveId[] = ["ball", "butterfly", "gate", "globe", "control"];
let samples = 0;
for (const id of ids) {
  assert.equal(evaluateValve(id, 0).flow, 0, `${id}: shutoff flow`);
  assert.equal(evaluateValve(id, 0).area, 0, `${id}: shutoff area`);
  assert.equal(evaluateValve(id, 100).flow, 100, `${id}: full flow`);
  assert.equal(evaluateValve(id, 100).area, 100, `${id}: full area`);
  let previousFlow = -1;
  let previousArea = -1;
  for (let index = 0; index <= 1000; index++) {
    const state = evaluateValve(id, index / 10);
    assert.ok(
      Object.values(state).every(Number.isFinite),
      `${id}: finite output`,
    );
    assert.ok(
      state.flow >= previousFlow && state.area >= previousArea,
      `${id}: monotonic`,
    );
    assert.ok(
      state.flow >= 0 &&
        state.flow <= 100 &&
        state.area >= 0 &&
        state.area <= 100,
      `${id}: bounded`,
    );
    assert.ok(
      Math.abs(state.angle - state.opening * 0.9) < 1e-10,
      `${id}: angle`,
    );
    assert.equal(state.travel, state.opening, `${id}: normalized travel`);
    if (index > 0)
      assert.ok(state.flow - previousFlow < 0.21, `${id}: continuous`);
    previousFlow = state.flow;
    previousArea = state.area;
    samples++;
  }
  assert.equal(sampleCurve(id).length, 101);
  assert.equal(evaluateValve(id, -2).flow, 0);
  assert.equal(evaluateValve(id, 101).flow, 100);
}
assert.equal(
  new Set(ids.map((id) => evaluateValve(id, 50).flow.toFixed(6))).size,
  5,
  "Five distinct curves",
);
assert.equal(evaluateValve("control", 37.4).flow, 37.4, "Linear control trim");
assert.ok(evaluateValve("gate", 25).flow > 25, "Front-loaded gate response");
assert.ok(
  evaluateValve("ball", 25).flow < 25,
  "Small ball flow at low opening",
);
assert.ok(
  evaluateValve("butterfly", 25).flow < 25,
  "Nonlinear butterfly response",
);
for (const value of [NaN, Infinity, -Infinity])
  assert.throws(() => constrainOpening(value), RangeError);
console.log(
  `PASS: ${samples} samples, 5 distinct curves, endpoints, monotonicity, bounds, continuity, motion, invalid inputs.`,
);
console.table(
  ids.map((id) => ({
    valve: id,
    area50: evaluateValve(id, 50).area.toFixed(2),
    flow50: evaluateValve(id, 50).flow.toFixed(2),
  })),
);
