# ValveLab v3：MATLAB / Simulink R2025b 联动

规划日期：2026-09-05。完成日期：2026-09-06。状态：已按规划实现，并在 MATLAB / Simulink R2025b 完成实际联动验证。结果见 [VALIDATION_v3.md](./VALIDATION_v3.md)。

## 1. 本版职责

将用户所说的 MATLAB simulate 理解为 Simulink 仿真。网页负责参数设置、实验操作和依据回传阀位绘制阀门；Simulink 是唯一动态计算源，MATLAB 负责波形查看、运行对比与数据分析。网页中的实际阀位指模型反馈值，不表示接入了实体阀门硬件。

保留五种阀门、执行机构、PID、压差及四类故障的教学定义，将 v2 动态方程移入 MATLAB，由 Simulink 固定步长调度。移除网页运行入口中的本地仿真与趋势曲线；旧版源文件及原有液压举升案例保留，不覆盖案例模型。

## 2. 已核实环境与技术选择

- 本机 MATLAB 路径：`C:\Program Files\MATLAB\R2025b\bin\matlab.exe`。
- 已运行 MATLAB 核实版本为 2025b，Simulink 许可可用，`simulation`、`tcpserver` 接口存在；已安装 Instrument Control Toolbox。
- 使用 MATLAB 官方 `Simulink.Simulation` 的单步控制及参数调节 API，普通仿真模式，无需生成 C 代码。
- 在新的 `matlab` 目录生成独立 `valvelab_v3.slx`，使用离散 Level-2 MATLAB S-function 保存状态和执行方程，配套可读 `.m` 文件。
- Node.js 使用内置 HTTP、TCP 模块桥接浏览器与 MATLAB，无新增运行时包。MATLAB TCP 服务使用已安装的 Instrument Control Toolbox。

## 3. 链路

```text
网页参数面板 → 本地 HTTP 桥接 :8765 → MATLAB TCP 服务 :8766
                                        ↓
                         Simulink valvelab_v3.slx（dt=0.05 s）
                                        ↓
                  阀位 / 流量 / PID / 状态 → 网页阀门与读数
                                        ↓
                        Scope / SDI / MAT、CSV 导出
```

所有服务仅监听 127.0.0.1。HTTP 入口校验来源及请求体，TCP 协议只接受固定操作与数值参数，不接受 MATLAB 代码或任意文件路径。命令带请求 ID、确认和错误；写命令超时后不自动重复执行。

## 4. 仿真与调参

- 时间步 0.05 s。MATLAB 定时器调用 Simulink 单步，以接近实时的节奏运行；不承诺硬实时。网页无物理时钟，不补算或预测阀位。
- 初始暂停、调节阀、电动执行机构、实际开度 65%；其余默认值沿用 v2。
- 操作：连接、开始、暂停、单步、重置、断开；切换阀门只允许暂停时进行并重置为对应默认配置。
- 调整手动命令、SP、Kp/Ki/Kd、执行机构参数、压力或故障后提交至 MATLAB；显示已确认参数与最新计算结果。参数在下一仿真采样点进入方程，暂停调参不伪造新反馈。
- MATLAB 执行手自动无扰切换、积分抗饱和、速度限制、压差关系和四类故障。重置保留当前参数并清除故障，回到 65% 初始阀位。
- 单次运行上限 1,800 仿真秒，达到上限暂停，提示导出并重置。完整信号在 MATLAB 保存，网页不保存波形历史。

## 5. 波形与分析

- 模型内提供 Flow Scope：SP、真实流量、测量流量；Position Scope：命令、实际阀位；PID Scope：P、I、D。
- 标记命名信号记录至 Simulation Data Inspector。网页提供打开模型、Scope 和 SDI 的操作入口，窗口在本机 MATLAB 中打开。
- 波形时间使用实际输出采样时刻，避免把 Simulation 对象暂停的下一步时刻当作已有反馈。
- 导出暂停时的完整本次运行至 `matlab/runs` 中带唯一时间标识的 MAT 与 CSV，含采样信号、配置变更与事件。MATLAB 分析函数可重新绘图；不覆盖已有导出，不清空用户其他 SDI 运行。

