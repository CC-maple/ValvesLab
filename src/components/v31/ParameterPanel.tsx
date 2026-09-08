import { useEffect, useState } from "react";
import type { MatlabConfig, MatlabSnapshot } from "../../matlab/types";
import type { ValveId } from "../../types";
import { valves } from "../../data/valves";
import { actuatorPresets } from "../../simulation/presentation";
import { faultNames } from "../SimulationSettings";

export function parseDraft(text: string, min: number, max: number) {
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text.trim())) return null;
  const n = Number(text); return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function PreciseInput({ label, value, min, max, onCommit }: {
  label: string; value: number; min: number; max: number; onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [dirty, setDirty] = useState(false), [invalid, setInvalid] = useState(false);
  useEffect(() => { if (!dirty) setText(String(value)); }, [value, dirty]);
  function commit() {
    if (!dirty) return;
    const n = parseDraft(text, min, max);
    if (n === null) { setInvalid(true); return; }
    setInvalid(false); setDirty(false); onCommit(n);
  }
  return <span className="precise-field">
    <input aria-label={label + "精确值"} aria-invalid={invalid} inputMode="decimal" value={text}
      onChange={e => { setText(e.target.value); setDirty(true); setInvalid(false); }}
      onBlur={commit} onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setDirty(false); setInvalid(false); setText(String(value)); }
      }} />
    {invalid && <small role="alert">请输入 {min}～{max} 的完整数字</small>}
  </span>;
}
function Setting({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void;
}) {
  return <div className="v31-setting"><div className="setting-label"><span>{label}</span><small>{unit}</small></div>
    <div className="setting-edit"><input aria-label={label} type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(Number(e.target.value))} />
      <PreciseInput label={label} value={value} min={min} max={max} onCommit={onChange} /></div></div>;
}
function PIDFields({ c, update }: { c: MatlabConfig; update: (patch: Partial<MatlabConfig>) => void }) {
  const [draft, setDraft] = useState({ kp: String(c.kp), ki: String(c.ki), kd: String(c.kd) });
  const [dirty, setDirty] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (!dirty) setDraft({ kp: String(c.kp), ki: String(c.ki), kd: String(c.kd) }); }, [c.kp, c.ki, c.kd, dirty]);
  const apply = () => {
    const kp = parseDraft(draft.kp, 0, 5), ki = parseDraft(draft.ki, 0, 3), kd = parseDraft(draft.kd, 0, 1);
    if (kp === null || ki === null || kd === null) { setError("请输入完整数字：Kp 0～5，Ki 0～3，Kd 0～1。空白不会提交。"); return; }
    update({ kp, ki, kd }); setDirty(false); setError("");
  };
  return <div className="pid-draft"><h3>PID 增益 <small>{dirty ? "编辑中，尚未提交" : "并联形式"}</small></h3>
    <div className="v31-pid-inputs">{(["kp", "ki", "kd"] as const).map((key, i) => <label key={key}>
      {["Kp", "Ki", "Kd"][i]}<input aria-label={["Kp", "Ki", "Kd"][i]} inputMode="decimal" value={draft[key]}
        onChange={e => { setDraft({ ...draft, [key]: e.target.value }); setDirty(true); setError(""); }}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); apply(); } }} /></label>)}</div>
    <button className="apply-button" disabled={!dirty} onClick={apply}>应用 PID 参数</button>
    {dirty && <button className="quiet-button" onClick={() => { setDirty(false); setError(""); }}>撤销草稿</button>}
    {error && <p className="v31-warning" role="alert">{error}</p>}
    <p className="field-help">误差：L/min · 输出：% · 时间：s。P/I/D 贡献在反馈中查看，区别于这里的增益。</p>
  </div>;
}
export const faultHints = {
  none: "先建立稳定工况，再注入一种故障。比较命令 u、实际阀位 x、模型流量 Q 和反馈 PV。",
  stuck: "观察 u 与 x 分离：阀杆锁定在注入位置。清除故障后，从当前阀位恢复跟随。",
  supply: "电动失电保持原位；气动失气由弹簧返回指定位置。观察 x 的返回方向。",
  leak: "手动关闭至 0%，观察正向压差下 Q 是否仍非零。清除后检查流量是否归零。",
  sensor: "观察 PV−Q：PID 可能把 PV 调到目标，Q 仍有偏差。清除后观察两者逐渐接近。",
};
const groups = [{ id: "control", label: "控制" }, { id: "drive", label: "驱动" }, { id: "pressure", label: "压力" },
  { id: "sensor", label: "测量" }, { id: "fault", label: "故障" }];
