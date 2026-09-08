import type { ValveDrawingProps } from "../types";
import { Part, Stem, Handwheel } from "./shared";
import {
  CHAMBER,
  GLOBE_TRAVEL,
  PARTITION_LEFT,
  PARTITION_RIGHT,
} from "./geometry";
import { GlobeBody, GlobeSeat } from "./GlobeBody";

export default function GlobeValve(props: ValveDrawingProps) {
  const { state, prefix } = props;
  const lift = -state.fraction * GLOBE_TRAVEL;
  const plug =
    "M348 230Q348 222 361 222H399Q412 222 412 230L428 248V256H332V248Z";
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
          <rect x="374" y="0" width="12" height={234 + lift} fill="black" />
        </mask>
      </defs>
      <GlobeBody {...props} />
      <GlobeSeat {...props} />
      <Part
        {...props}
        id="stem"
        name="阀杆 Valve stem"
        transform={`translate(0 ${lift})`}
      >
        <Stem prefix={prefix} top={65} bottom={238} />
      </Part>
      <Handwheel y={72} />
      <Part
        {...props}
        id="closure"
        name="阀瓣 Valve disc"
        transform={`translate(0 ${lift})`}
      >
        <path
          d={plug}
          fill={`url(#${prefix}-moving)`}
          stroke="#efba78"
          strokeWidth="1.8"
        />
        <path d="M344 250H416" stroke="#ffdaad" strokeWidth="2" />
      </Part>
    </>
  );
}
