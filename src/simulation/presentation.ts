import type { SimulationConfig, SimulationState } from "./types";
// Shared view contract. It does not own or advance a simulation.
export interface LabPresentation {
  config: SimulationConfig;
  state: SimulationState;
  update: (patch: Partial<SimulationConfig>, description?: string) => void;
}
export const actuatorPresets = {
  electric: { timeConstant: 0.8, maxSpeed: 12 },
  pneumatic: { timeConstant: 0.35, maxSpeed: 35 },
};
