"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";

import { filterGroups, nailStyles, type NailStyle } from "./nailStyles";
import { useSelectedIds } from "./useSelectedIds";

const filterNames = ["季节", "风格", "款式", "甲型"] as const;
const initialFilters = { 季节: "全部", 风格: "全部", 款式: "全部", 甲型: "全部" };

function matchesFilter(item: NailStyle, filterName: string, value: string) {
  if (value === "全部") return true;
  const haystack = [
    item.primaryTag,
    item.secondaryTag,
    item.name,
    item.definition,
    item.category ?? "",
    ...(item.tags ? Object.values(item.tags).flat() : []),
  ].join(" ");
  return haystack.includes(value);
}

/* ── Detail dialog ── */
function DetailDialog({
  item,
  selected,
  onToggle,
  onWant,
  onClose,
}: {
  item: NailStyle;
  selected: boolean;
  onToggle: () => void;
  onWant: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} 详情`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="dialog tryon-dialog">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="关闭">✕</button>
        <div
          id="dialogArt"
          className={`dialog-art nail-thumb ${item.coverImage ? "has-image" : ""}`}
          style={{ "--thumb": item.thumb, "--nail": item.nail, "--accent": item.accent } as CSSProperties}
        >
          {item.coverImage && (
            <img
              src={item.coverImage}
              alt={item.name}
              onError={(e) => {
                const el = e.currentTarget;
                el.closest(".nail-thumb")?.classList.remove("has-image");
                el.remove();
              }}
            />
          )}
        </div>
        <div className="dialog-body">
          <div className="card-title-row">
            <h2 id="dialogTitle">{item.name}</h2>
            <div className="tag-stack">
              <span className="tag">{item.primaryTag}</span>
              <span className="tag sub-tag">{item.secondaryTag}</span>
            </div>
          </div>
          {item.price && <p className="dialog-price">¥{item.price}</p>}
          <p id="dialogDesc" className="definition">{item.definition}</p>
          <div className="stats-row">
            <span>热度 {item.hotScore}</span>
            <span>点赞 {item.likes}</span>
            <span>评分 {item.rating}</span>
          </div>
          <div id="dialogReviewPanel" className="review-list">
            {item.reviews.map((review, i) => (
              <div className="review" key={i}>
                <div className="review-head">
                  <strong>用户{i + 1}</strong>
                  <span>{Math.max(8, item.hotScore - i * 17)} 赞</span>
                </div>
                <div className="review-copy">"{review}"</div>
              </div>
            ))}
          </div>
          <div className="dialog-actions">
            <button
              id="dialogIntentBtn"
              className="select-action full-width"
              type="button"
              onClick={onWant}
            >
              我想做
            </button>
            <button
              id="dialogConfirmBtn"
              className={`primary-action full-width ${selected ? "selected" : ""}`}
              type="button"
              onClick={onToggle}
            >
              {selected ? "已加入试戴" : "加入试戴"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Nail card ── */
function NailCard({
  item,
  selected,
  onToggle,
  onDetail,
  onWant,
}: {
  item: NailStyle;
  selected: boolean;
  onToggle: () => void;
  onDetail: () => void;
  onWant: () => void;
}) {
  return (
    <article className="nail-card browse-slot" data-style-id={item.id}>
      <button
        className={`nail-thumb ${item.coverImage ? "has-image" : ""}`}
        style={{ "--thumb": item.thumb, "--nail": item.nail, "--accent": item.accent } as CSSProperties}
        type="button"
        aria-label={`查看${item.name}`}
        onClick={onDetail}
      >
        {item.coverImage && (
          <img
            src={item.coverImage}
            alt={item.name}
            onError={(e) => {
              const el = e.currentTarget;
              el.closest(".nail-thumb")?.classList.remove("has-image");
              el.remove();
            }}
          />
        )}
      </button>
      <div className="card-body">
        <div className="card-title-row">
          <h3>{item.name}</h3>
          <div className="tag-stack">
            <span className="tag">{item.primaryTag}</span>
            <span className="tag sub-tag">{item.secondaryTag}</span>
          </div>
        </div>
        <p className="definition">{item.definition}</p>
        <div className="stats-row">
          <span>热度 {item.hotScore}</span>
          <span>适合 {item.secondaryTag || item.primaryTag}</span>
        </div>
        <div className="review-list">
          {item.reviews.slice(0, 2).map((review, i) => (
            <div className="review" key={i}>
              <div className="review-head">
                <strong>用户{i + 1}</strong>
                <span>{Math.max(8, item.hotScore - i * 17)} 赞</span>
              </div>
              <div className="review-copy">"{review}"</div>
            </div>
          ))}
        </div>
        <div className="card-actions">
          <button
            className={`select-action ${selected ? "selected" : ""}`}
            type="button"
            onClick={onToggle}
          >
            {selected ? "已加入试戴" : "加入试戴"}
          </button>
          <button className="secondary-action" type="button" onClick={onDetail}>
            查看详情
          </button>
          <button className="select-action" type="button" onClick={onWant}>
            我想做
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── Page ── */
export default function StyleLibraryPage() {
  const { selectedIds, toggleSelected } = useSelectedIds();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<NailStyle | null>(null);
  const [wantedIds, setWantedIds] = useState<string[]>([]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return nailStyles.filter((item) => {
      const textMatch =
        !keyword ||
        [item.name, item.primaryTag, item.secondaryTag, item.definition, ...(item.reviews ?? [])].some(
          (t) => t.toLowerCase().includes(keyword)
        );
      const filterMatch = filterNames.every((name) => matchesFilter(item, name, filters[name]));
      return textMatch && filterMatch;
    });
  }, [filters, query]);

  const allDefault = filterNames.every((name) => filters[name] === "全部");

  function resetFilters() {
    setFilters(initialFilters);
    setQuery("");
    setOpenFilter(null);
  }

  function handleWant(id: string) {
    setWantedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setDetailItem(null);
  }

  return (
    <main>
      {detailItem && (
        <DetailDialog
          item={detailItem}
          selected={selectedIds.includes(detailItem.id)}
          onToggle={() => toggleSelected(detailItem.id)}
          onWant={() => handleWant(detailItem.id)}
          onClose={() => setDetailItem(null)}
        />
      )}

      <section className="page active" id="styleLibrary" aria-labelledby="style-library-title">
        <div className="section-head catalog-head">
          <div>
            <p className="eyebrow">Style Library</p>
            <h1 id="style-library-title">店内真实款式</h1>
          </div>
          <div className="library-control-bar">
            <div className="library-search" role="search">
              <label htmlFor="catalogSearch">搜索款式</label>
              <div className="search-field">
                <span aria-hidden="true">⌕</span>
                <input
                  id="catalogSearch"
                  type="search"
                  placeholder="猫眼、冰透、短甲、显白"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <button className="filter-drawer-trigger" type="button" onClick={resetFilters}>
              清空条件
            </button>
          </div>
        </div>

        <div className="quick-filter-strip" aria-label="快捷筛选">
          <div className="filter-area">
            <div className="filter-menu-bar">
              <button
                className={`filter-main-pill filter-all-pill ${allDefault ? "active" : ""}`}
                type="button"
                onClick={resetFilters}
              >
                全部
              </button>
              {filterNames.map((name) => {
                const value = filters[name];
                const isOpen = openFilter === name;
                return (
                  <div
                    className={`filter-dropdown ${value !== "全部" ? "has-value" : ""} ${isOpen ? "is-open" : ""}`}
                    key={name}
                  >
                    <button
                      className="filter-main-pill"
                      type="button"
                      onClick={() => setOpenFilter(isOpen ? null : name)}
                    >
                      <span>{name}</span>
                      {value !== "全部" && <strong>{value}</strong>}
                      <i aria-hidden="true" />
                    </button>
                    <div className="filter-popover" role="menu" aria-label={`${name}筛选`}>
                      {["全部", ...filterGroups[name]].map((option) => (
                        <button
                          className={`filter-option ${option === value ? "active" : ""}`}
                          type="button"
                          key={option}
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, [name]: option }));
                            setOpenFilter(null);
                          }}
                        >
                          {option === "全部" ? `全部${name}` : option}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {!allDefault && (
              <div className="active-filter-row">
                {filterNames
                  .filter((name) => filters[name] !== "全部")
                  .map((name) => (
                    <button
                      className="active-filter-chip"
                      type="button"
                      key={name}
                      onClick={() => setFilters((prev) => ({ ...prev, [name]: "全部" }))}
                    >
                      {name}：{filters[name]} ×
                    </button>
                  ))}
                <button className="active-filter-clear" type="button" onClick={resetFilters}>
                  清空筛选
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="filter-status" id="filterStatus">
          {filteredItems.length === nailStyles.length
            ? "当前展示全部店内款式"
            : `当前展示 ${filteredItems.length} 款筛选结果`}
        </p>

        <div className="nail-grid" id="nailGrid" style={{ "--nail-grid-cols": "4" } as CSSProperties}>
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <NailCard
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                onToggle={() => toggleSelected(item.id)}
                onDetail={() => setDetailItem(item)}
                onWant={() => handleWant(item.id)}
              />
            ))
          ) : (
            <div className="empty-state">没有符合当前标签的款式，可以切回"全部"看看。</div>
          )}
        </div>
      </section>
    </main>
  );
}
