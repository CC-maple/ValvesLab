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
