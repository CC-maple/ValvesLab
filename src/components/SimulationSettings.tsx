import type { LabPresentation } from "../simulation/presentation";
import { actuatorPresets as actuatorDefaults } from "../simulation/presentation";
import type { SimulationConfig } from "../simulation/types";
const pressureDrop = (c: SimulationConfig) => c.inlet - c.outlet;
import type { FaultType } from "../simulation/types";

export const faultNames: Record<FaultType, string> = {
  none: "无故障",
  stuck: "阀杆卡死",
  supply: "驱动能源中断",
  leak: "阀座泄漏",
  sensor: "传感器偏差",
};
function RangeSetting({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-setting">
      <span>
        {label}
        <output>
          {value.toFixed(step < 1 ? 2 : 0)} <small>{unit}</small>
        </output>
      </span>
      <input
        className="lab-range"
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function SimulationSettings({ lab }: { lab: LabPresentation }) {
  const { config: c, update } = lab;
  return (
    <div className="simulation-settings">
      <section className="panel lab-setting-card">
        <div className="panel-heading">
          <h2>
            <span className="step-number">01</span>执行机构
          </h2>
          <span className="micro">ACTUATOR</span>
        </div>
        <div className="segmented">
          <button
            aria-pressed={c.actuator === "electric"}
            onClick={() =>
              update(
                { actuator: "electric", ...actuatorDefaults.electric },
                "切换电动执行机构",
              )
            }
          >
            电动
          </button>
          <button
            aria-pressed={c.actuator === "pneumatic"}
            onClick={() =>
              update(
                { actuator: "pneumatic", ...actuatorDefaults.pneumatic },
                "切换气动执行机构",
              )
            }
          >
            气动
          </button>
        </div>
        <RangeSetting
          label="响应时间常数"
          value={c.timeConstant}
          min={0.1}
          max={3}
          step={0.05}
          unit="s"
          onChange={(timeConstant) => update({ timeConstant })}
        />
        <RangeSetting
          label="最大行程速度"
          value={c.maxSpeed}
          min={2}
          max={60}
          step={1}
          unit="%/s"
          onChange={(maxSpeed) => update({ maxSpeed })}
        />
        {c.actuator === "pneumatic" ? (
          <label className="select-setting">
            失气位置
            <select
              aria-label="失气位置"
              value={c.failPosition}
              onChange={(e) =>
                update(
                  { failPosition: Number(e.target.value) as 0 | 100 },
                  "修改气动失气位置",
                )
              }
            >
              <option value="0">弹簧复位关闭 FC</option>
              <option value="100">弹簧复位全开 FO</option>
            </select>
          </label>
        ) : (
          <p className="setting-note">
            本例电动机构失电保持原位，不包含备用电源。两类默认速度仅为教学取值。
          </p>
        )}
      </section>
      <section className="panel lab-setting-card">
        <div className="panel-heading">
          <h2>
            <span className="step-number">02</span>压差扰动
          </h2>
          <span className="micro">PRESSURE</span>
        </div>
        <RangeSetting
          label="入口压力"
          value={c.inlet}
          min={0}
          max={4}
          step={0.05}
          unit="bar"
          onChange={(inlet) => update({ inlet })}
        />
        <RangeSetting
          label="出口压力"
          value={c.outlet}
          min={0}
          max={4}
          step={0.05}
          unit="bar"
          onChange={(outlet) => update({ outlet })}
        />
        <div className="pressure-delta">
          <span>
            Δp <small>表压之差</small>
          </span>
          <output data-testid="pressure-delta">
            {pressureDrop(c).toFixed(2)} <small>bar</small>
          </output>
        </div>
        <div className="presets pressure-presets">
          <button
            onClick={() =>
              update({ inlet: 1.25, outlet: 1 }, "压差阶跃至 0.25 bar")
            }
          >
            0.25 bar
          </button>
          <button
            onClick={() => update({ inlet: 2, outlet: 1 }, "压差恢复至 1 bar")}
          >
            1 bar
          </button>
          <button
            onClick={() => update({ inlet: 3, outlet: 1 }, "压差阶跃至 2 bar")}
          >
            2 bar
          </button>
        </div>
        {pressureDrop(c) <= 0 ? (
          <p className="lab-warning">当前无正向压差；本版不模拟反向流动。</p>
        ) : (
          <p className="setting-note">
            固定水样介质 · 基准 1 bar / 100 L/min
            <br />
            相同开度下，流量随压差平方根变化。
          </p>
        )}
      </section>
      <section
        className={`panel lab-setting-card fault-card ${c.fault !== "none" ? "fault-active" : ""}`}
      >
        <div className="panel-heading">
          <h2>
            <span className="step-number">03</span>故障模拟
          </h2>
          <span className="micro">FAULT INJECTION</span>
        </div>
        <label className="select-setting">
          注入故障
          <select
            aria-label="故障类型"
            value={c.fault}
            onChange={(e) => {
              const fault = e.target.value as FaultType;
              update(
                { fault },
                fault === "none" ? "清除故障" : `注入：${faultNames[fault]}`,
              );
            }}
          >
            {Object.entries(faultNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {c.fault === "leak" && (
          <RangeSetting
            label="泄漏系数"
            value={c.leakage * 100}
            min={1}
            max={15}
            step={1}
            unit="%"
            onChange={(leakage) => update({ leakage: leakage / 100 })}
          />
        )}
        {c.fault === "sensor" && (
          <RangeSetting
            label="测量偏差"
            value={c.sensorBias}
            min={-30}
            max={30}
            step={1}
            unit="L/min"
            onChange={(sensorBias) => update({ sensorBias })}
          />
        )}
        <div className="fault-explanation">
          {c.fault === "none"
            ? "每次注入一种故障，观察命令、实际位置和测量结果如何分离。"
            : c.fault === "stuck"
              ? "阀杆锁定在注入时位置。清除后从当前开度恢复跟随。"
              : c.fault === "supply"
                ? c.actuator === "electric"
                  ? "切断电源：本例保持原位；PID 无法通过增加输出恢复驱动。"
                  : "切断气源：单作用执行机构由弹簧返回选定的失气位置。"
                : c.fault === "leak"
                  ? "阀座不再完全密封。即使开度为零，正向压差下仍有泄漏。"
                  : "偏差只加入传感器通道。比较真实流量与 PID 看到的测量流量。"}
        </div>
        <button
          className="clear-fault"
          disabled={c.fault === "none"}
          onClick={() => update({ fault: "none" }, "清除故障")}
        >
          清除故障
        </button>
        <p className="setting-note">教学故障模型，不与任何真实设备连接。</p>
      </section>
    </div>
  );
}
