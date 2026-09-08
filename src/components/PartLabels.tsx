import type { Valve, ValveState } from "../domain/types";
import { CONTROL_TRAVEL, GATE_TRAVEL, GLOBE_TRAVEL } from "../valves/geometry";

export function PartLabels({
  valve,
  state,
}: {
  valve: Valve;
  state: ValveState;
}) {
  const rotary = valve.motionType === "rotary";
  const closure = valve.parts[0];
  const lift =
    state.fraction *
    (valve.id === "gate"
      ? GATE_TRAVEL
      : valve.id === "globe"
        ? GLOBE_TRAVEL
        : CONTROL_TRAVEL);
  const movingY = rotary
    ? valve.id === "ball"
      ? 186
      : 248 - 36 * Math.cos((state.angle * Math.PI) / 180)
    : (valve.id === "gate" ? 239 : valve.id === "globe" ? 244 : 244) - lift;
  const movingX =
    valve.id === "ball"
      ? 327
      : valve.id === "butterfly"
        ? 380 - 36 * Math.sin((state.angle * Math.PI) / 180)
        : 353;
  const stemX = rotary ? 394 : 382;
  const stemY = rotary ? 246 : valve.id === "control" ? 103 : 172 - lift;
  const seatX =
    valve.id === "ball"
      ? 479
      : valve.id === "butterfly"
        ? 401
        : valve.id === "gate"
          ? 415
          : 425;
  const seatY = valve.id === "globe" || valve.id === "control" ? 269 : 296;
  return (
    <g className="part-labels" pointerEvents="none">
      <path d={`M${movingX} ${movingY} 272 98H217`} />
      <circle cx={movingX} cy={movingY} r="3" />
      <text x="168" y="88">
        {closure.nameCN}
      </text>
      <text x="168" y="107" className="label-en">
        {closure.nameEN}
      </text>
      <path d={`M${stemX} ${stemY} 508 117H535`} />
      <circle cx={stemX} cy={stemY} r="3" />
      <text x="544" y="111">
        {rotary ? "阀杆轴端" : "阀杆"}
      </text>
      <text x="544" y="130" className="label-en">
        Valve stem
      </text>
      <path d={`M${seatX} ${seatY} 527 329H549`} />
      <circle cx={seatX} cy={seatY} r="3" />
      <text x="558" y="323">
        阀座
      </text>
      <text x="558" y="342" className="label-en">
        Valve seat
      </text>
    </g>
  );
}
