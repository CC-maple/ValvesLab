import type { ValveDrawingProps } from "../domain/types";
import { Flanges, Part } from "./shared";
import { CHAMBER, PARTITION_LEFT, PARTITION_RIGHT } from "./geometry";

export function GlobeBody(props: ValveDrawingProps) {
  const { prefix } = props;
  const body =
    "M60 177H228Q254 138 315 134V101H445V134Q506 138 532 177H700V319H532Q506 360 445 363H315Q254 360 228 319H60Z";
  return (
    <>
      <Part {...props} id="body" name="阀体 Valve body">
        <path
          d={body}
          fill={`url(#${prefix}-metal)`}
          stroke="#73818d"
          strokeWidth="2"
        />
        <path d={body} fill={`url(#${prefix}-hatch)`} />
        <rect
          x="337"
          y="103"
          width="86"
          height="67"
          fill="#1b2e38"
          stroke="#5f7180"
        />
      </Part>
      <path d={CHAMBER} fill={`url(#${prefix}-water)`} stroke="#536977" />
      <g fill={`url(#${prefix}-metal)`} stroke="#8a9ba5" strokeWidth="1.5">
        <path d={PARTITION_LEFT} />
        <path d={PARTITION_RIGHT} />
        <path
          d={`${PARTITION_LEFT}${PARTITION_RIGHT}`}
          fill={`url(#${prefix}-hatch)`}
        />
      </g>
      <g fill="#596a78" stroke="#94a1aa">
        <rect x="314" y="129" width="132" height="14" rx="2" />
        {[324, 422].map((x) => (
          <rect key={x} x={x} y="125" width="14" height="22" rx="2" />
        ))}
      </g>
      <Flanges prefix={prefix} />
    </>
  );
}

export function GlobeSeat(props: ValveDrawingProps) {
  return (
    <Part {...props} id="seat" name="阀座 Valve seat">
      <path
        d="M328 256H349V275H328ZM411 256H432V275H411Z"
        fill="#a3aeaa"
        stroke="#d4d6c6"
        strokeWidth="1.6"
      />
      <path d="M328 256H349M411 256H432" stroke="#ece1bc" strokeWidth="2" />
    </Part>
  );
}
