import type { ValvePart } from "../domain/types";
import { Icon } from "./Icon";

export function PartTooltip({ part }: { part: ValvePart | undefined }) {
  return (
    <div
      className={`part-tooltip ${part ? "active" : ""}`}
      role="status"
      aria-live="polite"
    >
      {part ? (
        <>
          <span className="part-dot" />
          <div>
            <strong>
              {part.nameCN}
              <span>{part.nameEN}</span>
            </strong>
            <p>{part.description}</p>
          </div>
        </>
      ) : (
        <>
          <Icon name="info" size={16} />
          <p>悬停、聚焦或轻触零件，查看结构说明。</p>
        </>
      )}
    </div>
  );
}
