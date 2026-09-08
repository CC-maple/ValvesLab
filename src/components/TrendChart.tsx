import type { Simulation } from "../simulation/useSimulation";
import type { TrendPoint } from "../simulation/types";
import { trendPoint } from "../simulation/engine";

export function TrendChart({ lab }: { lab: Simulation }) {
  const { state: s, config: c, history, events } = lab;
  const start = Math.max(0, s.time - 60);
  const end = Math.max(60, s.time);
  const points = [...history, trendPoint(s, c)].filter((p) => p.time >= start);
  const x = (time: number) => 55 + ((time - start) / (end - start)) * 670;
  const flowY = (flow: number) => 169 - (flow / 250) * 138;
  const positionY = (v: number) => 105 - v * 0.78;
  const path = (key: keyof TrendPoint, y: (v: number) => number) =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${x(p.time).toFixed(2)} ${y(p[key]).toFixed(2)}`,
      )
      .join(" ");
  const times = Array.from(
    { length: 7 },
    (_, i) => start + ((end - start) * i) / 6,
  );
  return (
    <section className="panel trend-panel">
      <div className="panel-heading">
        <div>
          <h2>闭环响应</h2>
          <p>流量与位置分别显示 · 最近 60 秒</p>
        </div>
        <span className="time-readout" data-testid="simulation-time">
          {s.time.toFixed(2)} <small>s</small>
        </span>
      </div>
      <div className="trend-legend">
        <span className="sp-key">目标 SP</span>
        <span className="flow-key">真实流量</span>
        <span className="pv-key">测量 PV</span>
        <span className="command-key">开度命令</span>
        <span className="position-key">实际开度</span>
      </div>
      <svg
        className="trend-svg"
        viewBox="0 0 760 202"
        role="img"
        aria-label="最近60秒目标、真实流量与测量流量趋势"
      >
        <text x="55" y="16" className="axis-heading">
          流量 (L/min)
        </text>
        {[0, 50, 100, 150, 200, 250].map((value) => (
          <g key={value}>
            <path className="chart-grid" d={`M55 ${flowY(value)}H725`} />
            <text
              className="chart-label"
              x="43"
              y={flowY(value) + 4}
              textAnchor="end"
            >
              {value}
            </text>
          </g>
        ))}
        {times.map((t) => (
          <g key={t}>
            <path className="chart-grid" d={`M${x(t)} 31V169`} />
            <text x={x(t)} y="191" className="chart-label" textAnchor="middle">
              {t.toFixed(0)} s
            </text>
          </g>
        ))}
        {events
          .filter((e) => e.time >= start && e.time <= s.time)
          .map((e) => (
            <path
              key={e.id}
              d={`M${x(e.time)} 31V169`}
              stroke="#ae8762"
              strokeDasharray="2 6"
              opacity=".2"
            >
              <title>{e.message}</title>
            </path>
          ))}
        <path d={path("setpoint", flowY)} className="trend-line sp-line" />
        <path d={path("trueFlow", flowY)} className="trend-line flow-line" />
        <path d={path("measuredFlow", flowY)} className="trend-line pv-line" />
        {s.time < 0.1 && (
          <text x="390" y="98" textAnchor="middle" className="empty-trend">
            点击开始实验，或单步观察系统响应
          </text>
        )}
      </svg>
      <svg
        className="trend-svg position-trend"
        viewBox="0 0 760 133"
        role="img"
        aria-label="最近60秒开度命令与执行机构实际开度趋势"
      >
        <text x="55" y="14" className="axis-heading">
          开度 (%)
        </text>
        {[0, 50, 100].map((value) => (
          <g key={value}>
            <path className="chart-grid" d={`M55 ${positionY(value)}H725`} />
            <text
              className="chart-label"
              x="43"
              y={positionY(value) + 4}
              textAnchor="end"
            >
              {value}
            </text>
          </g>
        ))}
        {times.map((t) => (
          <g key={t}>
            <path className="chart-grid" d={`M${x(t)} 27V105`} />
            <text x={x(t)} y="126" className="chart-label" textAnchor="middle">
              {t.toFixed(0)} s
            </text>
          </g>
        ))}
        <path
          d={path("command", positionY)}
          className="trend-line command-line"
        />
        <path
          d={path("opening", positionY)}
          className="trend-line position-line"
        />
      </svg>
      <div className="trend-summary">
        <span>
          跟踪误差{" "}
          <b data-testid="tracking-error">{s.error.toFixed(2)} L/min</b>
        </span>
        <span>
          位置偏差 <b>{(s.command - s.opening).toFixed(2)} %</b>
        </span>
        <span data-testid="history-count">{history.length} 个历史点</span>
      </div>
    </section>
  );
}
