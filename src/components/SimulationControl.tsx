import type { LabPresentation } from "../domain/types";

export function SimulationControl({
  lab,
  capacity,
}: {
  lab: LabPresentation;
  capacity: number;
}) {
  const { config: c, state: s, update } = lab;
  const auto = c.mode === "auto";
  return (
    <section className="panel simulation-control" aria-label="闭环控制面板">
      <div className="panel-heading">
        <h2>流量控制</h2>
        <span className="micro">FLOW CONTROL</span>
      </div>
      <div className="segmented control-mode" aria-label="控制方式">
        <button
          aria-pressed={!auto}
          onClick={() => update({ mode: "manual" }, "切换为手动控制")}
        >
          手动指令
        </button>
        <button
          aria-pressed={auto}
          onClick={() => update({ mode: "auto" }, "切换为 PID 自动控制")}
        >
          PID 自动
        </button>
      </div>
      <div className="command-label">
        <label htmlFor="lab-command">
          {auto ? "目标流量 SP" : "命令开度 u"}
        </label>
        <span>{auto ? "L/min" : "%"}</span>
      </div>
      <div className="command-value">
        <output htmlFor="lab-command" data-testid="lab-target">
          {(auto ? c.setpoint : c.manual).toFixed(1)}
        </output>
        <span>{auto ? "L/min" : "%"}</span>
      </div>
      <input
        id="lab-command"
        className="lab-range"
        type="range"
        min="0"
        max={auto ? 150 : 100}
        step="0.1"
        aria-label={auto ? "目标流量" : "命令开度"}
        value={auto ? c.setpoint : c.manual}
        onChange={(e) =>
          update(
            auto
              ? { setpoint: Number(e.target.value) }
              : { manual: Number(e.target.value) },
          )
        }
      />
      <div className="range-labels">
        <span>0</span>
        <span>{auto ? "150 L/min" : "100%"}</span>
      </div>
      <div className="presets">
        {(auto ? [30, 60, 90] : [0, 50, 100]).map((value) => (
          <button
            key={value}
            onClick={() =>
              update(
                auto ? { setpoint: value } : { manual: value },
                auto ? `设定目标流量 ${value} L/min` : `手动命令 ${value}%`,
              )
            }
          >
            {value}
            {auto ? "" : "%"}
          </button>
        ))}
      </div>
      <dl className="lab-readings">
        <div>
          <dt>
            实际开度 <small>Position feedback</small>
          </dt>
          <dd data-testid="lab-opening">
            {s.opening.toFixed(1)}
            <small>%</small>
          </dd>
        </div>
        <div className="true-reading">
          <dt>
            真实流量 <small>Process flow</small>
          </dt>
          <dd data-testid="lab-true-flow">
            {s.trueFlow.toFixed(1)}
            <small>L/min</small>
          </dd>
        </div>
        <div className="measured-reading">
          <dt>
            测量流量 PV <small>Sensor feedback</small>
          </dt>
          <dd data-testid="lab-measured-flow">
            {s.measuredFlow.toFixed(1)}
            <small>L/min</small>
          </dd>
        </div>
        <div>
          <dt>
            开度命令 <small>Controller output</small>
          </dt>
          <dd data-testid="lab-output">
            {s.command.toFixed(1)}
            <small>%</small>
          </dd>
        </div>
      </dl>
      {auto && (
        <div className="pid-settings">
          <div className="panel-heading">
            <h3>PID 参数</h3>
            <span className="micro">并联形式</span>
          </div>
          <div className="pid-inputs">
            {(["kp", "ki", "kd"] as const).map((key, i) => (
              <label key={key}>
                {["Kp", "Ki", "Kd"][i]}
                <input
                  aria-label={["Kp", "Ki", "Kd"][i]}
                  type="number"
                  min="0"
                  max={[5, 3, 1][i]}
                  step="0.01"
                  value={c[key]}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 0 && n <= [5, 3, 1][i])
                      update({ [key]: n });
                  }}
                />
              </label>
            ))}
          </div>
          <div className="pid-terms">
            <span>
              P <b>{s.p.toFixed(1)}</b>
            </span>
            <span>
              I <b>{s.i.toFixed(1)}</b>
            </span>
            <span>
              D <b>{s.d.toFixed(1)}</b>
            </span>
          </div>
          <p>
            测量值微分 · 条件积分抗饱和
            <br />
            误差单位 L/min，输出单位 %，时间单位 s。
          </p>
          <div className="controller-status" data-testid="controller-status">
            {s.integrationHeld ? "积分保持" : "积分更新"} ·{" "}
            {s.saturated ? "输出受限" : "输出未饱和"}
          </div>
          {c.setpoint > capacity + 0.1 && (
            <p className="lab-warning">
              当前压差下全开仅约 {capacity.toFixed(1)} L/min，目标超出通流能力。
            </p>
          )}
        </div>
      )}
      {!auto && (
        <p className="control-hint">
          拖动的是执行机构命令。实际开度会按响应时间与速度限制逐步跟随。
        </p>
      )}
    </section>
  );
}
