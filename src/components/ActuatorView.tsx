import type { LabPresentation, Valve } from "../domain/types";

export function ActuatorView({
  lab,
  valve,
}: {
  lab: LabPresentation;
  valve: Valve;
}) {
  const { state: s, config: c } = lab;
  const travel = s.opening * 0.36;
  const target = 127 - s.command * 0.36;
  const electric = c.actuator === "electric";
  return (
    <div className="actuator-view">
      <svg
        viewBox="0 0 265 152"
        role="img"
        aria-label={`${electric ? "电动" : "气动"}执行机构等效行程，实际 ${s.opening.toFixed(1)}%，命令 ${s.command.toFixed(1)}%`}
      >
        <g fill="#243947" stroke="#6d909b" strokeWidth="1.5">
          {electric ? (
            <>
              <rect x="21" y="42" width="63" height="42" rx="5" />
              <path d="M28 50v26m7-26v26m7-26v26m7-26v26" />
              <text x="64" y="68" fill="#c3d3da" stroke="none" fontSize="14">
                M
              </text>
              <path d="M84 63h28" strokeWidth="6" />
              <circle cx="128" cy="63" r="21" />
              <g transform={`rotate(${s.opening * 2.7} 128 63)`}>
                <path d="M128 45v36m-18-18h36m-31-13 26 26m-26 0 26-26" />
                <circle cx="128" cy="63" r="7" fill="#9d784a" />
              </g>
            </>
          ) : (
            <>
              <path d="M28 66V38Q94 0 160 38V66Z" />
              <path d="M38 19H65" stroke="#69cadb" strokeWidth="3" />
              <path
                d={`M72 32l20 5-20 5 20 5-20 5 20 ${21 - travel / 2}`}
                fill="none"
                stroke="#bdc4c3"
              />
              <path
                d={`M33 ${67 - travel / 2}Q93 ${78 - travel / 2} 154 ${67 - travel / 2}`}
                stroke="#d4a86e"
                strokeWidth="4"
              />
            </>
          )}
          <rect
            x={electric ? 121 : 87}
            y={electric ? 85 : 68 - travel / 2}
            width="14"
            height={electric ? 39 - travel : 54 - travel / 2}
            fill="#bb925a"
            stroke="#f0c38a"
          />
          <path
            d={`M${electric ? 101 : 67} ${127 - travel}h54`}
            stroke="#edbd78"
            strokeWidth="5"
          />
          <path
            d="M194 60v63m-5-63h10m-10 63h10"
            fill="none"
            stroke="#577482"
          />
          <path
            d={`M180 ${target}h28`}
            stroke="#69d6c1"
            strokeDasharray="3 3"
          />
          <path
            d={`M183 ${127 - travel}h22`}
            stroke="#e5b26d"
            strokeWidth="3"
          />
        </g>
        <text x="19" y="148" fill="#91a5b1" fontSize="12">
          等效行程示意
        </text>
        <text x="180" y="143" fill="#87c5b6" fontSize="11">
          目标 / 实际
        </text>
      </svg>
      <div className="actuator-copy">
        <span className="micro">ACTUATOR RESPONSE</span>
        <h3>{electric ? "电动执行机构" : "气动执行机构"}</h3>
        <p>
          {valve.motionType === "rotary"
            ? `旋转输出 ${(s.opening * 0.9).toFixed(1)}°`
            : `归一化升程 ${s.opening.toFixed(1)}%`}
          <span>实际位置跟随阀门剖视图</span>
        </p>
        <div className="actuator-tags">
          <span>τ {c.timeConstant.toFixed(2)} s</span>
          <span>≤ {c.maxSpeed} %/s</span>
        </div>
        {c.fault === "supply" && (
          <p className="lab-warning">
            {electric
              ? "失电保持原位（无备用能源）"
              : `失气弹簧复位：${c.failPosition === 0 ? "关闭" : "全开"}`}
          </p>
        )}
        {c.fault === "stuck" && (
          <p className="lab-warning">机械卡死：位置保持，命令仍可变化。</p>
        )}
        {c.fault === "leak" && (
          <p className="lab-warning" data-testid="leak-indicator">
            阀座泄漏增量 {s.leakFlow.toFixed(2)} L/min
            <br />
            泄漏间隙未按比例绘制，主阀芯仍按实际位置显示。
          </p>
        )}
      </div>
    </div>
  );
}
