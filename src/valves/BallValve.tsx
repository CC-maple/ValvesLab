import type { ValveDrawingProps } from "../domain/types";
import { Flanges, Part } from "./shared";

export default function BallValve(props: ValveDrawingProps) {
  const { state, prefix } = props;
  const rotation = 90 - state.angle;
  // Use a direct path for the intersection of the bore and the spherical section.
  const bore =
    "M303.79 204H456.21A88 88 0 0 1 456.21 292H303.79A88 88 0 0 1 303.79 204Z";
  const seat =
    "M278 188H310L301 204H278ZM278 292H301L310 308H278ZM482 188H450L459 204H482ZM482 292H459L450 308H482Z";
  const body =
    "M60 178H257C282 128 326 113 380 113S478 128 503 178H700V318H503C478 368 434 383 380 383S282 368 257 318H60Z";
  return (
    <>
      <defs>
        <clipPath id={`${prefix}-ball`}>
          <circle cx="380" cy="248" r="88" />
        </clipPath>
        <mask id={`${prefix}-obstacles`}>
          <rect width="760" height="430" fill="white" />
          <circle cx="380" cy="248" r="15" fill="black" />
          <path d={seat} fill="black" />
        </mask>
        <clipPath id={`${prefix}-fluid`}>
          <path d="M60 200H292V296H60ZM468 200H700V296H468Z" />
          <path d={bore} transform={`rotate(${rotation} 380 248)`} />
        </clipPath>
      </defs>
      <Part {...props} id="body" name="阀体 Valve body">
        <path
          d={body}
          fill={`url(#${prefix}-metal)`}
          stroke="#73818d"
          strokeWidth="2"
        />
        <path d={body} fill={`url(#${prefix}-hatch)`} />
        <path
          d="M259 179Q281 127 380 127T501 179M259 317Q281 369 380 369T501 317"
          fill="none"
          stroke="#8d9ca7"
          strokeOpacity=".4"
        />
        {[270, 490].map((x) =>
          [158, 338].map((y) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="6"
              fill="#19232e"
              stroke="#8a98a3"
            />
          )),
        )}
      </Part>
      <path
        d="M60 200H700V296H60Z"
        fill={`url(#${prefix}-water)`}
        stroke="#526874"
      />
      <Part {...props} id="seat" name="阀座 Valve seat">
        <path d={seat} fill="#9ca5a8" stroke="#d2d4c4" strokeWidth="1.4" />
      </Part>
      <Part
        {...props}
        id="closure"
        name="球体 Ball"
        transform={`rotate(${rotation} 380 248)`}
      >
        <circle
          cx="380"
          cy="248"
          r="88"
          fill={`url(#${prefix}-moving)`}
          stroke="#efba78"
          strokeWidth="2"
        />
        <g clipPath={`url(#${prefix}-ball)`}>
          <rect
            x="280"
            y="204"
            width="200"
            height="88"
            fill={`url(#${prefix}-water)`}
          />
          <path d="M285 204H475M285 292H475" stroke="#ffd29b" strokeWidth="2" />
          <path
            d="M283 248H477"
            stroke="#71c4cd"
            strokeOpacity=".4"
            strokeDasharray="6 7"
          />
        </g>
        <path
          d="M354 169a82 82 0 0 1 77 26M329 315a82 82 0 0 0 59 15"
          fill="none"
          stroke="#ffe0a7"
          strokeOpacity=".5"
          strokeWidth="2"
        />
      </Part>
      <Part {...props} id="stem" name="阀杆轴端 Valve stem">
        <circle
          cx="380"
          cy="248"
          r="15"
          fill="#30424d"
          stroke="#efba78"
          strokeWidth="2"
        />
        <path
          d="M373 248h14m-7-7v14"
          stroke="#ecc08c"
          strokeWidth="2"
          transform={`rotate(${rotation} 380 248)`}
        />
      </Part>
      <Flanges prefix={prefix} />
      <g fill="none" stroke="#c3a16f">
        <path
          d="M389 95a153 153 0 0 1 102 48"
          strokeDasharray="4 5"
          opacity=".6"
        />
        <path d="m488 134 4 10-11-2" />
      </g>
    </>
  );
}
