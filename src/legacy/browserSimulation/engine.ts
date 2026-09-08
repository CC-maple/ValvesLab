import { evaluateValve } from "../../models/valveModels.ts";
import type {
  SimulationConfig,
  SimulationState,
  TrendPoint,
  ValveId,
} from "../../domain/types.ts";

export const STEP = 0.05;
export const REFERENCE_FLOW = 100; // L/min at 1 bar, illustrative shared rating.
export const SENSOR_TAU = 0.2;
export const DERIVATIVE_TAU = 0.15;
export const actuatorDefaults = {
  electric: { timeConstant: 0.8, maxSpeed: 12 },
  pneumatic: { timeConstant: 0.35, maxSpeed: 35 },
};
const clamp = (x: number, low = 0, high = 100) =>
  Math.min(high, Math.max(low, x));
export const pressureDrop = (config: SimulationConfig) =>
  config.inlet - config.outlet;
export const capacity = (config: SimulationConfig) =>
  REFERENCE_FLOW * Math.sqrt(Math.max(0, pressureDrop(config)));

export function defaultConfig(valveId: ValveId): SimulationConfig {
  return {
    valveId,
    mode: "manual",
    manual: 65,
    setpoint: 60,
    kp: 1.1,
    ki: 0.55,
    kd: 0.04,
    actuator: "electric",
    ...actuatorDefaults.electric,
    failPosition: 0,
    inlet: 2,
    outlet: 1,
    fault: "none",
    leakage: 0.05,
    sensorBias: 15,
  };
}

export function validateConfig(config: SimulationConfig): void {
  const ranges: [keyof SimulationConfig, number, number][] = [
    ["manual", 0, 100],
    ["setpoint", 0, 150],
    ["kp", 0, 5],
    ["ki", 0, 3],
    ["kd", 0, 1],
    ["timeConstant", 0.1, 3],
    ["maxSpeed", 2, 60],
    ["inlet", 0, 4],
    ["outlet", 0, 4],
    ["leakage", 0.01, 0.15],
    ["sensorBias", -30, 30],
  ];
  for (const [key, low, high] of ranges) {
    const value = config[key];
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < low ||
      value > high
    )
      throw new RangeError(`Invalid ${key}`);
  }
  if (
    !["ball", "butterfly", "gate", "globe", "control"].includes(
      config.valveId,
    ) ||
    !["manual", "auto"].includes(config.mode) ||
    !["electric", "pneumatic"].includes(config.actuator) ||
    !["none", "stuck", "supply", "leak", "sensor"].includes(config.fault) ||
    ![0, 100].includes(config.failPosition)
  )
    throw new RangeError("Invalid simulation configuration");
}

export function processFlow(
  config: SimulationConfig,
  opening: number,
): { flow: number; leak: number } {
  const characteristic = evaluateValve(config.valveId, opening).flow / 100;
  const leakage = config.fault === "leak" ? config.leakage : 0;
  const leak = capacity(config) * leakage * (1 - characteristic);
  return { flow: capacity(config) * characteristic + leak, leak };
}

export function initialState(
  config: SimulationConfig,
  opening = 65,
): SimulationState {
  validateConfig(config);
  if (!Number.isFinite(opening) || opening < 0 || opening > 100)
    throw new RangeError("Invalid initial opening");
  const process = processFlow(config, opening);
  const pv = Math.max(
    0,
    process.flow + (config.fault === "sensor" ? config.sensorBias : 0),
  );
  const command = config.mode === "manual" ? config.manual : opening;
  const p = config.kp * (config.setpoint - pv);
  const integral = command - p;
  return {
    time: 0,
    opening,
    command,
    trueFlow: process.flow,
    measuredFlow: pv,
    leakFlow: process.leak,
    integral,
    derivative: 0,
    previousPV: pv,
    p,
    i: integral,
    d: 0,
    error: config.setpoint - pv,
    saturated: false,
    integrationHeld: false,
    holdController: true,
  };
}

