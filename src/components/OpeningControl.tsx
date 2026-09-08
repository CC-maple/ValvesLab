import type { CSSProperties } from "react";
import type { Valve, ValveState } from "../types";
import { Icon } from "./Icon";

export function OpeningControl({
  valve,
  state,
  onChange,
}: {
  valve: Valve;
  state: ValveState;
  onChange: (opening: number) => void;
}) {
  return (
    <section className="panel control-panel" aria-label="实时参数与控制">
      <div className="panel-heading">
        <h2>开度控制</h2>
        <span className="micro">CONTROL</span>
      </div>
      <div className="opening-heading">
        <label htmlFor="opening">
          阀门开度 <span>Opening</span>
        </label>
        <span className={`state-badge ${state.opening === 0 ? "closed" : ""}`}>
          <i />
          {state.opening === 0
            ? "已关闭"
            : state.opening === 100
              ? "全开"
              : "部分开启"}
        </span>
      </div>
      <div className="opening-value">
        <output htmlFor="opening" data-testid="opening-value">
          {state.opening.toFixed(1)}
        </output>
        <span>%</span>
      </div>
      <input
        id="opening"
        className="opening-slider"
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={state.opening}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--opening": `${state.opening}%` } as CSSProperties}
        aria-label="阀门开度"
        aria-valuetext={`${state.opening.toFixed(1)}%`}
      />
      <div className="range-labels">
        <span>0% · 关闭</span>
        <span>100% · 全开</span>
      </div>
      <div className="presets" aria-label="快捷开度">
        {[0, 25, 50, 75, 100].map((value) => (
          <button
            key={value}
            aria-pressed={state.opening === value}
            onClick={() => onChange(value)}
          >
            {value}%
          </button>
        ))}
      </div>
      <div className="metrics-title">
        <span>实时参数</span>
        <span className="live-text">
          <i />
          实时联动
        </span>
      </div>
      <dl className="metrics">
        <div>
          <dt>
            阀门类型<small>Valve type</small>
          </dt>
          <dd className="metric-type">{valve.nameEN}</dd>
        </div>
        <div>
          <dt>
            {valve.motionType === "rotary" ? "旋转角度" : "归一化升程"}
            <small>Valve position</small>
          </dt>
          <dd data-testid="position-value">
            {(valve.motionType === "rotary"
              ? state.angle
              : state.travel
            ).toFixed(1)}
            <em>{valve.motionType === "rotary" ? "°" : "%"}</em>
          </dd>
        </div>
        <div className="bar-metric">
          <div>
            <dt>
              相对流通面积<small>Relative area</small>
            </dt>
            <dd data-testid="area-value">
              {state.area.toFixed(1)}
              <em>%</em>
            </dd>
          </div>
          <div className="meter">
            <i style={{ width: `${state.area}%` }} />
          </div>
        </div>
        <div className="bar-metric flow-metric">
          <div>
            <dt>
              相对流量<small>Relative flow</small>
            </dt>
            <dd data-testid="flow-value">
              {state.flow.toFixed(1)}
              <em>%</em>
            </dd>
          </div>
          <div className="meter">
            <i style={{ width: `${state.flow}%` }} />
          </div>
        </div>
      </dl>
      <div className="normalization-note">
        <Icon name="info" size={15} />
        <span>各阀按自身全开值归一化，不能据此比较绝对流量。</span>
      </div>
    </section>
  );
}
