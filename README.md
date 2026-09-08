# ValveLab V3.1

集中调参、阀门反馈、引导实验，与 MATLAB / Simulink R2025b 联动。动态计算与完整波形均在 MATLAB 中完成，网页显示模型返回的最新采样。当前未连接实体阀门硬件。

方案：[ValvesLab_v3.1.md](./ValvesLab_v3.1.md)。验证：[VALIDATION_v3.1.md](./VALIDATION_v3.1.md)。V1～V3 方案、模型基准与原液压举升案例保留。

## 启动

需要 Windows、PowerShell 7、Node.js 22.12+、MATLAB R2025b、Simulink、Instrument Control Toolbox。首次使用先在 showingLab 目录执行 npm install。

只复制下面代码框内的一行，到 PowerShell 7 运行。若已有终端正在运行 npm run dev，另开一个 PowerShell 窗口执行即可。

```powershell
& 'C:\Users\CCanon\Downloads\Valves\showingLab\scripts\Start-ValveLab.ps1'
```

脚本检查网页版本、桥接协议和 MATLAB 模型就绪状态，打印进程 ID 和日志位置，并等待 MATLAB 启动完成。出现 VALVELAB_V31_READY 后，打开 [实验网页](http://127.0.0.1:5173/)，点击连接控制。启动脚本也可重复运行，不会重置已有运行。

网页连接说明中也提供同一条命令的复制按钮。不要将整篇说明、代码框标记或 PS 提示符粘贴到终端。

| 端口 | 当前用途 |
| --- | --- |
| 5173 | 开发网页 |
| 4173 | 可选生产预览 |
| 8765 | V3.1 HTTP 桥接 |
| 8776 | V3.1 MATLAB 服务 |
| 8766 | 原 V3 MATLAB 服务；V3.1 不使用 |

V3.1 使用单独的模型和 MATLAB 端口，可以与已有 V3 会话共存。所有服务仅限本机 127.0.0.1；窄窗布局用于电脑分屏，也支持浏览器触摸模拟，不代表手机跨设备连接已配置。

启动日志在 output/runtime。MATLAB 专用计算服务使用 `-nodesktop -nosplash`，避免完整桌面弹出“是否恢复自动保存/上次会话”的恢复窗口；Scope、SDI、Simulink 模型和分析图仍可从网页按钮打开。若发现版本不匹配，按照日志中的 PID 识别并停止旧项目桥接，再运行启动命令；不要仅凭端口被占用就判断已成功启动。修改 MATLAB 类文件后，需要重新启动该项目专用 MATLAB 会话。

高级手动启动：在 showingLab 的两个终端分别运行 npm run dev 和 npm run bridge；在 MATLAB 命令窗口执行下面两行。统一启动脚本已运行时，无须重复执行。

```matlab
addpath('C:\Users\CCanon\Downloads\Valves\showingLab\matlab')
start_valvelab
```

## 页面怎么用

顶部固定运行、暂停、单步、波形、保存和新实验操作；关键反馈始终位于工作区顶部。左侧统一参数面板包含阀门选择、手动/PID 模式、目标，以及控制、驱动、压力、测量、故障五个分组。右侧为阀门结构、执行机构反馈与学习路径。窄屏通过阀门/调参页签切换。

1. 连接后初始暂停，实际阀位 65%，默认调节阀、电动机构、手动控制。
2. 改变目标后开始，或单步观察。每次单步推进 0.05 s 仿真时间。
3. 数字框输入完整数值后按 Enter 或离开输入框提交；空白、未完成小数或越界值不会提交。PID 的 Kp/Ki/Kd 是一组草稿，点击应用 PID 参数后一起提交，切换参数分组不丢失草稿。
4. 参数状态区分待发送、MATLAB 已接受、实际采样已生效。生效版本随 Simulink 信号返回，暂停时接受新参数并不改变上一采样的阀位。
5. 暂停按钮在参数请求过程中仍可操作，帮助与分析对话框中也有暂停入口。队列中的暂停显示待处理，以 MATLAB 返回的状态为准。
6. 切阀、准备课程、开始新实验前，已有采样或参数修改会自动保存；保存失败则停止重置。新实验保留当前参数、清除故障，初始阀位回到 65%；切阀恢复该阀门的默认参数。尚未提交的输入草稿不会跨实验保留。
7. 保存与对比支持命名、MAT/CSV 路径、最近记录和参数事件。网页显示最近 30 份 V3.1 保存记录，其他文件仍保留在磁盘。

多个页面可观察，但只有一个页面有控制权。心跳中断超过 3 s，MATLAB 暂停并释放控制权；恢复连接后需要手动开始。网页不生成断连替代数据。切换焦点到 MATLAB 本身不会断开，但浏览器挂起可能停止心跳。

## 六个学习实验

| 实验 | 固定操作 |
| --- | --- |
| 命令与实际阀位 | 手动命令 30%，t=5 s 改为 70% |
| PID 跟踪 | SP 60，t=5 s 改为 75 L/min |
| 压差扰动 | PID SP 60；t=10 s 压差降至 0.25 bar，t=20 s 恢复 1 bar |
| 传感器滞后 | 与手动实验相同激励，保留所选传感器时间常数 |
| 卡死与恢复 | t=10 s 卡死，t=12 s SP 从 60 改为 75，t=20 s 清除 |
| 为何是 63.2% | MATLAB 独立传感器阶跃图，标注 1τ 与 3τ |

前五课用调节阀，保留当前 PID、机构和传感器参数以便对比；从 t=0、初始实际阀位 65% 开始，30 s 自动暂停。先准备本实验，再点击开始。手动改参数或切回自由实验会取消剩余预设事件和自动暂停。

传感器时间常数可选 0.05、0.1、0.2、0.5、1 s，默认仍为 0.2 s。固定仿真步长 0.05 s 作为只读模型信息。网页约每 250 ms 读取最新状态，两者不是同一个采样周期。

63.2% 结论只适用于恒定阶跃输入的一阶响应。主回路同时含 PID、机构速率限制与传感器动态，不能直接用任意流量曲线的 63.2% 时刻辨识传感器时间常数。顶部信号帮助包含控制链、单位、三个差值、积分保持和指数响应说明。

## MATLAB 波形与记录

波形视图一次打开所选的一组原生 Scope：流量 SP/Q/PV、命令/实际阀位、PID 贡献。默认最近 20 s 滚动，可选 5/10/20/60 s。PID 默认三行独立 Y 轴；也支持同轴叠加。

MATLAB 服务根据可见采样维护 Scope 的 YLimits，旧峰值移出后允许范围收缩。Scope 原生配置中的 AxesScaling 为 Manual，表示范围由服务设置；网页选择锁定 Y 轴后才停止这些自动更新。暂停后可选本次全程或指定选段，并使用 MATLAB 原生缩放、游标与测量工具。

SDI 入口选择当前真实记录的信号；实时记录保留 MATLAB 原生字段名与样式。保存记录对比导入两份实际采样快照，按流量、阀位、P/I/D 排列，使用颜色、单位、实线/虚线区分。运行数据不会因切换视图而删除。

MATLAB 全程分析图标注参数实际生效时刻。分析图和独立传感器图由服务预先创建并重复使用，关闭窗口仅隐藏该图，便于下次打开。

保存文件位于 matlab/runs/v3.1，文件名使用时间戳和序号；实验名称保存在 MAT 元数据中，不用于任意文件路径。CSV 包含 20 列实际采样，MAT 还包含已接受/已应用配置、生效版本、接受与应用时刻、被后续配置取代的版本、课程和事件。

```matlab
% 使用网页返回的真实 MAT 路径：
f = analyze_valvelab_v31('C:\...\valvelab_时间标识.mat');
data = load('C:\...\valvelab_时间标识.mat');
signals = data.run.signals;
```

## 实现与验证

| 文件 | 职责 |
| --- | --- |
| src/App.tsx、src/v31.css | 固定工作区、反馈和对话框 |
| src/components/v31 | 参数草稿、分组与学习说明 |
| src/matlab/useMatlabBridge.ts | 状态、心跳、调参队列、可排队暂停 |
| matlab/valvelab_v31.slx | V3.1 Simulink 模型与 20 个记录信号 |
| matlab/valvelab_model_v31.m、valvelab_sfun_v31.m | 模型方程、参数验证、Simulink DWork 与生效版本 |
| matlab/ValveLabServiceV31.m | 运行、控制权、课程调度、保存与分析 |
| matlab/valvelab_scope_v31.m、valvelab_sdi_v31.m | MATLAB 波形预设与记录对比 |
| matlab/analyze_valvelab_v31.m、valvelab_sensor_lesson.m | 事件标记、一阶响应教学 |
| scripts/Start-ValveLab.ps1 | 协议检查与完整启动 |

V3 的 valvelab_v3.slx、valvelab_model.m、valvelab_sfun.m、ValveLabService.m 保留为基准。网页不导入旧的 TypeScript 动态求解器。

```powershell
npm run verify
npm run build
node --experimental-strip-types scripts/verify-v3-fixtures.ts
matlab -batch "addpath('matlab'); verify_valvelab_v31"
```

上述 MATLAB 检查使用独立的 18766 测试端口，会产生测试运行和导出。浏览器与桥接验证脚本、截图及实际结果见 VALIDATION_v3.1.md。

在启动本项目的 MATLAB 会话中运行 delete(valvelab_service) 可停止服务并释放模型；它释放内存对象，不删除文件。关闭后台启动终端不会自动停止 Node 服务，可按启动日志中的 PID 结束对应项目进程。

本项目为教学近似：固定水样介质、正向准稳态压差，没有独立管路动力学、反向流动、气蚀、实物标定或硬实时保障。当前 1800 s 仿真时长上限保持不变。

