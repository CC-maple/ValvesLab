import { useEffect, useRef } from "react";
import type { ValveId, ValveState } from "../domain/types";
import { flowPaths } from "../valves/geometry";

export function FlowAnimation({
  id,
  state,
  playing,
  prefix,
  flowPercent,
}: {
  id: ValveId;
  state: ValveState;
  playing: boolean;
  prefix: string;
  flowPercent?: number;
}) {
  const group = useRef<SVGGElement>(null);
  const offset = useRef(0);
  const flow =
    state.opening === 0
      ? 0
      : Math.min(1, Math.max(0, (flowPercent ?? state.flow) / 100));
  useEffect(() => {
    if (!playing || flow === 0) return;
    let frame: number;
    let previous: number | undefined;
    const update = (now: number) => {
      if (previous !== undefined)
        offset.current -= Math.min(now - previous, 50) * (0.009 + flow * 0.1);
      previous = now;
      group.current?.style.setProperty("--flow-offset", `${offset.current}`);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [flow, playing]);
  if (flow === 0) return null;
  const paths = flowPaths(id, state);
  return (
    <g
      ref={group}
      clipPath={`url(#${prefix}-fluid)`}
      mask={`url(#${prefix}-obstacles)`}
      className="flow-animation"
      data-testid="flow-animation"
      data-playing={playing}
      pointerEvents="none"
    >
      {paths.map((d, i) => (
        <g key={i}>
          <path
            d={d}
            fill="none"
            stroke="#45b8c8"
            strokeWidth="1"
            opacity={0.1 + flow * 0.25}
          />
          <path
            d={d}
            fill="none"
            stroke="#71dfed"
            strokeWidth="3.1"
            strokeLinecap="round"
            strokeDasharray={`2 ${83 - flow * 49}`}
            style={{
              strokeDashoffset: `calc(var(--flow-offset, 0) + ${i * 17})`,
            }}
            opacity={0.45 + flow * 0.5}
          />
        </g>
      ))}
    </g>
  );
}
