# ValveLab v3 验证记录

执行日期：2026-09-05 至 2026-09-06。环境：Windows、PowerShell 7、Node.js 24.14.0、MATLAB / Simulink R2025b、Instrument Control Toolbox、Playwright Chromium。

## 完成结果

先写 [ValvesLab_v3.md](./ValvesLab_v3.md)，再实施独立 Simulink 模型、MATLAB TCP 服务、Node 桥接与网页调整。网页通过真实本地 MATLAB 服务调参、读回阀位和操作分析窗口；全部动态步骤由 Simulink 执行。旧版本代码、文档与原液压举升案例保留。

| 检查 | 实测结果 |
| --- | --- |
| 本机版本与能力 | `version('-release')` 为 2025b；Simulink 许可可用；`simulation`、`tcpserver` 可调用 |
| 模型首次构建与单步 | 已生成 `matlab/valvelab_v3.slx`；t=0 初始化，下一输出 t=0.05；65% → 65.6% 符合电动 12 %/s 速度限制 |
| 实际 Simulink 迁移 | 12 个工况、46 个检查点、24,282 个动态时间步通过 |
| 模型记录 | 19 个命名信号，日志相邻样本间隔 0.05 s |
| HTTP / TCP 桥接 | 23 项检查通过 |
| 完整网页联动 | 32 项检查通过，开发网页与实际 MATLAB 链路 |
| 最终生产补充检查 | 12 项通过，含手机触摸与网络故障注入 |
| MAT / CSV 重读 | 35 行、19 列，MATLAB 重读值差小于 1e-10，包含参数变更及事件 |
| 旧基准与流线 | 5,005 个静态采样、5,000 个流线工况、28,200 个 v2 动态时间步继续通过 |
| TypeScript / Vite | 通过；36 模块，JS 241.20 kB / gzip 76.29 kB |

## Simulink 数值迁移

`scripts/verify-v3-fixtures.ts` 使用保留的 v2 TypeScript 模型生成独立参考；`matlab/verify_valvelab_v3.m` 在真实 Simulink 模型中执行相同配置变更和步骤，逐个检查点比较全部 16 个状态量。

- 球阀、蝶阀、闸阀、截止阀、调节阀各搭配电动和气动执行机构；包含 PID 跟踪、压力变化和目标阶跃。
- 另含卡死、电动失电、气动失气关/开、恢复、关闭泄漏、传感器偏差与恢复、在线增益变更、手动/自动切换、零正向压差。
- 不可达设定值下输出饱和、积分受限，并验证目标恢复可达后的响应。
- 最大绝对差为 `5.3148596634855494e-12`，低于检查阈值 `1e-7`。差异为浮点运算级别；该比较验证模型迁移一致性，不是实物标定。

机器可读结果：[v3-simulink-results.json](../output/validation/v3-simulink-results.json)。

复现：

```powershell
node --experimental-strip-types scripts/verify-v3-fixtures.ts
matlab -batch "addpath('matlab'); verify_valvelab_v3"
```

## 桥接、确认与控制权

[verify-v3-bridge.mjs](../scripts/verify-v3-bridge.mjs) 连接实际服务进行 23 项检查：

- 没有控制权时拒绝运行；第二控制者被拒绝，参数不受影响。
- 任意 MATLAB 执行命令、未知字段、数值字符串、越界值与外部 Origin 被拒绝。
- 非法调参保留上一份配置；切阀不能绕过暂停和重置操作。
- 中断心跳后，MATLAB 自动暂停并释放控制权；暂停后时间保持不变，重连不自动恢复，单步从实际反馈时刻继续。
- 中文事件通过 UTF-8 TCP 完整传输。
- 导出生成真实 MAT 与 CSV，CSV 样本数及 19 列与反馈一致；重复导出使用不同文件名。
- 重置回到 t=0 和一个初始样本，释放后服务继续可用。

结果：[v3-bridge-results.json](../output/validation/v3-bridge-results.json)。运行前应释放网页控制权：

```powershell
node scripts/verify-v3-bridge.mjs
matlab -batch "addpath('matlab'); verify_valvelab_export"
```

