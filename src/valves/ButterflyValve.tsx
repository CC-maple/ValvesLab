import type { ValveDrawingProps } from "../domain/types";
import { Flanges, Part } from "./shared";
import { PIPE } from "./geometry";

export default function ButterflyValve(props: ValveDrawingProps) {
  const { state, prefix } = props;
  const turn = `rotate(${-state.angle} 380 248)`;
  const plate =
    "M380 200Q390 208 388 248Q390 288 380 296Q370 288 372 248Q370 208 380 200Z";
  return (
    <>
      <defs>
        <clipPath id={`${prefix}-fluid`}>
          <path d={PIPE} />
        </clipPath>
        <mask id={`${prefix}-obstacles`}>
          <rect width="760" height="430" fill="white" />
          <path d={plate} transform={turn} fill="black" />
          <circle cx="380" cy="248" r="12" fill="black" />
        </mask>
      </defs>
      <Part {...props} id="body" name="阀体 Valve body">
        <path
          d="M60 178H332V156H428V178H700V318H428V340H332V318H60Z"
          fill={`url(#${prefix}-metal)`}
          stroke="#788896"
          strokeWidth="2"
        />
        <path d="M60 178H700V318H60Z" fill={`url(#${prefix}-hatch)`} />
      </Part>
      <path d={PIPE} fill={`url(#${prefix}-water)`} stroke="#526874" />
      <Part {...props} id="seat" name="阀座 Valve seat">
        <path
          d="M357 190H403V200H357ZM357 296H403V306H357Z"
          fill="#a7b0ae"
          stroke="#d2d4c4"
        />
      </Part>
      <g stroke="#92a1ab" fill={`url(#${prefix}-metal)`}>
        <rect x="362" y="143" width="36" height="41" rx="3" />
        <rect x="362" y="312" width="36" height="36" rx="3" />
      </g>
      <Part {...props} id="closure" name="蝶板 Disc" transform={turn}>
        <path
          d={plate}
          fill={`url(#${prefix}-moving)`}
          stroke="#f0bc7d"
          strokeWidth="1.8"
        />
        <path d="M380 211V285" stroke="#ffdaa1" strokeOpacity=".65" />
      </Part>
      <Part {...props} id="stem" name="阀轴 Valve stem">
        <circle
          cx="380"
          cy="248"
          r="12"
          fill="#2d414d"
          stroke="#edb97a"
          strokeWidth="2"
        />
        <path
          d="M374 248h12m-6-6v12"
          stroke="#e5bb89"
          strokeWidth="2"
          transform={turn}
        />
      </Part>
      <path
        d="M380 177a71 71 0 0 1 71 71"
        fill="none"
        stroke="#c3a16f"
        strokeDasharray="4 5"
        opacity=".6"
      />
      <path d="m447 240 4 9 5-9" fill="none" stroke="#c3a16f" />
      <Flanges prefix={prefix} />
    </>
  );
}
