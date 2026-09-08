import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ValveId, ValveState } from "./types";
import { valves } from "./data/valves";
import { ValveViewer } from "./components/ValveViewer";
import { ValveIcon } from "./components/Icon";
import { ActuatorView } from "./components/ActuatorView";
import { useMatlabBridge } from "./matlab/useMatlabBridge";
import { ParameterPanel } from "./components/v31/ParameterPanel";
import { LearningCard, SignalHelp, lessons } from "./components/v31/Learning";
import type { MatlabSnapshot, Waveform } from "./matlab/types";
import "./v31.css";

const startup = "& 'C:\\Users\\CCanon\\Downloads\\Valves\\showingLab\\scripts\\Start-ValveLab.ps1'";
function Modal({ title, close, children, pause, pauseQueued }: { title: string; close: () => void; children: ReactNode; pause?: () => void; pauseQueued: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="v31-dialog" aria-label={title} onCancel={close} onClose={close}>
    <div className="dialog-heading"><h2>{title}</h2><span>{pause && <button className="dialog-pause" disabled={pauseQueued} onClick={pause}>{pauseQueued ? "暂停请求待处理" : "暂停仿真"}</button>}<button aria-label="关闭窗口" onClick={close}>×</button></span></div>
    <div className="dialog-body">{children}</div>
  </dialog>;
}
function Feedback({ s, online }: { s: MatlabSnapshot; online: boolean }) {
  const x = s.state;
  return <section className={"feedback-strip " + (!online ? "feedback-stale" : "")} aria-label="Simulink 实时反馈">
    <div className="feedback-title"><span>{online ? "Simulink 反馈" : "最后收到的反馈 · 已冻结"}</span><small>{s.sampleCount} 个采样</small></div>
    <div className="feedback-values">
      <div className="signal-sp"><span>目标 SP {s.appliedConfig.mode === "manual" && <small>未参与控制</small>}</span><b>{s.applied.setpoint.toFixed(1)}<small>L/min</small></b></div>
      <div className="signal-pv"><span>测量 PV</span><b data-testid="lab-measured-flow">{x.measuredFlow.toFixed(1)}<small>L/min</small></b></div>
      <div className="signal-q"><span>模型流量 Q</span><b data-testid="lab-true-flow">{x.trueFlow.toFixed(1)}<small>L/min</small></b></div>
      <div className="signal-u"><span>阀位命令 u</span><b data-testid="lab-output">{x.command.toFixed(1)}<small>%</small></b></div>
      <div className="signal-x"><span>实际阀位 x</span><b data-testid="lab-opening">{x.opening.toFixed(1)}<small>%</small></b></div>
    </div>
  </section>;
}
function WaveSettings({ s, disabled, command }: { s: MatlabSnapshot; disabled: boolean; command: (a: string, d?: object) => Promise<boolean> }) {
  const [w, setW] = useState<Waveform>(s.waveform);
  const [notice, setNotice] = useState("");
  return <div className="wave-settings">
    <p>分析窗口在本机 MATLAB 打开。每次只打开选定的一组 Scope；完整采样保留在模型日志和导出中。</p>
    <fieldset disabled={disabled}>
      <label>观察信号<select aria-label="波形信号组" value={w.group} onChange={e => setW({ ...w, group: e.target.value as Waveform["group"] })}>
        <option value="flow">流量：SP / Q / PV</option><option value="position">阀位：命令 u / 实际 x</option><option value="pid">PID：P / I / D 贡献</option></select></label>
      <label>时间视图<select aria-label="波形时间视图" value={w.mode} onChange={e => setW({ ...w, mode: e.target.value as Waveform["mode"] })}>
        <option value="live">实时滚动</option><option value="full" disabled={s.running}>暂停分析 · 本次全程</option><option value="range" disabled={s.running}>暂停分析 · 指定选段</option></select></label>
      {w.mode === "live" && <label>最近时间窗<select aria-label="波形时间窗" value={w.span} onChange={e => setW({ ...w, span: Number(e.target.value) })}>
        {[5, 10, 20, 60].map(v => <option key={v} value={v}>{v} s</option>)}</select></label>}
      {w.mode === "range" && <div className="range-inputs"><label>起点 / s<input aria-label="选段起点" type="number" min="0" step=".05" value={w.from}
        onChange={e => setW({ ...w, from: e.target.valueAsNumber })} /></label><label>终点 / s<input aria-label="选段终点" type="number" min=".05" step=".05" value={w.to}
        onChange={e => setW({ ...w, to: e.target.valueAsNumber })} /></label></div>}
      <label>Y 轴<select aria-label="Y 轴模式" value={w.yMode} onChange={e => setW({ ...w, yMode: e.target.value as Waveform["yMode"] })}>
        <option value="auto">自动适配可见数据 · 允许收缩</option><option value="locked">锁定当前轴范围 · 用于幅值对比</option></select></label>
      {w.group === "pid" && <label>PID 显示<select aria-label="PID 波形布局" value={w.pidLayout} onChange={e => setW({ ...w, pidLayout: e.target.value as Waveform["pidLayout"] })}>
        <option value="split">三行独立 Y 轴 · 共用时间轴</option><option value="overlay">同轴叠加</option></select></label>}
      <div className="dialog-actions"><button className="primary-button" onClick={async () => {
        setNotice(""); if (w.mode === "range" && (!Number.isFinite(w.from) || !Number.isFinite(w.to) || w.from < 0 || w.to <= w.from || w.to > s.state.time)) { setNotice("选段须位于本次已有采样内，且终点大于起点。"); return; }
        if (await command("openScopes", { waveform: w })) setNotice("MATLAB 波形视图已更新。");
      }}>应用并打开 Scope</button>
        <button onClick={async () => { const defaults: Waveform = { group: "flow", span: 20, mode: "live", yMode: "auto", pidLayout: "split", from: 0, to: 5 }; setW(defaults);
          if (await command("openScopes", { waveform: defaults })) setNotice("已恢复最近 20 s 和自动 Y 轴。"); }}>恢复默认视图</button></div>
      <button onClick={() => void command("openSDI")}>在 SDI 打开本次运行</button>
      <button onClick={() => void command("openModel")}>打开 Simulink 模型</button>
    </fieldset>
    <p className="field-help">暂停分析时可在 MATLAB 中缩放、平移与测量。PID 分行时各行独立缩放，应结合单位与轴刻度比较。</p>
    <p role="status">{notice}</p>
  </div>;
}
export default function App() {
  const b = useMatlabBridge(), { lab, snapshot: s, online, owns, command } = b;
  const [modal, setModal] = useState<"help" | "waves" | "records" | "new" | "connection" | null>(null);
  const [selectedLesson, setSelectedLesson] = useState("free"), [mobileTab, setMobileTab] = useState("view");
  const [nextValve, setNextValve] = useState<ValveId | null>(null);
  const [runName, setRunName] = useState(""), [copied, setCopied] = useState(false);
  const valve = s ? valves.find(v => v.id === s.appliedConfig.valveId)! : null;
  const shape: ValveState | null = s ? { opening: s.state.opening, fraction: s.state.opening / 100,
    angle: s.state.opening * .9, travel: s.state.opening, area: s.state.opening, flow: s.state.trueFlow } : null;
  const status = !online ? "等待 MATLAB 反馈" : b.hasDraft || b.pendingAction === "configure" ? "参数待发送 / 确认中"
    : s && s.revision > s.appliedRevision ? "MATLAB 已接受 r" + s.revision + " · 下一采样生效"
      : s ? "r" + s.appliedRevision + " 已生效 · t=" + s.appliedTime.toFixed(2) + " s" : "";
  const copy = async () => { try { await navigator.clipboard.writeText(startup); setCopied(true); } catch { setCopied(false); } };
  return <div className="v31-app">
    <header className="v31-header"><a className="v31-brand" href="./"><ValveIcon type="control" size={27} /><span>Valve<b>Lab</b></span><small>3.1</small></a>
      <span className="v31-subtitle">阀门学习实验室</span><button className="connection-chip" data-testid="connection-status" onClick={() => setModal("connection")}>
        <i className={online ? "connected" : ""} />{online ? owns ? "MATLAB · 控制端" : "MATLAB · 只读" : b.bridgeOnline ? "等待 MATLAB" : "服务未就绪"}</button>
      <button className="header-help" onClick={() => setModal("help")}>信号帮助</button>
    </header>
    <nav className="run-toolbar" aria-label="运行操作">
      <span className={"run-clock " + (s?.running && online ? "is-running" : "")}><i />{s ? s.state.time.toFixed(2) : "—"} <small>s</small><em>{!online ? "未连接" : s?.running ? "运行" : "暂停"}</em></span>
      <button disabled={!online || b.pending || owns} onClick={() => void command("connect")}>连接控制</button>
      <button className="primary-button" disabled={!owns || b.pending || !!s?.running} onClick={() => void command("run")}>开始</button>
      <button className="pause-button" disabled={!b.canPause || b.pauseQueued} onClick={() => void command("pause")}>{b.pauseQueued ? "暂停请求待处理" : "暂停"}</button>
      <button disabled={!owns || b.pending || !!s?.running} onClick={() => void command("step")}>单步</button>
      <span className="toolbar-separator" />
      <button disabled={!s} onClick={() => setModal("waves")}>波形视图 ↗</button>
      <button disabled={!s} onClick={() => { setRunName(s?.runName || ""); setModal("records"); }}>保存与对比</button>
      <button disabled={!owns || b.pending || !!s?.running} onClick={() => { setNextValve(null); setModal("new"); }}>新实验</button>
      <span className="feedback-age">{online ? "反馈 " + (b.age / 1000).toFixed(1) + " s 前" : "连接后显示真实反馈"}</span>
    </nav>
    {b.error && <div className="connection-alert" role="alert"><span>{online ? "操作提示：" : "连接提示："}{b.error}</span><button onClick={() => setModal("connection")}>查看连接</button></div>}
    {lab && s && valve && shape ? <main className="v31-workspace">
      <Feedback s={s} online={online} />
      <div className="mobile-switch" role="tablist" aria-label="工作区切换">
        <button role="tab" aria-selected={mobileTab === "view"} onClick={() => setMobileTab("view")}>阀门与反馈</button>
        <button role="tab" aria-selected={mobileTab === "params"} onClick={() => setMobileTab("params")}>调节参数</button>
      </div>
      <div className={"v31-work-area show-" + mobileTab}>
        <ParameterPanel key={s.sessionId + "/" + s.runId} snapshot={s} config={lab.config} update={lab.update} owns={!!owns}
          selectValve={id => { setNextValve(id); setModal("new"); }} status={status} help={() => setModal("help")} />
        <div className="observation-area">
          <div className="closed-loop" aria-label="控制链说明"><span>SP</span> → PID → <span>u</span> → 执行机构 → <span>x</span> → 阀门 → <span>Q</span> → 传感器 → <span>PV</span><button onClick={() => setModal("help")}>?</button></div>
          <div className="observation-scroll">
            <ValveViewer valve={valve} state={shape} flowPercent={s.state.trueFlow} simulationRunning={online && s.running} />
            <details className="observation-details"><summary>执行机构反馈与控制差值 <span>u−x {(s.state.command - s.state.opening).toFixed(2)}%</span></summary>
              <ActuatorView lab={{ ...lab, config: s.appliedConfig }} valve={valve} />
              <div className="difference-readings"><span>控制误差 SP−PV <b>{s.state.error.toFixed(2)} L/min</b></span>
                <span>测量与过程差 PV−Q <b>{(s.state.measuredFlow - s.state.trueFlow).toFixed(2)} L/min</b></span></div>
              <div className="pid-contributions"><span>P <b>{s.state.p.toFixed(2)}%</b></span><span>I <b>{s.state.i.toFixed(2)}%</b></span><span>D <b>{s.state.d.toFixed(2)}%</b></span></div>
              <p className="field-help" data-testid="controller-status">{s.state.integrationHeld ? "积分保持" : "积分更新"} · {s.state.saturated ? "输出受限" : "输出未饱和"}</p>
            </details>
            <LearningCard selected={selectedLesson} choose={id => { setSelectedLesson(id); if (id === "free" && owns) void command("cancelLesson"); }} snapshot={s} disabled={!owns || b.pending}
              prepare={() => { const l = lessons.find(x => x.id === selectedLesson); if (l) void command(l.id === "firstOrder" ? "sensorLesson" : "prepareLesson", l.id === "firstOrder" ? {} : { lessonId: l.id }); }} />
            <p className="model-boundary">Simulink 模型反馈 · 固定步长 0.05 s · 未连接实体硬件</p>
          </div>
        </div>
      </div>
    </main> : <main className="startup-view"><span className="micro">MATLAB / SIMULINK R2025b</span><h1>连接实验室，开始观察阀门。</h1>
      <p>网页调参、展示阀门；MATLAB 计算动态、显示波形。</p><div className="startup-steps">
        <span className="ready">✓ 网页已打开</span><span className={b.bridgeOnline ? "ready" : ""}>{b.bridgeOnline ? "✓" : "○"} 桥接服务</span><span>○ MATLAB 模型就绪</span>
      </div><p>在 PowerShell 7 中运行下面这一条命令。脚本会检查服务并等待 MATLAB 就绪。</p>
      <div className="startup-command"><code>{startup}</code><button onClick={() => void copy()}>{copied ? "已复制" : "复制启动命令"}</button></div>
      <details><summary>首次安装与手动启动说明</summary><p>首次使用须在 showingLab 目录运行 npm install。已运行 npm run dev 的终端需新开一个 PowerShell 窗口。需要 MATLAB R2025b、Simulink 和 Instrument Control Toolbox。</p><p>启动日志保存在 showingLab/output/runtime。不要将说明文字或 Markdown 标记粘进终端。</p></details>
    </main>}
    {modal && <Modal title={{ help: "理解信号与动态", waves: "MATLAB 波形视图", records: "保存实验与对比", new: "开始新实验", connection: "连接与运行状态" }[modal]} close={() => setModal(null)} pauseQueued={b.pauseQueued} pause={b.canPause ? () => void command("pause") : undefined}>
      {modal === "help" && <SignalHelp />}
      {modal === "waves" && s && <WaveSettings s={s} disabled={!owns || b.pending} command={command} />}
      {modal === "new" && s && <><p>{nextValve ? "切换至" + valves.find(v => v.id === nextValve)?.nameCN : "当前设置保留，清除故障并重置至初始阀位 65%"}，仿真时间回到 0。</p>
        <p>本次已有 {s.sampleCount} 个采样。已有实验数据和配置变更会自动保存到 MATLAB runs/v3.1；保存失败时不会重置。尚未提交的输入草稿不会带入新实验。</p>
        <button className="primary-button" disabled={!owns || b.pending || s.running} onClick={async () => {
          if (await command(nextValve ? "selectValve" : "reset", nextValve ? { valveId: nextValve } : {})) { setSelectedLesson("free"); setModal(null); }
        }}>保存已有记录并开始新实验</button></>}
      {modal === "records" && s && <div className="record-panel"><label>实验名称<input aria-label="实验名称" maxLength={60} value={runName} onChange={e => setRunName(e.target.value)} /></label>
        <button className="primary-button" disabled={!owns || b.pending || !runName.trim()} onClick={() => void command("export", { name: runName.trim() })}>暂停并保存 MAT / CSV</button>
        {b.exported?.mat && <div className="saved-result" role="status"><strong>已保存 {b.exported.samples} 个采样</strong><code>{b.exported.mat}</code><code>{b.exported.csv}</code></div>}
        <h3>已保存实验</h3><p className="field-help">对比会暂停当前实验，在 SDI 叠加当前采样与所选记录。课程阶跃使用相同仿真时刻；自由调参的不同激励需自行核对。</p>
        <div className="saved-runs">{s.savedRuns.length ? [...s.savedRuns].reverse().map(r => <div key={r.id}><span><b>{r.name}</b><small>{r.duration.toFixed(2)} s · {r.samples} 个采样</small></span>
          <button disabled={!owns || b.pending} onClick={() => void command("compareRun", { runId: r.id })}>与本次对比 ↗</button></div>) : <p>尚无 V3.1 保存记录。</p>}</div>
        <details><summary>本次参数事件 · 接受与生效时刻</summary><ol className="v31-events">{[...s.events].reverse().map(e => <li key={e.id}><span>{e.message}</span>
          <small>{e.phase === "info" ? e.time.toFixed(2) + " s" : "接受 " + e.acceptedTime.toFixed(2) + " s · " + (e.appliedTime !== null ? "生效 " + e.appliedTime.toFixed(2) + " s" : e.phase === "superseded" ? "采样前已被后续配置取代" : "等待下一采样")}</small></li>)}</ol></details>
        <button disabled={!owns || b.pending} onClick={() => void command("openAnalysis")}>MATLAB 全程波形与事件标记 ↗</button>
      </div>}
      {modal === "connection" && <div className="connection-details"><dl><div><dt>网页</dt><dd>已打开 · V3.1</dd></div><div><dt>桥接</dt><dd>{b.bridgeOnline ? "V3.1 服务可用" : "未就绪，请运行启动脚本"}</dd></div>
        <div><dt>MATLAB</dt><dd>{online ? "R2025b 模型已就绪" : "未收到可用模型反馈"}</dd></div><div><dt>控制权</dt><dd>{owns ? "本页面持有" : s?.owner ? "另一页面持有" : "未获取"}</dd></div>
        <div><dt>运行状态</dt><dd>{online ? s?.running ? "运行中" : "已暂停" : "未确认，以 MATLAB 为准"}</dd></div></dl>
        <p>控制端心跳中断超过 3 s，MATLAB 暂停并释放控制权。恢复连接后需要手动开始。切换焦点到 MATLAB 不等于断连。</p>
        <div className="startup-command"><code>{startup}</code><button onClick={() => void copy()}>{copied ? "已复制" : "复制启动命令"}</button></div>
        <button disabled={!online || b.pending} onClick={() => void command(owns ? "release" : "connect")}>{owns ? "暂停并断开控制" : "连接 MATLAB 控制"}</button>
        {b.error && <details><summary>最近错误详情</summary><pre>{b.error}</pre></details>}
      </div>}
    </Modal>}
  </div>;
}

