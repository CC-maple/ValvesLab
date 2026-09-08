import type { FaultType } from "./types";

export const faultNames: Record<FaultType, string> = {
  none: "无故障",
  stuck: "阀杆卡死",
  supply: "驱动能源中断",
  leak: "阀座泄漏",
  sensor: "传感器偏差",
};
