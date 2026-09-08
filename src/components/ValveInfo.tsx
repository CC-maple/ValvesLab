import type { Valve } from "../domain/types";
import { Icon } from "./Icon";

export function ValveInfo({ valve }: { valve: Valve }) {
  return (
    <section className="panel info-panel">
      <div className="panel-heading">
        <h2>认识{valve.nameCN}</h2>
        <Icon name="book" />
      </div>
      <dl className="valve-facts">
        <div>
          <dt>主要用途</dt>
          <dd>{valve.applications}</dd>
        </div>
        <div>
          <dt>运动方式</dt>
          <dd>
            {valve.motionType === "rotary" ? "90° 旋转运动" : "直线升降运动"}
          </dd>
        </div>
        <div>
          <dt>调节能力</dt>
          <dd>{valve.ability}</dd>
        </div>
        <div>
          <dt>典型特点</dt>
          <dd>{valve.feature}</dd>
        </div>
      </dl>
      <div className="observation">
        <span>试着观察</span>
        <p>{valve.observation}</p>
      </div>
      <div className="key-learning">
        <Icon name="info" size={18} />
        <div>
          <strong>开度 ≠ 流量</strong>
          <p>阀门开度并不一定与流量成线性关系。</p>
          <span>
            实际流量还会受到阀门结构、压差、介质性质和流量系数等因素影响。
          </span>
        </div>
      </div>
    </section>
  );
}
