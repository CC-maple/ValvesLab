import type { ValveId } from "../types";

export function ValveIcon({
  type,
  size = 36,
}: {
  type: ValveId;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M3 16v15m34-15v15M3 19h9m16 0h9M3 28h9m16 0h9M20 14V6m-6 0h12" />
      {type === "ball" && (
        <>
          <circle cx="20" cy="23" r="10" />
          <path d="m11 23 15-7m-11 15 15-7" />
        </>
      )}
      {type === "butterfly" && (
        <>
          <path d="M13 14v18m14-18v18m-13-2 12-14" />
          <circle cx="20" cy="23" r="2" />
        </>
      )}
      {type === "gate" && (
        <>
          <path d="M11 16h18v15H11zM16 11h8v17h-8zM20 6v5" />
        </>
      )}
      {(type === "globe" || type === "control") && (
        <>
          <path d="M11 17q9-7 18 0v13q-9 7-18 0zm0 8h7v4h5v-6h6M20 6v12" />
          <path
            d={type === "control" ? "m16 15 4 8 4-8z" : "M15 18h10v4H15z"}
          />
        </>
      )}
    </svg>
  );
}

export function Icon({
  name,
  size = 18,
}: {
  name:
    | "arrow"
    | "pause"
    | "play"
    | "label"
    | "book"
    | "reset"
    | "info"
    | "chevron"
    | "check";
  size?: number;
}) {
  const paths = {
    arrow: "M4 12h16m-5-5 5 5-5 5",
    pause: "M8 5v14M16 5v14",
    play: "m8 5 11 7-11 7z",
    label: "M4 6h10l6 6-6 6H4zM8 10v4",
    book: "M12 6C8 3 4 4 3 5v14c4-2 7-1 9 1m0-14c4-3 8-2 9-1v14c-4-2-7-1-9 1V6",
    reset: "M4 10a8 8 0 1 1 1 7M4 4v6h6",
    info: "M12 11v6m0-10v1",
    chevron: "m9 6 6 6-6 6",
    check: "m5 12 4 4L19 6",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "info" && <circle cx="12" cy="12" r="9" />}
      <path d={paths[name]} />
    </svg>
  );
}
