import { valves } from "../domain/valveData";
import type { ValveId } from "../domain/types";
import { Icon, ValveIcon } from "./Icon";

export function ValveSelector({
  selected,
  onSelect,
  remote = false,
}: {
  selected: ValveId;
  onSelect: (id: ValveId) => void;
  remote?: boolean;
}) {
  return (
    <aside className="selector">
      <div className="section-eyebrow">
        阀门库 <span>05</span>
      </div>
      <nav aria-label="选择阀门" className="valve-list">
        {valves.map((valve, i) => (
          <button
            key={valve.id}
            className={`valve-option ${selected === valve.id ? "selected" : ""}`}
            aria-pressed={selected === valve.id}
            onClick={() => onSelect(valve.id)}
          >
            <div className="valve-option-top">
              <span className="valve-icon">
                <ValveIcon type={valve.id} />
              </span>
              <span className="valve-number">0{i + 1}</span>
            </div>
            <div className="valve-option-name">
              {valve.nameCN}
              <Icon name="chevron" size={15} />
            </div>
            <span className="valve-en">{valve.nameEN}</span>
            <span className="valve-category">{valve.category}</span>
          </button>
        ))}
      </nav>
      {!remote && (
        <div className="study-note">
          <Icon name="book" />
          <p>从结构开始理解</p>
          <span>选择一种阀门，拖动开度，观察流道如何改变。</span>
          <div className="study-steps">
            <i />
            结构<span>→</span>开度<span>→</span>流量
          </div>
        </div>
      )}
    </aside>
  );
}
