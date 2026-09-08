import type { ReactNode } from "react";
import type { PartId, ValveDrawingProps } from "../domain/types";

export function Part({
  id,
  children,
  activePart,
  onPart,
  name,
  transform,
}: Pick<ValveDrawingProps, "activePart" | "onPart"> & {
  id: PartId;
  name: string;
  children: ReactNode;
  transform?: string;
}) {
  return (
    <g
      className={`valve-part ${activePart === id ? "is-highlighted" : ""}`}
      data-part={id}
      role="button"
      tabIndex={0}
      aria-label={name}
      aria-pressed={activePart === id}
      transform={transform}
      onMouseEnter={() => onPart(id)}
      onMouseLeave={() => onPart(null)}
      onFocus={() => onPart(id)}
      onBlur={() => onPart(null)}
      onClick={() => onPart(id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPart(id);
        }
        if (event.key === "Escape") onPart(null);
      }}
    >
      <title>{name}</title>
      {children}
    </g>
  );
}

export function DrawingDefs({ prefix }: { prefix: string }) {
  return (
    <defs>
      <linearGradient id={`${prefix}-metal`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#647180" />
        <stop offset=".45" stopColor="#344251" />
        <stop offset="1" stopColor="#293542" />
      </linearGradient>
      <linearGradient id={`${prefix}-moving`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#f9bf6e" />
        <stop offset=".46" stopColor="#cf8947" />
        <stop offset="1" stopColor="#8f572e" />
      </linearGradient>
      <linearGradient id={`${prefix}-water`}>
        <stop stopColor="#173b47" />
        <stop offset=".5" stopColor="#16404c" />
        <stop offset="1" stopColor="#142f3d" />
      </linearGradient>
      <pattern
        id={`${prefix}-hatch`}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <path d="M0 0V8" stroke="#a0adb9" strokeOpacity=".15" strokeWidth="2" />
      </pattern>
    </defs>
  );
}

export function Flanges({ prefix }: { prefix: string }) {
  return (
    <g fill={`url(#${prefix}-metal)`} stroke="#71808d" strokeWidth="1.5">
      {[92, 638].map((x) => (
        <g key={x}>
          <rect x={x} y="168" width="30" height="160" rx="4" />
          <path
            d={`M${x + 7} 170V326M${x + 23} 170V326`}
            stroke="#94a1ab"
            strokeOpacity=".23"
          />
          {[180, 308].map((y) => (
            <g key={y}>
              <rect
                x={x - 5}
                y={y}
                width="40"
                height="9"
                rx="2"
                fill="#89949d"
              />
              <path d={`M${x + 4} ${y + 2}h23`} stroke="#bbc3c8" />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

export function Stem({
  prefix,
  top = 74,
  bottom = 234,
}: {
  prefix: string;
  top?: number;
  bottom?: number;
}) {
  return (
    <g>
      <rect
        x="374"
        y={top}
        width="12"
        height={bottom - top}
        rx="2"
        fill={`url(#${prefix}-moving)`}
        stroke="#edb46f"
      />
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M374 ${top + 8 + i * 6}l12-3`}
          stroke="#634f3d"
          strokeWidth="1.2"
        />
      ))}
    </g>
  );
}

export function Handwheel({ y = 69 }: { y?: number }) {
  return (
    <g stroke="#8a98a3" fill="#334450">
      <ellipse cx="380" cy={y} rx="52" ry="10" strokeWidth="5" />
      <path d={`M328 ${y}h104m-52-9v18`} strokeWidth="3" />
    </g>
  );
}
