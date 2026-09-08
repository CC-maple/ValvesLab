import { useMemo } from "react";
import type { Valve, ValveState } from "../domain/types";
import { modelFormulas, sampleCurve } from "../models/valveModels";

export function FlowCurve({
  valve,
  state,
}: {
  valve: Valve;
  state: ValveState;
}) {
  const curve = useMemo(() => sampleCurve(valve.id), [valve.id]);
  const x = (v: number) => 57 + v * 4.66;
  const y = (v: number) => 194 - v * 1.48;
  const d = curve
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(v.opening)} ${y(v.flow)}`)
    .join(" ");
  return (
    <section className="panel curve-panel">
      <div className="panel-heading">
        <div>
          <h2>开度—相对流量特性</h2>
          <span className="micro">FLOW CHARACTERISTIC</span>
        </div>
        <span className="curve-key">
          <i />
          {valve.nameCN}
        </span>
      </div>
      <svg
        className="flow-chart"
        viewBox="0 0 570 254"
        role="img"
        aria-label={`${valve.nameCN}流量特性曲线，当前开度 ${state.opening.toFixed(1)}%，相对流量 ${state.flow.toFixed(1)}%`}
      >
        <defs>
          <linearGradient id="curve-fill" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#58d3be" stopOpacity=".16" />
            <stop offset="1" stopColor="#58d3be" stopOpacity="0" />
          </linearGradient>
        </defs>
        <text x="57" y="19" className="axis-heading">
          相对流量 / Relative flow (%)
        </text>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <path d={`M57 ${y(v)}H523M${x(v)} 46V194`} className="chart-grid" />
            <text x="42" y={y(v) + 4} textAnchor="end" className="chart-label">
              {v}
            </text>
            <text x={x(v)} y="215" textAnchor="middle" className="chart-label">
              {v}
            </text>
          </g>
        ))}
        <path d="M57 46V194H523" className="chart-axis" />
        <path
          d="M57 194L523 46"
          stroke="#637381"
          strokeDasharray="4 6"
          opacity=".42"
          fill="none"
        />
        <path d={`${d}L523 194H57Z`} fill="url(#curve-fill)" />
        <path
          d={d}
          fill="none"
          stroke="#69d6c1"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <path
          d={`M${x(state.opening)} 194V${y(state.flow)}H57`}
          fill="none"
          stroke="#72d3c0"
          strokeDasharray="4 4"
          opacity=".5"
        />
        <circle
          cx={x(state.opening)}
          cy={y(state.flow)}
          r="11"
          fill="#6ae0c8"
          fillOpacity=".1"
        />
        <circle
          data-testid="curve-point"
          cx={x(state.opening)}
          cy={y(state.flow)}
          data-opening={state.opening}
          data-flow={state.flow}
          r="5"
          fill="#70e2ca"
          stroke="#152c32"
          strokeWidth="2"
        />
        <text
          x={Math.max(111, Math.min(465, x(state.opening)))}
          y={Math.max(35, y(state.flow) - 18)}
          textAnchor="middle"
          className="point-label"
        >
          {state.opening.toFixed(1)}%, {state.flow.toFixed(1)}%
        </text>
        <text x="291" y="243" textAnchor="middle" className="axis-heading">
          阀门开度 / Valve opening (%)
        </text>
      </svg>
      <div className="curve-caption">
        <code>{modelFormulas[valve.id]}</code>
        <span>h：归一化开度 · q：归一化流量</span>
      </div>
      <p className="model-disclaimer">
        虚线为线性参考。曲线为简化教学模型，不代表具体工业阀门的精确流量特性。
      </p>
    </section>
  );
}
