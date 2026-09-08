import { useCallback, useEffect, useRef, useState } from "react";
import type {
  LabEvent,
  SimulationConfig,
  TrendPoint,
  ValveId,
} from "../../domain/types";
import {
  advance,
  defaultConfig,
  initialState,
  STEP,
  transferController,
  trendPoint,
  validateConfig,
} from "./engine";

export function useSimulation(valveId: ValveId, active: boolean) {
  const configRef = useRef(defaultConfig(valveId));
  const stateRef = useRef(initialState(configRef.current));
  const pointsRef = useRef<TrendPoint[]>([
    trendPoint(stateRef.current, configRef.current),
  ]);
  const runningRef = useRef(false);
  const eventId = useRef(0);
  const [config, setConfig] = useState(configRef.current);
  const [state, setState] = useState(stateRef.current);
  const [history, setHistory] = useState(pointsRef.current);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<LabEvent[]>([]);
  const event = useCallback(
    (message: string) =>
      setEvents((items) =>
        [
          { id: ++eventId.current, time: stateRef.current.time, message },
          ...items,
        ].slice(0, 12),
      ),
    [],
  );
  const publish = useCallback(() => {
    setState(stateRef.current);
    setHistory([...pointsRef.current]);
  }, []);
  const pause = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    publish();
  }, [publish]);
  const reset = useCallback(() => {
    pause();
    const next = { ...configRef.current, fault: "none" as const };
    configRef.current = next;
    stateRef.current = initialState(next);
    pointsRef.current = [trendPoint(stateRef.current, next)];
    setConfig(next);
    setEvents([]);
    publish();
  }, [pause, publish]);
  useEffect(() => {
    if (configRef.current.valveId === valveId) return;
    configRef.current = defaultConfig(valveId);
    reset();
  }, [valveId, reset]);
  useEffect(() => {
    if (!active) pause();
  }, [active, pause]);

  const tick = useCallback(() => {
    stateRef.current = advance(stateRef.current, configRef.current);
    const points = pointsRef.current;
    if (stateRef.current.time - points[points.length - 1].time >= 0.1999) {
      points.push(trendPoint(stateRef.current, configRef.current));
      if (points.length > 301) points.shift();
    }
  }, []);
  useEffect(() => {
    let frame: number;
    let previous: number | undefined;
    let accumulated = 0;
    let lastPublished = 0;
    const resetClock = () => {
      previous = undefined;
      accumulated = 0;
    };
    document.addEventListener("visibilitychange", resetClock);
    const run = (now: number) => {
      if (!runningRef.current || !active || document.hidden) {
        previous = now;
        accumulated = 0;
      } else {
        if (previous !== undefined)
          accumulated += Math.min((now - previous) / 1000, 0.25);
        previous = now;
        while (accumulated >= STEP) {
          tick();
          accumulated -= STEP;
        }
        if (now - lastPublished >= 100) {
          publish();
          lastPublished = now;
        }
      }
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resetClock);
    };
  }, [active, tick, publish]);

  const update = useCallback(
    (patch: Partial<SimulationConfig>, description?: string) => {
      const previous = configRef.current;
      const next = { ...previous, ...patch };
      if (patch.mode === "manual" && previous.mode === "auto")
        next.manual = stateRef.current.command;
      validateConfig(next);
      stateRef.current = transferController(stateRef.current, previous, next);
      configRef.current = next;
      setConfig(next);
      publish();
      if (description) event(description);
    },
    [event, publish],
  );
  const toggleRunning = useCallback(() => {
    runningRef.current = !runningRef.current;
    setRunning(runningRef.current);
    if (!runningRef.current) publish();
    event(runningRef.current ? "开始运行" : "暂停实验");
  }, [event, publish]);
  const singleStep = useCallback(() => {
    if (!runningRef.current) {
      tick();
      publish();
    }
  }, [tick, publish]);
  return {
    config,
    state,
    history,
    events,
    running,
    update,
    reset,
    toggleRunning,
    singleStep,
  };
}
export type Simulation = ReturnType<typeof useSimulation>;
