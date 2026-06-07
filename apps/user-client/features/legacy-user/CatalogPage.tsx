"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";

import { nailStyles } from "./nailStyles";
import { useSelectedIds } from "./useSelectedIds";

const hotItems = [...nailStyles].sort((a, b) => b.hotScore - a.hotScore);

function HomePickCard({
  item,
  selected,
  onToggle,
}: {
  item: (typeof nailStyles)[number];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="home-pick-card" data-style-id={item.id}>
      <button
        className={`nail-thumb home-pick-thumb ${item.image ? "has-image" : ""}`}
        style={{ "--thumb": item.thumb, "--nail": item.nail, "--accent": item.accent } as CSSProperties}
        type="button"
        aria-label={`查看${item.name}`}
      >
        {item.image ? <img src={item.image} alt={item.name} /> : null}
      </button>
      <div className="home-pick-copy">
        <span className="tag">{item.primaryTag}</span>
        <h3>{item.name}</h3>
        <p>{item.secondaryTag} · 热度 {item.hotScore}</p>
        <div className="home-pick-actions">
          <button
            className={`select-action ${selected ? "selected" : ""}`}
            type="button"
            onClick={onToggle}
          >
            {selected ? "已加入" : "加入试戴"}
          </button>
          <Link className="secondary-action" href="/style-library">详情</Link>
        </div>
      </div>
    </article>
  );
}

export default function CatalogPage() {
  const { selectedIds, toggleSelected } = useSelectedIds();
  const [query, setQuery] = useState("");

  const filteredPicks = query
    ? nailStyles.filter((item) =>
        [item.name, item.primaryTag, item.secondaryTag, item.definition].some((t) =>
          t.toLowerCase().includes(query.toLowerCase())
        )
      )
    : hotItems;

  const selectedItems = nailStyles.filter((item) => selectedIds.includes(item.id));

  return (
    <main>
      <section className="page active" id="home" aria-labelledby="home-title">
        <div className="product-home">
          <section className="tryon-workbench" aria-label="AI 试戴工作台">
            <div className="workbench-copy">
              <p className="eyebrow">AI Nail Try-On</p>
              <h1 id="home-title">找到适合今天的美甲</h1>
              <p>先挑 1-6 款，再上传一张手图生成试戴效果。结果可直接加入想做或确认做。</p>
            </div>

            <div className="workbench-search" role="search">
              <label htmlFor="homeSearch">搜索款式</label>
              <div className="search-field">
                <span aria-hidden="true">⌕</span>
                <input
                  id="homeSearch"
                  type="search"
                  placeholder="搜索猫眼、通勤、显白、短甲"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="home-style-rail" aria-label="快速找款">
                <button type="button" onClick={() => setQuery("猫眼")}>猫眼显白</button>
                <button type="button" onClick={() => setQuery("通勤")}>通勤短甲</button>
                <button type="button" onClick={() => setQuery("冰透")}>冰透干净</button>
                <button type="button" onClick={() => setQuery("可爱")}>可爱手绘</button>
              </div>
            </div>

            <div className="hero-preview" aria-label="真实美甲预览">
              <img src="/assets/nail-hero.png" alt="手部美甲试戴示例" />
            </div>
          </section>

          <aside className="tryon-basket session-panel" id="tryonBasket" aria-label="当前试戴会话">
            <div className="session-head">
              <span>试戴会话</span>
              <strong>已选 {selectedItems.length} 款</strong>
            </div>
            <p className="session-copy">
              {selectedItems.length
                ? "再上传一张手图，就能生成试戴效果。"
                : "选款、上传手图、生成结果会一直保留在这里。"}
            </p>
            <div className="session-selected">
              {selectedItems.length
                ? selectedItems.map((item) => (
                    <span className="session-chip" key={item.id}>{item.name}</span>
                  ))
                : "还没有加入试戴的款式"}
            </div>
            <label className="basket-upload">
              <input type="file" accept="image/*" capture="environment" />
              <span>上传手图</span>
            </label>
            <div className="session-actions">
              <Link
                className={`primary-action${selectedItems.length === 0 ? " disabled-link" : ""}`}
                href="/quick-try-on"
              >
                生成试戴
              </Link>
              <Link
                className={`secondary-action${selectedItems.length === 0 ? " disabled-link" : ""}`}
                href="/precise-try-on"
              >
                超仿真
              </Link>
            </div>
            <div className="batch-progress">
              <div className="progress-track">
                <i style={{ width: selectedItems.length ? "36%" : "0%" }} />
              </div>
              <span>{selectedItems.length ? "等待上传手图" : "等待生成"}</span>
            </div>
            <Link className="ghost-action full-width" href="/recommend">让 AI 帮我挑款</Link>
          </aside>
        </div>

        <div className="section-head home-picks-head">
          <div>
            <p className="eyebrow">Today Picks</p>
            <h2>先试这几款</h2>
          </div>
          <Link className="secondary-action" href="/style-library">进入款式库</Link>
        </div>

        <div className="home-pick-grid" id="homePickGrid">
          {filteredPicks.length ? (
            filteredPicks.slice(0, 7).map((item) => (
              <HomePickCard
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                onToggle={() => toggleSelected(item.id)}
              />
            ))
          ) : (
            <div className="empty-state">暂时没有符合条件的精选款，可以进入款式库清空筛选。</div>
          )}
        </div>
      </section>
    </main>
  );
}
