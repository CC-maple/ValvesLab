import type { ValveDrawingProps } from "../domain/types";
import { Flanges, Handwheel, Part, Stem } from "./shared";
import { GATE_TRAVEL, PIPE } from "./geometry";

export default function GateValve(props: ValveDrawingProps) {
  const { state, prefix } = props;
  const lift = -state.fraction * GATE_TRAVEL;
  const gate = "M349 200H411L404 296H356Z";
  const seat =
    "M340 190H352V200H340ZM408 190H420V200H408ZM348 296H359V306H348ZM401 296H412V306H401Z";
  return (
    <>
      <defs>
        <clipPath id={`${prefix}-fluid`}>
          <path d={PIPE} />
        </clipPath>
        <mask id={`${prefix}-obstacles`}>
          <rect width="760" height="430" fill="white" />
          <path d={gate} transform={`translate(0 ${lift})`} fill="black" />
          <path d={seat} fill="black" />
        </mask>
      </defs>
      <Part {...props} id="body" name="阀体 Valve body">
        <path
          d="M60 177H309V105Q309 90 327 90H433Q451 90 451 105V177H700V319H451V340H309V319H60Z"
          fill={`url(#${prefix}-metal)`}
          stroke="#73818d"
          strokeWidth="2"
        />
        <path
          d="M60 177H309V90H451V177H700V319H60Z"
          fill={`url(#${prefix}-hatch)`}
        />
        <rect
          x="333"
          y="103"
          width="94"
          height="97"
          fill="#172b36"
          stroke="#7c8a92"
        />
        <path
          d="M327 107V173M433 107V173"
          stroke="#91a1aa"
          strokeOpacity=".45"
        />
      </Part>
      <path d={PIPE} fill={`url(#${prefix}-water)`} stroke="#526874" />
      <Part {...props} id="seat" name="阀座 Valve seat">
        <path d={seat} fill="#a5b0ad" stroke="#c5cbbd" />
      </Part>
      <Part
        {...props}
        id="stem"
        name="阀杆 Valve stem"
        transform={`translate(0 ${lift})`}
      >
        <Stem prefix={prefix} top={40} bottom={207} />
      </Part>
      <Handwheel y={64} />
      <Part
        {...props}
        id="closure"
        name="闸板 Gate"
        transform={`translate(0 ${lift})`}
      >
        <path
          d={gate}
          fill={`url(#${prefix}-moving)`}
          stroke="#efba78"
          strokeWidth="2"
        />
        <path
          d="M360 204H400L395 284H365Z"
          fill="none"
          stroke="#f6c98b"
          strokeOpacity=".5"
        />
        <path d="M374 197V292" stroke="#8a622f" strokeOpacity=".7" />
      </Part>
      <g fill="#556574" stroke="#95a1aa">
        <rect x="306" y="176" width="148" height="15" rx="2" />
        {[317, 429].map((x) => (
          <rect key={x} x={x} y="171" width="14" height="24" rx="2" />
        ))}
      </g>
      <Flanges prefix={prefix} />
      <g fill="none" stroke="#ae9874">
        <path d="M469 176V102m-5 7 5-8 5 8" strokeDasharray="4 4" />
      </g>
    </>
  );
}
