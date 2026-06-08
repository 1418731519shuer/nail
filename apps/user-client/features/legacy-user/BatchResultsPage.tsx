import Link from "next/link";

import { nailStyles } from "./nailStyles";

export default function BatchResultsPage() {
  return (
    <main>
      <section className="page active" id="batchResults" aria-labelledby="batch-results-title">
        <div className="results-head">
          <div>
            <p className="eyebrow">Batch Try-On</p>
            <h1 id="batch-results-title">一键试戴结果</h1>
            <p>这里展示从款式库中批量选择后生成的试戴结果。每个款式会独立请求生成，返回一张就展示一张。</p>
            <p className="build-note">当前构建：Next 用户端迁移版 2026-06-07</p>
          </div>
          <Link className="primary-action" href="/catalog#styleLibrary">继续选款</Link>
        </div>

        <div className="batch-empty hidden">
          还没有生成结果。先去“款式库”加入多个款式，再点击“一键试戴”。
        </div>
        <div className="batch-grid" id="batchResultGrid">
          {nailStyles.map((item) => (
            <article className="batch-card" key={item.id}>
              <div className="batch-result-media ready">
                <img src={item.image} alt={`${item.name}试戴效果图`} />
              </div>
              <div className="batch-card-body">
                <h3>{item.name}</h3>
                <div className="tag-stack">
                  <span className="tag">{item.primaryTag}</span>
                  <span className="tag sub-tag">{item.secondaryTag}</span>
                </div>
                <p>已生成真实试戴效果图。</p>
                <a className="result-file-link" href={item.image} target="_blank" rel="noreferrer">查看已保存图片</a>
                <div className="result-actions compact-actions">
                  <Link className="primary-action compact-primary" href="/want-list">确认要做</Link>
                  <Link className="select-action" href="/want-list">我想做</Link>
                  <Link className="secondary-action compact-primary" href="/precise-try-on">重新精准试戴</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
