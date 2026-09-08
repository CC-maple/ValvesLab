import type { LessonId, MatlabSnapshot } from "../../matlab/types";

export const lessons: { id: LessonId | "firstOrder"; name: string; action: string; observe: string; question: string; group: "flow" | "position" }[] = [
  { id: "manual", name: "01 命令与阀位", action: "从 30% 指令开始，t=5 s 自动阶跃至 70%；30 s 暂停。", observe: "在阀位波形中比较 u 与 x。开始时 x=65%，会先追随 30%。", question: "为何命令立刻改变，实际阀位却不能跳变？", group: "position" },
  { id: "pid", name: "02 PID 跟踪", action: "PID 目标从 60 L/min 开始，t=5 s 自动改为 75；30 s 暂停。", observe: "比较 SP、PV、Q，再查看 u 与 x。保留当前 PID 增益。", question: "PID 输出的是流量，还是阀位命令？", group: "flow" },
  { id: "pressure", name: "03 压差扰动", action: "PID 目标 60，t=10 s 将 Δp 从 1 降至 0.25 bar，t=20 s 恢复。", observe: "先看 Q 的变化，再看 PV 和 u。低压差时全开容量只有 50 L/min。", question: "目标不可达时，增大积分增益能解决问题吗？", group: "flow" },
  { id: "sensor", name: "04 传感器滞后", action: "手动 30% → 70%，阶跃固定在 t=5 s。保留当前 τs，便于重复对比。", observe: "在测量组修改 τs，再准备实验；比较同一激励下的 Q 与 PV。", question: "0.05 s 步长与 0.2 s 时间常数各代表什么？", group: "flow" },
  { id: "fault", name: "05 故障与恢复", action: "PID 60：t=10 s 卡死，t=12 s SP 升至 75，t=20 s 清除故障。", observe: "卡死期间观察 u/x 分离，恢复后检查反馈是否重新接近目标。", question: "异常最先发生在哪个环节？", group: "position" },
  { id: "firstOrder", name: "06 为何是 63.2%", action: "在 MATLAB 打开独立传感器的一阶阶跃实验。使用当前 τs。", observe: "恒定输入由 0 跃至 100%，标出 1τ 的 63.2% 与 3τ 的 95.0%。", question: "为什么不能用主回路任意曲线直接识别传感器 τ？", group: "flow" },
];
export function LearningCard({ selected, choose, snapshot, prepare, disabled }: {
  selected: string; choose: (id: string) => void; snapshot: MatlabSnapshot; prepare: () => void; disabled: boolean;
}) {
  const lesson = lessons.find(l => l.id === selected);
  return <section className="learning-card" aria-label="实验引导"><div className="learning-top">
    <label>学习路径<select aria-label="实验课程" value={selected} onChange={e => choose(e.target.value)}>
      <option value="free">自由实验</option>{lessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
    {lesson && <button disabled={disabled || snapshot.running} onClick={prepare}>{selected === "firstOrder" ? "在 MATLAB 查看" : "准备本实验"}</button>}
  </div>{lesson ? <><p><b>操作</b>{lesson.action}</p><p><b>观察</b>{lesson.observe}</p>
    <details><summary>思考：{lesson.question}</summary><p>打开顶部的信号帮助，再结合 MATLAB 波形解释每个环节。调整前后使用同一课程，可保证阶跃时刻一致。</p></details>
    {snapshot.lesson.id !== "free" && <span className="lesson-progress" role="status">已准备：{lessons.find(l => l.id === snapshot.lesson.id)?.name}
      {snapshot.lesson.nextTime !== null ? ` · 下一事件 ${snapshot.lesson.nextTime.toFixed(2)} s` : " · 预设阶跃已完成"} · {snapshot.lesson.endTime} s 自动暂停</span>}
    <small>准备实验会自动保存已有采样并回到 t=0。开始后按仿真时刻执行；手动调参会取消剩余预设事件。</small>
  </> : <p>从左侧设置目标，点击开始；用 MATLAB 波形观察响应。选择一节课程可按固定时刻重复实验。</p>}</section>;
}
export function SignalHelp() {
  return <div className="signal-help"><p>网页调参 → Simulink 计算 → 网页显示模型反馈。当前未连接实体阀门硬件。</p>
    <div className="help-loop">SP → PID → 命令 u → 执行机构 → 阀位 x<br />↑ 反馈 PV ← 传感器 ← 流量 Q ← 阀门与压差</div>
    <table><thead><tr><th>信号</th><th>含义</th><th>单位</th></tr></thead><tbody>
      <tr><td>SP · setpoint</td><td>希望达到的流量；手动模式不参与控制</td><td>L/min</td></tr>
      <tr><td>u · command</td><td>手动或 PID 发给执行机构的阀位指令</td><td>%</td></tr>
      <tr><td>x · opening</td><td>Simulink 执行机构输出的实际阀位</td><td>%</td></tr>
      <tr><td>Q · trueFlow</td><td>模型过程流量，区别于实物参考仪表读数</td><td>L/min</td></tr>
      <tr><td>PV · measuredFlow</td><td>经过传感器动态与故障通道、PID 实际使用的反馈</td><td>L/min</td></tr>
      <tr><td>P / I / D</td><td>各项对阀位命令的实时贡献，区别于 Kp/Ki/Kd 增益</td><td>%</td></tr>
    </tbody></table>
    <details open><summary>三个差值，各看一个环节</summary><p>SP−PV 是控制误差；u−x 是阀位跟踪差；PV−Q 是测量与过程差。即使没有偏差故障，动态过程中 PV 也可能落后 Q。</p></details>
    <details><summary>为什么稳态 I 项可以不为零？</summary><p>误差归零表示积分停止累加，已累积的积分仍可维持阀门开度。这里 D 对测量值求微分，并用 0.15 s 一阶滤波；u 限制在 0～100%，配合条件积分抗饱和。</p><p className="equation">e = SP − PV；u = clamp(Kp·e + I − Kd·dPV/dt, 0, 100)</p><p>公式中的 dPV/dt 使用滤波后的估计。电动/气动断能和卡死为已知注入故障时还会冻结积分，这不是工业自动诊断。</p></details>
    <details><summary>时间常数、步长和通信有什么区别？</summary><p>Simulink 每 0.05 s 仿真时间产生一个采样。网页约每 250 ms 请求最新数据，实际间隔受通信影响。传感器 τs 默认 0.2 s 描述物理响应速度，不是传输延迟。机构 τa 还受到最大行程速度限制。</p><p>控制端每秒发送心跳，超过 3 s 未收到则暂停。切换焦点到 MATLAB 本身不会断连；反馈变旧时以连接状态为准。</p></details>
    <details><summary>指数响应与 63.2%</summary><p className="equation">PV(t) = Q₁ + (PV₀ − Q₁) exp(−t / τs)</p><p>恒定阶跃输入的一阶系统在 t=τs 完成变化量的 1−exp(−1)，约 63.2%；3τs 约 95.0%。采样更新为 PVₖ₊₁ = PVₖ + (Qₖ₊₁−PVₖ)(1−exp(−0.05/τs))。</p><p>主回路还有 PID、机构速度限制和压差变化，不能把任意主回路曲线的 63.2% 时刻当成传感器 τs。第六课在 MATLAB 中单独验证一阶响应。</p></details>
    <details><summary>模型边界与实测辨识</summary><p>固定水样介质、准稳态正向压差关系，没有独立管路时间常数。实测辨识须同步记录时间、u、x、参考流量、PV、入口与出口压力，并检查参考仪表自身的动态和机构速率限制；当前教学参数未经实物标定。</p></details>
  </div>;
}
