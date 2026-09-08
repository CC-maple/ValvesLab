import type { ValveDrawingProps } from "../domain/types";
import { Part, Stem } from "./shared";
import {
  CHAMBER,
  CONTROL_TRAVEL,
  PARTITION_LEFT,
  PARTITION_RIGHT,
} from "./geometry";
import { GlobeBody, GlobeSeat } from "./GlobeBody";

export default function ControlValve(props: ValveDrawingProps) {
  const { state, prefix } = props;
  const lift = -state.fraction * CONTROL_TRAVEL;
  const plug = "M343 201H417V255Q403 259 387 277H373Q357 259 343 255Z";
  return (
    <>
      <defs>
        <clipPath id={`${prefix}-fluid`}>
          <path d={CHAMBER} />
        </clipPath>
        <mask id={`${prefix}-obstacles`}>
          <rect width="760" height="430" fill="white" />
          <path d={`${PARTITION_LEFT}${PARTITION_RIGHT}`} fill="black" />
          <path d="M328 256H349V275H328ZM411 256H432V275H411Z" fill="black" />
          <path d={plug} transform={`translate(0 ${lift})`} fill="black" />
          <rect x="374" y="0" width="12" height={207 + lift} fill="black" />
        </mask>
      </defs>
      <GlobeBody {...props} />
      <GlobeSeat {...props} />
      <g fill="#293d48" stroke="#7d919d">
        <path d="M326 94V48Q380 19 434 48V94Z" />
        <path d="M326 68H434" strokeWidth="3" />
        <path d="M344 71v21m72-21v21" />
        <path d="M367 51h26m-26 7h26" stroke="#9cacb5" />
      </g>
      <defs>
        <clipPath id={`${prefix}-stem-window`}>
          <rect x="367" y="75" width="26" height="240" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${prefix}-stem-window)`}>
        <Part
          {...props}
          id="stem"
          name="阀杆 Valve stem"
          transform={`translate(0 ${lift})`}
        >
          <Stem prefix={prefix} top={75} bottom={209} />
          <path d="M367 111h26" stroke="#edbc7c" strokeWidth="4" />
        </Part>
      </g>
      <Part
        {...props}
        id="closure"
        name="阀芯 Valve plug"
        transform={`translate(0 ${lift})`}
      >
        <path
          d={plug}
          fill={`url(#${prefix}-moving)`}
          stroke="#efba78"
          strokeWidth="1.8"
        />
        <path
          d="M352 210H408M352 219H408M352 228H408"
          stroke="#eccc97"
          strokeOpacity=".4"
        />
        <path d="M354 247Q368 250 377 269" fill="none" stroke="#f9d29b" />
      </Part>
      <g stroke="#8ba99d" fill="none">
        <path d="M471 149V228" strokeDasharray="3 4" />
        <path d="m467 155 4-7 4 7m-8 66 4 7 4-7" />
      </g>
    </>
  );
}