## 6. 连接状态

- 未连接时显示启动说明，禁止实验写操作，不显示虚构反馈。连接后显示 R2025b、模型名、仿真时刻及反馈来源。
- 多页面只允许一个控制者，其余为只读观察者。控制者每秒发送心跳；丢失心跳超过 3 秒时 MATLAB 暂停并释放控制权。
- 网页关闭、断连或桥接退出不会启动本地替代仿真。最后反馈明确标为失联，阀门流动动画停止；重新连接后读取真实服务状态，不自动恢复运行。
- MATLAB 异常、模型停止、许可或端口问题明确显示错误。已有用户 MATLAB 会话不强制关闭；提供在当前 MATLAB 中启动服务的命令，也提供专用会话启动脚本。

## 7. 页面调整

保留暗色工程风格，顶部新增连接状态与实验操作栏。中间是阀门库、剖视图及控制面板；下方是执行机构与参数设置，以及 MATLAB 波形分析入口和导出结果。移除网页趋势、静态流量曲线与双模式导航。流线仍为示意，运动依据 MATLAB 实际开度，粒子强度依据 MATLAB 流量。

## 8. 交付文件

- 本文、README 更新、`VALIDATION_v3.md`。
- `matlab/valvelab_v3.slx` 及模型构建、方程、服务、验证、分析 `.m` 文件。
- `bridge/server.mjs` 和 Windows 启动脚本。
- `scripts/Start-ValveLab.ps1`：启动网页、桥接和专用 MATLAB 会话，输出后台进程与日志，已有监听端口不重复启动。
- 网页远程状态 hook 与联动界面；新增 `npm run bridge`、MATLAB 启动说明。

## 9. 验收顺序

1. 在修改程序前完成本文。
2. 生成并实际运行 R2025b Simulink 模型，验证时间步、参数更新、波形记录与导出。
3. 对照 v2 基准工况验证迁移结果，覆盖五种阀门、两种执行机构、PID、压力与故障。
4. 建立本地桥接，验证参数确认、拒绝非法命令、多页面控制权及断连暂停。
5. 网页完成真实 MATLAB 链路调参、运行、暂停、单步、切阀与分析入口验证；使用 Playwright 技能检查桌面和移动布局。
6. 生产构建、文档及实测边界记录。未执行的验证不标为通过。

## 10. 官方依据

- [Simulation 对象与参数控制](https://www.mathworks.com/help/simulink/slref/simulink.simulation.html)
- [单步仿真及暂停时刻语义](https://www.mathworks.com/help/simulink/slref/simulink.simulation.step.html)
- [Level-2 MATLAB S-function](https://www.mathworks.com/help/simulink/sfg/writing-level-2-matlab-s-functions.html)
- [TCP 服务](https://www.mathworks.com/help/instrument/tcpserver.html)
- [TCP 终止符回调](https://www.mathworks.com/help/instrument/tcpserver.configurecallback.html)
- [SDI 信号记录](https://www.mathworks.com/help/simulink/slref/simulink.sdi.marksignalforstreaming.html)

模型仍是教学用离散近似，本版改变计算和分析的位置，不声称提升为经过实物标定的工业模型。

## 11. 实施结果

- 独立 `valvelab_v3.slx` 已生成，19 个信号接入原生日志与 Scope；网页调用本地 MATLAB 服务，动态求解器已从网页入口移除。
- 12 个实际 Simulink 工况、46 个检查点、24,282 个时间步与 v2 独立基准的最大绝对差为 `5.3148596634855494e-12`。
- 桥接检查 23 项、完整网页操作检查 32 项、生产版手机与断网检查 12 项通过。
- MAT / CSV 已重读并验证采样时刻和数值一致，分析函数成功重绘波形。
- TypeScript 与生产构建通过。详细使用方式见 [README.md](../README.md)。
