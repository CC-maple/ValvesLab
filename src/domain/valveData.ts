import type { Valve, ValvePart } from "./types";

const commonParts: ValvePart[] = [
  {
    id: "stem",
    nameCN: "阀杆",
    nameEN: "Valve stem",
    description: "连接操作机构与启闭件，传递旋转或升降运动。",
  },
  {
    id: "seat",
    nameCN: "阀座",
    nameEN: "Valve seat",
    description: "与启闭件接合形成密封，并限定流体通过的开口。",
  },
  {
    id: "body",
    nameCN: "阀体",
    nameEN: "Valve body",
    description: "容纳内部零件、连接管道，并形成流体通道。",
  },
];
const parts = (
  nameCN: string,
  nameEN: string,
  description: string,
): ValvePart[] => [
  { id: "closure", nameCN, nameEN, description },
  ...commonParts,
];

export const valves: Valve[] = [
  {
    id: "ball",
    nameCN: "球阀",
    nameEN: "Ball Valve",
    category: "快速启闭 / 截断",
    motionType: "rotary",
    applications: "管路快速截断",
    ability: "普通球阀以截断为主",
    feature: "四分之一转即可启闭；全开流道接近直通。",
    flowCharacteristic: "中段变化明显",
    description:
      "阀杆带动球体旋转，改变球体通孔与管道的相对位置，从而控制流通面积。",
    observation: "观察通孔由垂直流向转为与管道对齐。",
    parts: parts(
      "球体",
      "Ball",
      "球体中的通孔随旋转改变方向；对齐管道时完全开启。",
    ),
  },
  {
    id: "butterfly",
    nameCN: "蝶阀",
    nameEN: "Butterfly Valve",
    category: "大口径 / 调节 / 截断",
    motionType: "rotary",
    applications: "大口径管路截断与调节",
    ability: "中等，取决于结构",
    feature: "结构紧凑；全开时蝶板和阀轴仍位于流道中。",
    flowCharacteristic: "明显非线性",
    description:
      "蝶板绕中心阀轴旋转，从横挡流道逐渐转为顺着流向，改变有效流通面积。",
    observation: "观察蝶板角度与两侧流通空间的变化。",
    parts: parts(
      "蝶板",
      "Disc",
      "蝶板绕中心轴旋转；关闭时垂直流向，全开时平行流向。",
    ),
  },
  {
    id: "gate",
    nameCN: "闸阀",
    nameEN: "Gate Valve",
    category: "低流阻 / 截断",
    motionType: "linear",
    applications: "管路全开或全关",
    ability: "通常不用于长期节流",
    feature: "全开时闸板退出主流道，流体可以直通。",
    flowCharacteristic: "前快后缓",
    description:
      "阀杆带动闸板上下移动。闸板落下截断流道，升起后逐渐让出通流空间。",
    observation: "观察闸板向上退出流道的过程。",
    parts: parts(
      "闸板",
      "Gate",
      "沿垂直流向升降的启闭件，全开时完全退出主流道。",
    ),
  },
  {
    id: "globe",
    nameCN: "截止阀",
    nameEN: "Globe Valve",
    category: "节流 / 调节",
    motionType: "linear",
    applications: "管路截断与节流",
    ability: "适合节流调节",
    feature: "流体经过阀座时转向，全开仍存在弯曲流道。",
    flowCharacteristic: "平滑非线性",
    description: "阀瓣沿阀杆方向升降，通过改变阀瓣与阀座的间隙调节流通面积。",
    observation: "即使全开，流体仍需经过阀座并改变方向。",
    parts: parts(
      "阀瓣",
      "Valve disc",
      "宽阀瓣升起后与阀座形成间隙，落下后与阀座接合。",
    ),
  },
  {
    id: "control",
    nameCN: "调节阀",
    nameEN: "Control Valve",
    category: "连续调节 / 过程控制",
    motionType: "linear",
    applications: "过程流量连续调节",
    ability: "适合连续调节",
    feature: "本例为直行程单座结构，采用线性教学特性。",
    flowCharacteristic: "本例线性",
    description: "带轮廓的阀芯沿阀杆连续移动，改变阀芯与阀座之间的节流面积。",
    observation: "观察轮廓阀芯的升程如何连续改变节流间隙。",
    parts: parts(
      "阀芯",
      "Valve plug",
      "轮廓决定开口随升程变化的方式；本例用线性模型表示。",
    ),
  },
];
