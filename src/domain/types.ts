export type ValveId = "ball" | "butterfly" | "gate" | "globe" | "control";
export type PartId = "body" | "stem" | "seat" | "closure";
export interface ValvePart {
  id: PartId;
  nameCN: string;
  nameEN: string;
  description: string;
}
export interface Valve {
  id: ValveId;
  nameCN: string;
  nameEN: string;
  category: string;
  motionType: "rotary" | "linear";
  applications: string;
  description: string;
  observation: string;
  ability: string;
  feature: string;
  flowCharacteristic: string;
  parts: ValvePart[];
}
export interface ValveState {
  opening: number;
  fraction: number;
  area: number;
  flow: number;
  angle: number;
  travel: number;
}
export interface ValveDrawingProps {
  state: ValveState;
  activePart: PartId | null;
  onPart: (id: PartId | null) => void;
  prefix: string;
}

export type ActuatorType = "electric" | "pneumatic";
export type FaultType = "none" | "stuck" | "supply" | "leak" | "sensor";
export interface SimulationConfig {
  valveId: ValveId;
  mode: "manual" | "auto";
  manual: number;
  setpoint: number;
  kp: number;
  ki: number;
  kd: number;
  actuator: ActuatorType;
  timeConstant: number;
  maxSpeed: number;
  failPosition: 0 | 100;
  inlet: number;
  outlet: number;
  fault: FaultType;
  leakage: number;
  sensorBias: number;
}
export interface SimulationState {
  time: number;
  opening: number;
  command: number;
  trueFlow: number;
  measuredFlow: number;
  leakFlow: number;
  integral: number;
  derivative: number;
  previousPV: number;
  p: number;
  i: number;
  d: number;
  error: number;
  saturated: boolean;
  integrationHeld: boolean;
  holdController: boolean;
}
export interface TrendPoint {
  time: number;
  setpoint: number;
  trueFlow: number;
  measuredFlow: number;
  command: number;
  opening: number;
}
export interface LabEvent {
  id: number;
  time: number;
  message: string;
}
export interface LabPresentation {
  config: SimulationConfig;
  state: SimulationState;
  update: (patch: Partial<SimulationConfig>, description?: string) => void;
}