export function ParameterPanel({ snapshot, config: c, update, owns, selectValve, status, help }: {
  snapshot: MatlabSnapshot; config: MatlabConfig; update: (patch: Partial<MatlabConfig>) => void;
  owns: boolean; selectValve: (id: ValveId) => void; status: string; help: () => void;
}) {
  const [group, setGroup] = useState("control");
  const auto = c.mode === "auto";
  return <aside className="parameter-panel" aria-label="统一参数面板">
    <div className="parameter-heading"><h2>实验参数</h2><span>PARAMETERS</span></div>
    <fieldset disabled={!owns} className="parameter-primary">
      <label className="compact-select">阀门<select aria-label="阀门类型" value={c.valveId} disabled={snapshot.running}
        onChange={e => selectValve(e.target.value as ValveId)}>{valves.map(v => <option key={v.id} value={v.id}>{v.nameCN} · {v.nameEN}</option>)}</select></label>
      <div className="v31-segment" aria-label="控制方式"><button aria-pressed={!auto} onClick={() => update({ mode: "manual" })}>手动指令</button>
        <button aria-pressed={auto} onClick={() => update({ mode: "auto" })}>PID 自动</button></div>
      <Setting key={c.mode} label={auto ? "目标流量 SP" : "阀位命令 u"} value={auto ? c.setpoint : c.manual}
        min={0} max={auto ? 150 : 100} step={0.1} unit={auto ? "L/min" : "%"}
        onChange={v => update(auto ? { setpoint: v } : { manual: v })} />
      <div className="target-presets">{(auto ? [30, 60, 75, 90] : [0, 30, 70, 100]).map(v => <button key={v}
        onClick={() => update(auto ? { setpoint: v } : { manual: v })}>{v}{auto ? "" : "%"}</button>)}</div>
    </fieldset>
    <div className="apply-status" role="status" data-testid="apply-status"><i />{status}</div>
    <div className="parameter-tabs" role="tablist" aria-label="参数分组">{groups.map((g, i) => <button key={g.id}
      role="tab" id={"tab-" + g.id} aria-selected={group === g.id} aria-controls={"group-" + g.id} tabIndex={group === g.id ? 0 : -1}
      onClick={() => setGroup(g.id)} onKeyDown={e => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const next = groups[(i + (e.key === "ArrowRight" ? 1 : 4)) % 5].id; setGroup(next); document.getElementById("tab-" + next)?.focus(); }
      }}>{g.label}{g.id === "fault" && c.fault !== "none" && <i className="fault-dot" />}</button>)}</div>
    <div className="parameter-scroll" role="tabpanel" id={"group-" + group} aria-labelledby={"tab-" + group}>
      <fieldset disabled={!owns}>
        <div hidden={group !== "control"}><PIDFields c={c} update={update} />
          {!auto && <p className="field-help">手动模式下 SP 不参与控制；u 直接指定阀位，x 按机构响应与速度限制跟随。</p>}
          {auto && c.setpoint > snapshot.capacity + .1 && <p className="v31-warning">当前压差全开约 {snapshot.capacity.toFixed(1)} L/min，目标超出通流能力。</p>}
        </div>
        <div hidden={group !== "drive"}>
          <h3>执行机构</h3><div className="v31-segment">{(["electric", "pneumatic"] as const).map(a => <button key={a}
            aria-pressed={c.actuator === a} onClick={() => update({ actuator: a, ...actuatorPresets[a] })}>{a === "electric" ? "电动" : "气动"}</button>)}</div>
          <Setting label="机构时间常数 τa" value={c.timeConstant} min={.1} max={3} step={.05} unit="s" onChange={timeConstant => update({ timeConstant })} />
          <Setting label="最大行程速度" value={c.maxSpeed} min={2} max={60} step={1} unit="%/s" onChange={maxSpeed => update({ maxSpeed })} />
          {c.actuator === "pneumatic" ? <label className="compact-select">失气位置<select aria-label="失气位置" value={c.failPosition}
            onChange={e => update({ failPosition: Number(e.target.value) as 0 | 100 })}><option value="0">弹簧复位关闭 FC</option><option value="100">弹簧复位全开 FO</option></select></label>
            : <p className="field-help">失电保持原位，无备用电源。教学参数，未作实物标定。</p>}
        </div>
        <div hidden={group !== "pressure"}><h3>压差扰动</h3>
          <Setting label="入口压力" value={c.inlet} min={0} max={4} step={.05} unit="bar" onChange={inlet => update({ inlet })} />
          <Setting label="出口压力" value={c.outlet} min={0} max={4} step={.05} unit="bar" onChange={outlet => update({ outlet })} />
          <div className="pressure-summary">设定 Δp <b data-testid="pressure-delta">{(c.inlet - c.outlet).toFixed(2)} bar</b></div>
          <div className="target-presets">{[.25, 1, 2].map(p => <button key={p} onClick={() => update({ inlet: 1 + p, outlet: 1 })}>{p} bar</button>)}</div>
          <p className="field-help">固定水样介质 · 准稳态流量随正向压差的平方根变化。本模型无独立管路时间常数。</p>
          {c.inlet <= c.outlet && <p className="v31-warning">无正向压差；本版不模拟反向流动。</p>}
        </div>
        <div hidden={group !== "sensor"}><h3>传感器响应</h3>
          <label className="compact-select">传感器时间常数 τs<select aria-label="传感器时间常数" value={c.sensorTau}
            onChange={e => update({ sensorTau: Number(e.target.value) })}>{[.05, .1, .2, .5, 1].map(t => <option key={t} value={t}>{t} s{t === .2 ? " · 默认" : ""}</option>)}</select></label>
          <p className="field-help">τs 越大，PV 追随 Q 越慢。这是渐近响应，区别于固定延时；无故障也可能出现动态滞后。</p>
          <dl className="time-facts"><div><dt>模型步长</dt><dd>0.05 s · 固定</dd></div><div><dt>网页读取</dt><dd>约 250 ms / 次</dd></div></dl>
        </div>
        <div hidden={group !== "fault"}><h3>故障与恢复</h3><label className="compact-select">注入故障<select aria-label="故障类型" value={c.fault}
          onChange={e => update({ fault: e.target.value as MatlabConfig["fault"] })}>{Object.entries(faultNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          {c.fault === "leak" && <Setting label="泄漏系数" value={c.leakage * 100} min={1} max={15} step={1} unit="%" onChange={v => update({ leakage: v / 100 })} />}
          {c.fault === "sensor" && <Setting label="测量偏差" value={c.sensorBias} min={-30} max={30} step={1} unit="L/min" onChange={sensorBias => update({ sensorBias })} />}
          <p className="fault-hint">{faultHints[c.fault]}</p><button disabled={c.fault === "none"} onClick={() => update({ fault: "none" })}>清除故障</button>
          <p className="field-help">已知注入卡死或断能时，模型冻结部分积分；这是教学机制。</p>
        </div>
      </fieldset>
      <button className="help-link" onClick={help}>理解信号、时间常数与控制原理 ↗</button>
    </div>
    <div className={"config-summary " + (c.fault !== "none" ? "has-fault" : "")}>
      <span>{c.actuator === "electric" ? "电动" : "气动"} · Δp {(c.inlet - c.outlet).toFixed(2)} bar · τs {c.sensorTau} s</span>
      <strong>{faultNames[c.fault]}</strong><small>设置摘要 · 生效状态见上方</small>
    </div>
  </aside>;
}
