# ValveLab v2 验证记录

验证日期：2026-09-05。环境：Windows、PowerShell 7、Node.js 24.14.0、Chromium（Playwright）。实现依据：[ValvesLab_v2.md](./ValvesLab_v2.md)。

## 结果

执行机构、PID 流量控制、压差扰动、四类故障、实时趋势与事件记录已接入页面。五种阀门流线采用有序流带生成，用户截图中闸阀 79.5% 开度的交叉问题已修复。既有结构学习功能保留。

| 验证 | 结果 | 范围 |
| --- | --- | --- |
| v1 静态模型 | 通过 | 5,005 个采样工况 |
| v2 流线路径 | 通过 | 五种阀门各 1,000 个非零开度，共 5,000 个工况；另含闸阀 79.5% 回归和全开直线检查 |
| v2 动态模型 | 通过 | 28,200 个固定时间步，覆盖执行机构、PID、压差、故障与模式切换 |
| 动态界面完整检查 | 37 项通过 | 开发服务 5173，覆盖操作、故障、历史与响应式布局 |
| 旧功能浏览器回归 | 117 项通过 | 最终生产预览 4173，覆盖五种阀门与原有交互 |
| 最终生产补充检查 | 11 项通过 | 暂停时间同步、参数切换、零压差、手机触摸等 |
| TypeScript 与生产构建 | 通过 | `npm run build`；42 个模块，JavaScript 252.81 kB，gzip 79.08 kB |

完整动态界面检查后，补充了暂停时立即发布状态、静态特性曲线说明和小范围代码整理；随后重新通过模型验证、生产构建、117 项回归与 11 项针对性检查。完整 37 项脚本未在这些收尾改动后再次运行。

## 模型检查

运行：

```powershell
cd <path-to-repository>
npm run verify
npm run build
```

脚本：[verify-models.ts](../scripts/verify-models.ts)、[verify-v2.ts](../scripts/verify-v2.ts)。

- 流线使用共同横坐标样本，逐截面检查横坐标严格递增、纵向次序保持。共享分段线性插值保持路径不相交；79.5% 闸阀另作截图复核。
- 相同开度下，压差增至四倍时流量增至两倍；非正压差的正向流量为零。健康阀关闭时无流量；默认泄漏故障在 1 bar、完全关闭时为 5 L/min。
- 手动阶跃遵守执行机构速度上限；电动失电保持，气动失气可关到 0% 或开到 100%；卡死保持实际位置，清除后恢复运动。
- 五种阀门分别搭配电动和气动执行机构，默认 PID 跟踪 60 L/min，十种组合均在脚本规定时窗内满足误差小于 0.5 L/min。输出保留三位小数时均为 60.000 L/min。
- 传感器增加 15 L/min 偏差后，PID 将测量值控制到约 60、真实流量到约 45 L/min；清除偏差后恢复。
- 验证压差扰动恢复、不可达目标时输出饱和、积分有界及目标恢复可达后的收敛。持续卡死时积分不无限增长。
- 验证手动/自动切换、在线增益变更的输出衔接，以及无效输入和时间步的显式拒绝。

默认 60 L/min 稳态的实际开度如下；这是本项目特性曲线的结果，不是产品选型数据。

| 阀门 | 实际开度，电动与气动均相同 |
| --- | --- |
| 球阀 | 59.920% |
| 蝶阀 | 75.770% |
| 闸阀 | 36.754% |
| 截止阀 | 53.571% |
| 调节阀 | 60.000% |

## 浏览器检查

复现脚本保存在 [output/playwright](../output/playwright)。使用 Playwright CLI 的 `run-code --filename` 执行，测试依赖相应服务已启动，页面处于新加载的默认结构学习状态。

```powershell
npm run dev
```

在另一个终端执行开发版本的完整动态检查：

```powershell
npx --yes --package @playwright/cli playwright-cli --session valvelab2 open http://127.0.0.1:5173/
npx --yes --package @playwright/cli playwright-cli --session valvelab2 run-code --filename output/playwright/v2-ui-checks.js
```

生产检查使用 `npm run preview` 启动 4173 服务，并在每个脚本前重新导航以恢复初始状态：

```powershell
npx --yes --package @playwright/cli playwright-cli --session valvelab2 goto http://127.0.0.1:4173/
npx --yes --package @playwright/cli playwright-cli --session valvelab2 run-code --filename output/playwright/v2-legacy-checks.js
npx --yes --package @playwright/cli playwright-cli --session valvelab2 goto http://127.0.0.1:4173/
npx --yes --package @playwright/cli playwright-cli --session valvelab2 run-code --filename output/playwright/v2-final-smoke.js
```

动态检查覆盖开始、暂停、单步、手动渐进响应、PID 60/90 L/min 目标阶跃、低压差容量限制及恢复、四类故障注入与清除、历史上限 301 点、模式返回保留状态、切换阀门重置实验、重置清除故障等。

生产回归覆盖五种阀门的 0/50/100% 开度、小数开度、鼠标拖动、键盘、零件提示、标注开关、动画暂停、刷新初始状态和减少动画偏好。补充检查确认暂停读数与事件的实际仿真时刻一致，单步随后增加 0.05 秒，剖视跟随实际开度，非正压差停流；手机触摸可切换模式、选择 PID、单步和设置负传感器偏差。

桌面及 1024、768、390、360 px 宽度检查未见整页横向溢出。手机触摸测试采用 390 × 844 视口。最终生产浏览器控制台为 0 错误、0 警告。

## 截图

- [闸阀 79.5% 修复结果](../output/playwright/v2-gate-79.5.png)
- [闭环实验桌面全页](../output/playwright/v2-desktop.png)
- [闭环实验手机全页](../output/playwright/v2-mobile.png)
- [最终生产版本手机 PID 面板](../output/playwright/v2-mobile-control-detail.png)
- [最终生产版本结构学习桌面](../output/playwright/v2-regression-desktop-final.png)
- [最终生产版本结构学习手机](../output/playwright/v2-regression-mobile-final.png)

以上截图已进行视觉检查。全页动态截图生成于收尾说明改动前，最终手机 PID 面板与结构学习截图来自最终生产构建。

## 验证边界

本页是教学用简化仿真，未与实际阀门或工业控制系统标定，不包含 CFD、反向流动、气蚀、闪蒸、管路储能或完整电机/气动热力学。执行机构参数和 PID 增益是教学示例；用户自行修改参数后的全部组合不保证稳定。

浏览器验证限于 Chromium 及其手机触摸模拟，未进行实体手机、Firefox、Safari 或完整无障碍审计。后台隐藏时的时钟停步逻辑已实现，但未将真实操作系统后台生命周期列为本轮浏览器实测通过项。
