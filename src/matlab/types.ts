import type { LabEvent, SimulationConfig, SimulationState } from "../simulation/types";

export interface MatlabConfig extends SimulationConfig { sensorTau: number }
export type LessonId = "manual" | "pid" | "pressure" | "sensor" | "fault";
export type WaveGroup = "flow" | "position" | "pid";
export interface Waveform {
  group: WaveGroup; span: number; mode: "live" | "full" | "range";
  yMode: "auto" | "locked"; pidLayout: "split" | "overlay"; from: number; to: number;
}
export interface MatlabEvent extends LabEvent {
  revision: number; acceptedTime: number; appliedTime: number | null;
  phase: "info" | "accepted" | "applied" | "superseded";
}
export interface SavedRun { id: string; name: string; samples: number; duration: number }
export interface MatlabSnapshot {
  protocol: number; release: string; model: string; sequence: number; sessionId: string;
  owner: string; running: boolean; error: string;
  revision: number; appliedRevision: number; appliedTime: number;
  config: MatlabConfig; appliedConfig: MatlabConfig;
  state: SimulationState; capacity: number; sampleCount: number;
  events: MatlabEvent[];
  applied: { setpoint: number; inlet: number; outlet: number };
  runName: string; runId: number; savedRuns: SavedRun[];
  lesson: { id: LessonId | "free"; nextTime: number | null; remaining: number; endTime: number };
  waveform: Waveform;
}
export interface ExportResult { mat?: string; csv?: string; samples?: number; id?: string }
export interface Reply { ok: boolean; service?: string; version?: string; snapshot?: MatlabSnapshot; error?: string; result?: ExportResult }
