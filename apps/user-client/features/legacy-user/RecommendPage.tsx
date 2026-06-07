"use client";

import { FormEvent, useMemo, useState } from "react";

import { nailStyles } from "./nailStyles";

const promptButtons = [
  "我想要日常通勤、显白、不要太夸张，短甲也好看的款式。",
  "我喜欢可爱一点的，但担心手绘翻车，帮我推荐店里更稳的款。",
  "我想做猫眼，预算 200-300，希望 3 周后长出来也别太明显。",
  "我手偏黄，想要冰透感，帮我避开容易显黑的颜色。",
];

export default function RecommendPage() {
  const [messages, setMessages] = useState([
    "我会根据你的手部照片、肤色倾向、甲床长度、使用场景和店内款式库来推荐。你可以直接说：“想要显白、不要太夸张、预算 200 左右”。",
  ]);
  const [input, setInput] = useState("");
  const picks = useMemo(() => [...nailStyles].sort((a, b) => b.hotScore - a.hotScore).slice(0, 3), []);

  function sendPrompt(text: string) {
    const recommended = text.includes("可爱")
      ? "奶杏手绘可爱款适合你，但手绘款更吃美甲师技术；如果想稳一点，可以把奶白冰透渐变也加入试戴对比。"
      : text.includes("猫眼")
        ? "青柠星月猫眼符合猫眼预算需求，光泽感强但 2-3 周会变淡，建议同时试奶白冰透渐变作为稳妥备选。"
        : "优先推荐奶白冰透渐变、青柠星月猫眼：一个通勤干净，一个显白有细节，都适合先加入试戴会话。";
    setMessages((current) => [...current, text, recommended]);
    setInput("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input.trim()) sendPrompt(input.trim());
  }

  return (
    <main>
      <section className="page active" id="recommend" aria-labelledby="recommend-title">
        <div className="ai-shell">
          <aside className="ai-intent-panel" aria-label="挑款需求输入">
            <p className="eyebrow">Pick Assistant</p>
            <h1 id="recommend-title">帮我挑款</h1>
            <p>告诉它场景、肤色、甲型和预算，推荐卡片可以一键加入试戴会话。</p>

            <div className="quick-prompts" aria-label="快捷需求">
              {promptButtons.map((text) => (
                <button key={text} type="button" onClick={() => sendPrompt(text)}>
                  {text.slice(0, 4)}
                </button>
              ))}
            </div>

            <label className="photo-chip">
              <input type="file" accept="image/*" capture="environment" />
              <span className="align-guide">
                <img className="hand-guide-overlay" src="/assets/hand-guide-outline.png" alt="" />
                <small>手掌对准线框拍摄</small>
              </span>
            </label>

            <div className="assistant-memory-block">
              <p className="eyebrow">Memory</p>
              <div className="memory-list">
                <span>待提取：肤色倾向</span>
                <span>待提取：甲型/甲床</span>
                <span>待提取：预算</span>
                <span>待提取：禁忌偏好</span>
              </div>
            </div>
          </aside>

          <section className="ai-chat-panel" aria-label="AI 美甲顾问对话">
            <div className="chat-window" aria-live="polite">
              {messages.map((message, index) => {
                const user = index % 2 === 1;
                return (
                  <div className={`message ${user ? "user" : "ai"}`} key={`${message}-${index}`}>
                    {user ? null : <div className="avatar">AI</div>}
                    <div className="bubble">{message}</div>
                    {user ? <div className="avatar">我</div> : null}
                  </div>
                );
              })}
            </div>

            <form className="chat-composer" onSubmit={onSubmit}>
              <textarea
                rows={2}
                placeholder="告诉 AI：场景、预算、喜欢/不喜欢、甲型、肤色顾虑..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button className="primary-action" type="submit">发送</button>
            </form>
          </section>

          <aside className="ai-side-panel">
            <div className="recommend-evidence">
              <p className="eyebrow">Knowledge Base</p>
              <div>
                <span>黄皮显白</span>
                <span>短甲友好</span>
                <span>猫眼持久度</span>
                <span>手绘风险</span>
              </div>
            </div>

            <div className="recommend-result-panel">
              <div className="recommend-result-head">
                <p className="eyebrow">Shop Picks</p>
                <h2>当前可推荐</h2>
              </div>
              <div className="mini-picks">
                {picks.map((item) => (
                  <article className="mini-pick-card" key={item.id}>
                    <img src={item.image} alt={item.name} />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.primaryTag} / {item.secondaryTag} · {item.rating}/5.0</span>
                      <button className="select-action" type="button">加入试戴</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