export function transferController(
  state: SimulationState,
  previous: SimulationConfig,
  next: SimulationConfig,
): SimulationState {
  validateConfig(next);
  const changed =
    previous.mode !== next.mode ||
    previous.kp !== next.kp ||
    previous.ki !== next.ki ||
    previous.kd !== next.kd;
  if (!changed) return state;
  const p = next.kp * (next.setpoint - state.measuredFlow);
  const d = -next.kd * state.derivative;
  const integral = state.command - p - d;
  return { ...state, p, d, integral, i: integral, holdController: true };
}

export function advance(
  state: SimulationState,
  config: SimulationConfig,
  dt = STEP,
): SimulationState {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1)
    throw new RangeError("Step must be in (0, 0.1] seconds");
  const error = config.setpoint - state.measuredFlow;
  const derivative = state.holdController
    ? state.derivative
    : state.derivative +
      ((state.measuredFlow - state.previousPV) / dt - state.derivative) *
        (1 - Math.exp(-dt / DERIVATIVE_TAU));
  const p = config.kp * error;
  const d = -config.kd * derivative;
  let integral = state.integral;
  const blocked = config.fault === "stuck" || config.fault === "supply";
  let integrationHeld = blocked || state.holdController;
  if (config.mode === "auto" && !integrationHeld) {
    const candidate = integral + config.ki * error * dt;
    const raw = p + candidate + d;
    integrationHeld = (raw > 100 && error > 0) || (raw < 0 && error < 0);
    if (!integrationHeld) integral = clamp(candidate, -2000, 2000);
    // Permit the final partial integral increment up to the output boundary.
    // Rejecting the entire increment would leave a persistent undershoot of 100%.
    else if (raw > 100 && p + integral + d < 100) integral = 100 - p - d;
    else if (raw < 0 && p + integral + d > 0) integral = -p - d;
  }
  if (config.mode === "manual") integral = config.manual - p - d;
  const raw = p + integral + d;
  const command = config.mode === "manual" ? config.manual : clamp(raw);

  let opening = state.opening;
  const holdPosition =
    config.fault === "stuck" ||
    (config.fault === "supply" && config.actuator === "electric");
  if (!holdPosition) {
    const springReturn =
      config.fault === "supply" && config.actuator === "pneumatic";
    const target = springReturn ? config.failPosition : command;
    const tau = springReturn ? 0.6 : config.timeConstant;
    const rate = springReturn ? 25 : config.maxSpeed;
    const delta = (target - opening) * (1 - Math.exp(-dt / tau));
    opening = clamp(opening + clamp(delta, -rate * dt, rate * dt));
    if (Math.abs(target - opening) < 0.001) opening = target;
  }
  const process = processFlow(config, opening);
  const sensorTarget = Math.max(
    0,
    process.flow + (config.fault === "sensor" ? config.sensorBias : 0),
  );
  const measuredFlow =
    state.measuredFlow +
    (sensorTarget - state.measuredFlow) * (1 - Math.exp(-dt / SENSOR_TAU));
  return {
    time: state.time + dt,
    opening,
    command,
    trueFlow: process.flow,
    leakFlow: process.leak,
    measuredFlow,
    integral,
    derivative,
    previousPV: state.measuredFlow,
    p,
    i: integral,
    d,
    error: config.setpoint - measuredFlow,
    saturated:
      raw < 0 ||
      raw > 100 ||
      (command >= 99.99 && error > 0.1) ||
      (command <= 0.01 && error < -0.1),
    integrationHeld,
    holdController: false,
  };
}

export const trendPoint = (
  state: SimulationState,
  config: SimulationConfig,
): TrendPoint => ({
  time: state.time,
  setpoint: config.setpoint,
  trueFlow: state.trueFlow,
  measuredFlow: state.measuredFlow,
  command: state.command,
  opening: state.opening,
});
