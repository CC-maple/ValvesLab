import type { Simulation } from "../legacy/browserSimulation/useSimulation";
import type { Valve } from "../domain/types";
import { Icon } from "./Icon";
import { ActuatorView } from "./ActuatorView";
import { TrendChart } from "./TrendChart";
import { SimulationSettings, faultNames } from "./SimulationSettings";

export function SimulationToolbar({ lab }: { lab: Simulation }) {
  return (
    <div className="simulation-toolbar">
      <div>
        <span className={`lab-status ${lab.running ? "running" : ""}`}>
          <i />
          {lab.running ? "实验运行中" : "实验已暂停"}
        </span>
        <span className="simulation-hint">
          {lab.running
            ? "实时观察响应；页面隐藏时物理时间暂停。"
            : "配置在下一步生效。可以单步推进 0.05 秒。"}
        </span>
      </div>
      <div className="simulation-actions">
        <button className="run-button" onClick={lab.toggleRunning}>
          <Icon name={lab.running ? "pause" : "play"} size={16} />
          {lab.running ? "暂停实验" : "开始实验"}
        </button>
        <button disabled={lab.running} onClick={lab.singleStep}>
          单步 +0.05s
        </button>
        <button onClick={lab.reset}>
          <Icon name="reset" size={15} />
          重置实验
        </button>
      </div>
    </div>
  );
}
export function SignalChain({ lab }: { lab: Simulation }) {
  const { state: s, config: c } = lab;
  return (
    <div className="signal-chain" aria-label="闭环信号链">
      {[
        [
          c.mode === "auto" ? "目标流量 SP" : "手动命令",
          `${(c.mode === "auto" ? c.setpoint : c.manual).toFixed(1)} ${c.mode === "auto" ? "L/min" : "%"}`,
        ],
        [
          c.mode === "auto" ? "PID 输出 u" : "开度命令 u",
          `${s.command.toFixed(1)} %`,
        ],
        ["执行机构 x", `${s.opening.toFixed(1)} %`],
        ["真实流量 Q", `${s.trueFlow.toFixed(1)} L/min`],
        ["传感器 PV", `${s.measuredFlow.toFixed(1)} L/min`],
      ].map(([label, value], i) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          {i < 4 && <Icon name="arrow" size={17} />}
        </div>
      ))}
    </div>
  );
}
export function SimulationWorkspace({
  lab,
  valve,
}: {
  lab: Simulation;
  valve: Valve;
}) {
  return (
    <div className="simulation-workspace">
      <SignalChain lab={lab} />
      <div className="lab-middle">
        <TrendChart lab={lab} />
        <section className="panel actuator-panel">
          <div className="panel-heading">
            <h2>执行机构反馈</h2>
            <span className="micro">FEEDBACK</span>
          </div>
          <ActuatorView lab={lab} valve={valve} />
          <div
            className={`fault-status ${lab.config.fault !== "none" ? "warning" : ""}`}
          >
            <i />
            {faultNames[lab.config.fault]}
          </div>
          <div className="event-log">
            <h3>
              实验事件 <span>仿真时间</span>
            </h3>
            {lab.events.length ? (
              <ol>
                {lab.events.map((event) => (
                  <li key={event.id}>
                    <time>{event.time.toFixed(2)} s</time>
                    <span>{event.message}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p>配置切换与故障操作将记录在这里。</p>
            )}
          </div>
        </section>
      </div>
      <SimulationSettings lab={lab} />
      <p className="lab-model-note">
        教学模型：固定水样介质，基准 1 bar / 100
        L/min；压差采用准稳态关系，传感器包含 0.2 s
        延迟。不模拟气蚀、反向流动或真实设备安全联锁。
      </p>
      {(valve.id === "gate" || valve.id === "ball") && (
        <p className="lab-model-note valve-caution">
          普通{valve.nameCN}
          在本实验中用于比较结构对闭环响应的影响，不据此推荐长期连续节流。
        </p>
      )}
    </div>
  );
}
