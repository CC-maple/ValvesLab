import { useState } from "react";
import type { ComponentType } from "react";
import type {
  PartId,
  Valve,
  ValveState,
  ValveId,
  ValveDrawingProps,
} from "../domain/types";
import BallValve from "../valves/BallValve";
import ButterflyValve from "../valves/ButterflyValve";
import GateValve from "../valves/GateValve";
import GlobeValve from "../valves/GlobeValve";
import ControlValve from "../valves/ControlValve";
import { DrawingDefs } from "../valves/shared";
import { Icon } from "./Icon";
import { FlowAnimation } from "./FlowAnimation";
import { PartTooltip } from "./PartTooltip";
import { PartLabels } from "./PartLabels";

const drawings: Record<ValveId, ComponentType<ValveDrawingProps>> = {
  ball: BallValve,
  butterfly: ButterflyValve,
  gate: GateValve,
  globe: GlobeValve,
  control: ControlValve,
};

export function ValveViewer({
  valve,
  state,
  flowPercent,
  simulationRunning,
}: {
  valve: Valve;
  state: ValveState;
  flowPercent?: number;
  simulationRunning?: boolean;
}) {
  const [activePart, setActivePart] = useState<PartId | null>(null);
  const [labels, setLabels] = useState(true);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const prefix = `valve-${valve.id}`;
  const Drawing = drawings[valve.id];
  const animated = playing && (simulationRunning ?? true);
  const hasFlow = state.opening > 0 && (flowPercent ?? state.flow) > 0;
  return (
    <section className="panel viewer-panel">
      <div className="viewer-heading">
        <div>
          <span className="section-eyebrow">
            结构观察 <span>SECTION VIEW</span>
          </span>
          <h2>
            {valve.nameCN}
            <span>{valve.nameEN}</span>
          </h2>
        </div>
        <div className="viewer-tools">
          <button
            onClick={() => setLabels(!labels)}
            aria-label={labels ? "隐藏零件标注" : "显示零件标注"}
            aria-pressed={labels}
          >
            <Icon name="label" />
            <span>标注</span>
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "暂停流动动画" : "播放流动动画"}
            aria-pressed={!playing}
          >
            <Icon name={playing ? "pause" : "play"} />
          </button>
        </div>
      </div>
      <div className="valve-canvas">
        <div className="canvas-meta">
          <span className="view-tag">
            {valve.id === "ball"
              ? "俯视剖面 · 阀杆轴垂直画面"
              : "纵向剖面 · 结构示意"}
          </span>
          <span className="canvas-scale">SCHEMATIC / NOT TO SCALE</span>
        </div>
        <svg
          className="valve-drawing"
          viewBox={
            valve.id === "gate"
              ? "0 -95 760 525"
              : valve.id === "globe"
                ? "0 -35 760 465"
                : "0 0 760 430"
          }
          role="group"
          aria-label={`${valve.nameCN}内部结构，开度 ${state.opening.toFixed(1)}%`}
        >
          <DrawingDefs prefix={prefix} />
          <path d="M35 248H725" className="centerline" />
          <Drawing
            state={state}
            activePart={activePart}
            onPart={setActivePart}
            prefix={prefix}
          />
          <FlowAnimation
            id={valve.id}
            state={state}
            playing={animated}
            flowPercent={flowPercent}
            prefix={prefix}
          />
          <g className="flow-direction">
            <path d="M158 355h51m-7-5 7 5-7 5M551 355h51m-7-5 7 5-7 5" />
            <text x="158" y="378">
              入口 INLET
            </text>
            <text x="542" y="378">
              出口 OUTLET
            </text>
          </g>
          {labels && <PartLabels valve={valve} state={state} />}
        </svg>
        <div className="canvas-bottom">
          <div className="legend">
            <span>
              <i className="metal" />
              阀体
            </span>
            <span>
              <i className="orange" />
              运动件
            </span>
            <span>
              <i className="cyan" />
              流体
            </span>
          </div>
          <span className="live-text">
            <i className={!hasFlow || !animated ? "inactive" : ""} />
            {state.opening === 0
              ? "流道关闭"
              : !hasFlow
                ? "无正向流动"
                : animated
                  ? "流动演示中"
                  : "流动已暂停"}
          </span>
        </div>
      </div>
      <PartTooltip part={valve.parts.find((p) => p.id === activePart)} />
      <div className="structure-description">
        <span>工作原理</span>
        <p>{valve.description}</p>
      </div>
      <p className="fluid-disclaimer">
        流体动画为概念性示意，并非 CFD 数值仿真。
      </p>
    </section>
  );
}