`verify_valvelab_export.m` 重新加载桥接测试的实际导出文件，核对 MAT / CSV 全部值、0.05 s 时间间隔、版本、参数变更和事件，再调用分析函数重绘三组波形。

## 浏览器操作

[v3-ui-checks.js](../output/playwright/v3-ui-checks.js) 的 32 项检查包含连接、参数确认、暂停期间不伪造新反馈、实际单步与速度限制、SVG 跟随 MATLAB、运行时禁用切阀、PID 无扰切换、在线增益、压力、故障、切阀重置、实际定时运行、三个 MATLAB 分析入口和导出、多页面只读与竞争控制拒绝。

完成桌面以及 1512、1024、768、390、360 px 宽度检查，无整页横向溢出，无 JavaScript 运行时异常。实际打开 Simulink 编辑器、三个 Scope 和 SDI；MATLAB 调用返回成功，导出文件实际生成。

最终生产版本的 [v3-final-checks.js](../output/playwright/v3-final-checks.js) 补充 12 项检查。使用 390 × 844 触摸视口，在真实链路中设置 75 L/min 目标并单步；通过阻断浏览器网络请求验证失联标记、读数冻结、写操作禁用、MATLAB 心跳超时暂停，以及恢复后不自动运行。未连接的首次加载只显示启动步骤，没有虚构阀位或流量。

网络阻断与竞争控制测试会有预期的网络错误或 409 响应，不将这些计作应用运行时异常。未声称这些故障注入期间控制台零错误。

复现需启动 5173 开发服务、8765 桥接、8766 MATLAB；生产检查另需 `npm run build` 和 `npm run preview` 的 4173 服务。完整脚本从默认、无人控制的模型状态开始；生产补充脚本从 t=0、无人控制状态开始。

```powershell
npx --yes --package @playwright/cli playwright-cli --session valvelab3 open http://127.0.0.1:5173/ --headed
npx --yes --package @playwright/cli playwright-cli --session valvelab3 run-code --filename output/playwright/v3-ui-checks.js
npx --yes --package @playwright/cli playwright-cli --session valvelab3 run-code --filename output/playwright/v3-final-checks.js
```

两份浏览器脚本之间，先在网页连接并切换到调节阀，以将模型重置为默认 t=0，再断开控制。

## 截图与产物

- [完整联动桌面](../output/playwright/v3-desktop.png)
- [完整联动手机](../output/playwright/v3-mobile.png)
- [最终生产桌面](../output/playwright/v3-desktop-production.png)
- [最终生产手机](../output/playwright/v3-mobile-production.png)
- [未连接启动界面](../output/playwright/v3-offline.png)
- [MATLAB 导出数据重绘波形](../output/validation/v3-export-waveforms.png)
- [Simulink 模型](../matlab/valvelab_v3.slx)

完整联动截图与 MATLAB 波形已视觉检查。最终生产截图在移除旧版侧栏操作提示后生成，另作收尾核对。

## 修正与边界

联动验证中修复了首次打开 MATLAB 分析窗口较慢时的心跳误超时：正在处理的授权操作完成后刷新有效心跳时刻，窗口打开后继续可调参。另显式使用 UTF-8 编码发送 TCP 响应，避免中文事件乱码。修正后完整 32 项网页检查通过。

本版未接入实体阀门、PLC 或硬实时硬件；未将既有 Simscape 液压举升案例替换为当前模型。模型是由 Simulink 调度的离散 MATLAB S-function，参数与方程仍是教学近似。浏览器测试限 Chromium 与其手机触摸模拟，未覆盖实体手机、Firefox、Safari 或完整无障碍审计。1,800 s 上限有代码约束，但本轮没有连续等待 30 分钟验证墙钟运行。

后台启动脚本已实际启动网页、桥接和 MATLAB，日志出现 `VALVELAB_READY` 后完成最终生产测试。服务可由 [Start-ValveLab.ps1](../scripts/Start-ValveLab.ps1) 再次启动；使用方式及停止方法见 [README.md](../README.md)。
