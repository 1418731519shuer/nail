import Link from "next/link";

import { nailStyles } from "./nailStyles";

function ProfileItem({ item, confirmed = false }: { item: (typeof nailStyles)[number]; confirmed?: boolean }) {
  return (
    <article className="batch-card profile-record-card">
      <div className="batch-result-media ready">
        <img src={item.image} alt={item.name} />
      </div>
      <div className="batch-card-body">
        <h3>{item.name}</h3>
        <div className="tag-stack">
          <span className="tag">{item.primaryTag}</span>
          <span className="tag sub-tag">{item.secondaryTag}</span>
        </div>
        <p>{confirmed ? "已确认要做，到店前可把试戴图给美甲师。" : "已加入候选，适合稍后比较后再确认。"}</p>
      </div>
    </article>
  );
}

export default function WantListPage() {
  const wantItems = nailStyles.slice(0, 2);
  const orderItems = nailStyles.slice(2, 3);

  return (
    <main>
      <section className="page profile-page active" id="wantList" aria-labelledby="want-list-title">
        <div className="profile-grid">
          <section className="profile-card profile-summary-card" aria-label="用户概览">
            <div className="profile-avatar" aria-hidden="true" />
            <div className="profile-summary-main">
              <p className="eyebrow">My Studio</p>
              <h1 id="want-list-title">美甲体验用户0607</h1>
              <p>偏好：短甲 / 低饱和 / 通勤</p>
              <div className="profile-stat-row" aria-label="我的记录统计">
                <span><strong>{wantItems.length}</strong>想做</span>
                <span><strong>{nailStyles.length}</strong>试戴</span>
                <span><strong>{nailStyles.length}</strong>保存图</span>
                <span><strong>{orderItems.length}</strong>确认做</span>
              </div>
            </div>
            <div className="profile-actions">
              <button className="secondary-action" type="button">刷新</button>
              <Link className="primary-action" href="/batch-results">看试戴结果</Link>
            </div>
          </section>

          <aside className="profile-card preference-card" aria-label="偏好档案">
            <div className="profile-section-head">
              <div>
                <p className="eyebrow">Preference</p>
                <h2>偏好档案</h2>
              </div>
              <Link className="ghost-action" href="/recommend">编辑偏好</Link>
            </div>
            <div className="preference-chip-row">
              {["显白", "短甲", "低饱和", "通勤", "猫眼", "冰透"].map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className="privacy-row">
              <span className="profile-icon profile-icon-shield" aria-hidden="true" />
              <div>
                <strong>手图隐私</strong>
                <p>仅用于本次试戴与推荐，可随时清除。</p>
              </div>
            </div>
          </aside>

          <section className="profile-card intent-panel">
            <div className="profile-section-head">
              <div>
                <p className="eyebrow">Want To Do</p>
                <h2>我的意向</h2>
              </div>
              <div className="profile-segmented" aria-label="意向分类">
                <span>我想做</span>
                <span>确认做</span>
              </div>
            </div>
            <p className="profile-section-copy">意向款和已确认款直接展示在这里，方便到店前快速比较和决策。</p>
            <div className="intent-columns">
              <section>
                <h3>我想做</h3>
                <p>已加入候选，适合稍后比较后再确认。</p>
                <div className="batch-grid profile-item-grid">
                  {wantItems.map((item) => <ProfileItem key={item.id} item={item} />)}
                </div>
              </section>
              <section>
                <h3>已确认做</h3>
                <p>预约成交池，默认代表已经确认要做。</p>
                <div className="batch-grid profile-item-grid">
                  {orderItems.map((item) => <ProfileItem key={item.id} item={item} confirmed />)}
                </div>
              </section>
            </div>
          </section>

          <aside className="profile-card recent-tryon-panel">
            <div className="profile-section-head">
              <div>
                <p className="eyebrow">Recent</p>
                <h2>最近试戴</h2>
              </div>
              <Link className="ghost-action" href="/quick-try-on">去试戴</Link>
            </div>
            <div className="recent-tryon-list">
              {nailStyles.slice(0, 2).map((item) => (
                <div className="recent-tryon-item" key={item.id}>
                  <img src={item.image} alt={item.name} />
                  <div>
                    <strong>{item.name}</strong>
                    <span>刚刚生成</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="profile-card saved-effects-panel">
            <div className="profile-section-head">
              <div>
                <p className="eyebrow">Saved Results</p>
                <h2>保存效果图</h2>
              </div>
              <Link className="ghost-action" href="/batch-results">全部结果</Link>
            </div>
            <div className="saved-effect-grid">
              {nailStyles.map((item) => (
                <img key={item.id} src={item.image} alt={`${item.name}保存效果图`} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
