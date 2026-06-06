const nailStyleDB = [
  {
    id: "cute-handpaint",
    name: "奶杏手绘可爱款",
    primaryTag: "可爱",
    secondaryTag: "手绘",
    image: "./assets/nail-cute.jpg",
    likes: "2136",
    rating: "4.9",
    reviews: [
      "@奶糖不加冰：短甲天菜！手绘的小图案超细腻，同事问了三次链接，上班做完全不突兀",
      "@黄皮试色机：黄一白做巨显嫩，黄二白以上建议先试色，奶杏色对黑黄皮不算特别友好",
      "@美甲踩雷大户：手绘款很考验美甲师耐心，手残党/技术差的店慎选，不然图案会歪歪扭扭"
    ],
    definition: "奶杏裸透底搭配小熊、蛋糕、樱桃、小猫、布丁等手绘软萌元素，温柔减龄，日常百搭不挑甲型。",
    thumb: "linear-gradient(135deg, #f8dfdc, #fffaf7 45%, #f3ddb8)",
    accent: "#f3ddb8",
    nail: "linear-gradient(160deg, #f6dfc5, #fff8ea 50%, #f0b9a8)",
    recommendBucket: "new",
    hotScore: 72
  },
  {
    id: "cat-eye-lime",
    name: "青柠星月猫眼",
    primaryTag: "猫眼",
    secondaryTag: "星月",
    image: "./assets/nail-cat-eye.jpg",
    likes: "1789",
    rating: "4.8",
    reviews: [
      "@打工人小周：自然光下的猫眼光泽感绝了！不浮夸但又很有细节，领导都夸过一次",
      "@美甲持久度测试：猫眼款的光泽感会随时间变淡，大概2-3周就没那么亮了，介意慎做",
      "@深甲床救星：青柠绿不荧光！但深甲床姐妹建议多打一层裸色底，不然透色没那么明显"
    ],
    definition: "冰透裸粉叠加青柠绿猫眼，配鎏金星月线条，清透又贵气，通勤也不会显得夸张。",
    thumb: "linear-gradient(135deg, #f2f1e8, #dce8bd 52%, #8fa15e)",
    accent: "#c7d47b",
    nail: "linear-gradient(120deg, #f4e7de, #c9d773 48%, #ebd18b 60%, #fff8ef)",
    recommendBucket: "hot",
    hotScore: 91
  },
  {
    id: "ice-gradient-mint",
    name: "粉橘薄荷渐变",
    primaryTag: "冰透",
    secondaryTag: "渐变",
    image: "./assets/nail-gradient.jpg",
    likes: "2851",
    rating: "4.9",
    reviews: [
      "@春日限定小徐：春夏做太合适了！渐变过渡很自然，金箔也不土，朋友说像橘子汽水加青草地",
      "@本甲党发言：本甲做的话，渐变范围别拉太大，不然长出来分层会很明显，建议贴半甲",
      "@黄皮亲测：室内看很温柔，阳光下会更亮一点，黄二白做也没踩雷，反而衬得手很干净"
    ],
    definition: "冰透粉橘到薄荷绿渐变，搭配细碎金箔点缀，像水光玉石，清透温柔又适合春夏。",
    thumb: "linear-gradient(135deg, #f4b996, #b8d8b8 58%, #d7b15c)",
    accent: "#b8d8b8",
    nail: "linear-gradient(145deg, #f1a982 0 38%, #b8d8b8 62%, #d9aa48 63% 68%, #fff3dd 69%)",
    recommendBucket: "potential",
    hotScore: 84
  },
  {
    id: "ice-solid-milky",
    name: "奶白冰透渐变",
    primaryTag: "冰透",
    secondaryTag: "纯色",
    image: "./assets/nail-ice.jpg",
    likes: "3247",
    rating: "4.8",
    reviews: [
      "@面试刚需选手：伪素颜美甲天花板！见家长、面试都不踩雷，完全不会出错",
      "@短甲姐妹：本甲很短的话建议做中长甲，渐变效果会更自然，短甲做容易像没涂匀",
      "@懒人美甲党：比普通裸色更有质感，但也容易长出来明显，大概3周就得补一次，懒癌慎冲"
    ],
    definition: "冰透裸粉叠奶白渐变，清透不浮夸，纯欲感和通勤感都在线，适合想要低调显气质的人。",
    thumb: "linear-gradient(135deg, #f9e1dc, #fffdfb 54%, #dfc8c0)",
    accent: "#ead1cb",
    nail: "linear-gradient(120deg, #f3cfc8 0 48%, #fff9f5 49% 82%, #e9d7d1)",
    recommendBucket: "stable",
    hotScore: 88
  }
];

const nails = nailStyleDB;
const filterState = {
  primary: "全部",
  secondary: "全部"
};
const selectedTryOnIds = new Set();
let batchResults = [];
let chatHistory = [];
let batchHandPreviewUrl = "";
let currentUser = null;
let handModelPreviewUrl = "";
let styleVisibilityObserver = null;
const validVisibilityEvents = new Set();
const IMPRESSION_RATIO = 0.5;
const IMPRESSION_MS = 1000;
const VIEW_RATIO = 0.7;
const VIEW_MS = 2000;

const grid = document.querySelector("#nailGrid");
const primaryFilters = document.querySelector("#primaryFilters");
const secondaryFilters = document.querySelector("#secondaryFilters");
const filterStatus = document.querySelector("#filterStatus");
const tryonBasket = document.querySelector("#tryonBasket");
const batchTryonBtn = document.querySelector("#batchTryonBtn");
const batchHyperrealTryonBtn = document.querySelector("#batchHyperrealTryonBtn");
const batchHandUpload = document.querySelector("#batchHandUpload");
const batchHandLabel = document.querySelector("#batchHandLabel");
const batchProgressBar = document.querySelector("#batchProgressBar");
const batchProgressText = document.querySelector("#batchProgressText");
const resultToast = document.querySelector("#resultToast");
const toastText = document.querySelector("#toastText");
const batchResultGrid = document.querySelector("#batchResultGrid");
const batchEmpty = document.querySelector("#batchEmpty");
const tabs = document.querySelectorAll(".tab");
const pages = document.querySelectorAll(".page");
const userLoginState = document.querySelector("#userLoginState");
const currentUserId = document.querySelector("#currentUserId");
const dataPageUserId = document.querySelector("#dataPageUserId");
const mockLoginBtn = document.querySelector("#mockLoginBtn");
const dialog = document.querySelector("#tryonDialog");
const dialogArt = document.querySelector("#dialogArt");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogDesc = document.querySelector("#dialogDesc");
const dialogIntentBtn = document.querySelector("#dialogIntentBtn");
const dialogConfirmBtn = document.querySelector("#dialogConfirmBtn");
const styleUpload = document.querySelector("#styleUpload");
const handUpload = document.querySelector("#handUpload");
const stylePreview = document.querySelector("#stylePreview");
const handPreview = document.querySelector("#handPreview");
const tryonResult = document.querySelector("#tryonResult");
const handModelBtn = document.querySelector("#handModelBtn");
const hyperrealComposeBtn = document.querySelector("#hyperrealComposeBtn");
const handModelResult = document.querySelector("#handModelResult");
const nailSegmentBtn = document.querySelector("#nailSegmentBtn");
const nailSegmentResult = document.querySelector("#nailSegmentResult");
const recommendResults = document.querySelector("#recommendResults");
const recommendUpload = document.querySelector("#recommendUpload");
const recommendPreview = document.querySelector("#recommendPreview");
const chatWindow = document.querySelector("#chatWindow");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const memoryList = document.querySelector("#memoryList");
const metricCards = document.querySelector("#metricCards");
const metricStyleRows = document.querySelector("#metricStyleRows");
const metricRecentEvents = document.querySelector("#metricRecentEvents");
const refreshMetricsBtn = document.querySelector("#refreshMetricsBtn");
const simulationCards = document.querySelector("#simulationCards");
const simulationHotList = document.querySelector("#simulationHotList");
const simulationColdList = document.querySelector("#simulationColdList");
const simulationModelReport = document.querySelector("#simulationModelReport");
const refreshSimulationBtn = document.querySelector("#refreshSimulationBtn");
const wantListGrid = document.querySelector("#wantListGrid");
const wantEmpty = document.querySelector("#wantEmpty");
const orderListGrid = document.querySelector("#orderListGrid");
const orderEmpty = document.querySelector("#orderEmpty");
const refreshWantListBtn = document.querySelector("#refreshWantListBtn");

function switchPage(pageId) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.page === pageId));
  pages.forEach((page) => page.classList.toggle("active", page.id === pageId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function makeLocalId(prefix) {
  const random = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function loadCurrentUser() {
  const saved = localStorage.getItem("nail_tryon_user");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem("nail_tryon_user");
    }
  }
  const user = {
    userId: makeLocalId("anon"),
    identityType: "anonymous",
    provider: "device",
    createdAt: new Date().toISOString()
  };
  localStorage.setItem("nail_tryon_user", JSON.stringify(user));
  return user;
}

function renderCurrentUser() {
  if (!currentUser) return;
  const isLoggedIn = currentUser.identityType === "logged_in";
  userLoginState.textContent = isLoggedIn ? "已登录用户" : "匿名用户";
  currentUserId.textContent = currentUser.userId;
  dataPageUserId.textContent = currentUser.userId;
  mockLoginBtn.textContent = isLoggedIn ? "已绑定" : "模拟登录";
  mockLoginBtn.disabled = isLoggedIn;
}

function mockLogin() {
  currentUser = {
    ...currentUser,
    identityType: "logged_in",
    provider: "wechat_mock",
    providerUserId: makeLocalId("openid"),
    loggedInAt: new Date().toISOString()
  };
  localStorage.setItem("nail_tryon_user", JSON.stringify(currentUser));
  renderCurrentUser();
}

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]))];
}

function currentFilteredNails() {
  return nails.filter((item) => {
    const primaryMatch = filterState.primary === "全部" || item.primaryTag === filterState.primary;
    const secondaryMatch = filterState.secondary === "全部" || item.secondaryTag === filterState.secondary;
    return primaryMatch && secondaryMatch;
  });
}

const catalogRecommendSlots = [
  { slotType: "hero_full_1", userLabel: "今日精选", reason: "hot_conversion", bucket: "hot" },
  { slotType: "hero_full_2", userLabel: "店内常做款", reason: "stable_confirm", bucket: "stable" },
  { slotType: "hero_full_3", userLabel: "小众但好看", reason: "potential_activation", bucket: "potential" },
  { slotType: "hero_full_4", userLabel: "适合你试试", reason: "personalized_tag_match", bucket: "new" },
  { slotType: "peek_half_1", userLabel: "正在流行", reason: "hot_continuation", bucket: "hot" },
  { slotType: "peek_half_2", userLabel: "新款灵感", reason: "potential_second_test", bucket: "potential" },
  { slotType: "peek_half_3", userLabel: "店长推荐", reason: "new_style_test", bucket: "new" },
  { slotType: "peek_half_4", userLabel: "换个风格", reason: "diversity_fill", bucket: "diversity" }
];

function pickRecommendedItem(pool, slot, usedIds) {
  const preferred = pool.find((item) => item.recommendBucket === slot.bucket && !usedIds.has(item.id));
  const fallback = pool.find((item) => !usedIds.has(item.id));
  const repeat = pool.find((item) => item.recommendBucket === slot.bucket) || pool[0];
  const item = preferred || fallback || repeat;
  if (item && !usedIds.has(item.id)) usedIds.add(item.id);
  return item;
}

function buildCatalogRecommendationFlow(pool) {
  if (!pool.length) return [];
  const usedIds = new Set();
  return catalogRecommendSlots.map((slot, index) => {
    const item = pickRecommendedItem(pool, slot, usedIds);
    return {
      ...item,
      recommendSlot: {
        ...slot,
        position: index + 1,
        visibleMode: index < 4 ? "完整露出" : "半露出"
      }
    };
  });
}

function renderFilterButtons(container, values, activeValue, level) {
  container.innerHTML = values.map((value) => `
    <button class="pill ${value === activeValue ? "active" : ""}" data-filter-level="${level}" data-filter-value="${value}">
      ${value}
    </button>
  `).join("");
}

function renderFilters() {
  const primaryValues = ["全部", ...uniqueValues(nails, "primaryTag")];
  const secondarySource = filterState.primary === "全部"
    ? nails
    : nails.filter((item) => item.primaryTag === filterState.primary);
  const secondaryValues = ["全部", ...uniqueValues(secondarySource, "secondaryTag")];

  if (!secondaryValues.includes(filterState.secondary)) {
    filterState.secondary = "全部";
  }

  renderFilterButtons(primaryFilters, primaryValues, filterState.primary, "primary");
  renderFilterButtons(secondaryFilters, secondaryValues, filterState.secondary, "secondary");
}

function renderCards(items = currentFilteredNails()) {
  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">没有符合当前标签的款式，可以切回“全部”看看。</div>`;
    return;
  }

  grid.innerHTML = items.map((item, index) => `
    <article
      class="nail-card ${item.recommendSlot?.position > 4 ? "peek-slot" : "full-slot"}"
      data-style-id="${item.id}"
      data-position-index="${index + 1}"
      data-slot-type="${item.recommendSlot?.slotType || ""}"
      data-recommend-reason="${item.recommendSlot?.reason || ""}"
    >
      <button class="nail-thumb ${item.image ? "has-image" : ""}" style="--thumb: ${item.thumb}; --nail: ${item.nail}; --accent: ${item.accent}" data-id="${item.id}" aria-label="试戴${item.name}">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" />` : ""}
        ${item.recommendSlot ? `<span class="recommend-label">${item.recommendSlot.userLabel}</span>` : ""}
      </button>
      <div class="card-body">
        <div class="card-title-row">
          <h3>${item.name}</h3>
          <div class="tag-stack">
            <span class="tag">${item.primaryTag}</span>
            <span class="tag sub-tag">${item.secondaryTag}</span>
          </div>
        </div>
        <p class="definition">${item.definition}</p>
        <div class="stats-row">
          <span>${item.likes} 点赞</span>
          <span>评分 ${item.rating}/5.0</span>
        </div>
        <div class="review-list">
          ${item.reviews.map((review) => `<div class="review">“${review}”</div>`).join("")}
        </div>
        <div class="card-actions">
          <button class="select-action ${selectedTryOnIds.has(item.id) ? "selected" : ""}" data-select-tryon="${item.id}">
            ${selectedTryOnIds.has(item.id) ? "已加入试戴" : "加入试戴"}
          </button>
          <button class="select-action" data-intent-style="${item.id}" data-intent-name="${escapeHTML(item.name)}" data-tryon-job="" data-intent-source="card">我想做</button>
          <button class="primary-action compact-primary" data-confirm-style="${item.id}" data-confirm-name="${escapeHTML(item.name)}" data-tryon-job="" data-confirm-source="card">确认要做</button>
          <span class="preview-action">点图片看单款试戴</span>
        </div>
      </div>
    </article>
  `).join("");
  setupStyleVisibilityTracking(items);
}

function updateTryOnBasket() {
  const count = selectedTryOnIds.size;
  tryonBasket.querySelector("strong").textContent = `已加入试戴 ${count} 款`;
  tryonBasket.querySelector("span").textContent = count
    ? "上传一张手图后，可批量生成真实试戴效果"
    : "可多选款式后批量生成试戴结果";
  batchTryonBtn.disabled = count === 0 || !batchHandUpload.files?.length;
  batchHyperrealTryonBtn.disabled = count === 0 || !batchHandUpload.files?.length;
}

function updateCatalog() {
  const filteredItems = currentFilteredNails();
  const items = buildCatalogRecommendationFlow(filteredItems);
  renderFilters();
  renderCards(items);
  updateTryOnBasket();
  const primaryText = filterState.primary === "全部" ? "全部一级标签" : `一级：${filterState.primary}`;
  const secondaryText = filterState.secondary === "全部" ? "全部二级标签" : `二级：${filterState.secondary}`;
  filterStatus.textContent = `当前筛选 ${primaryText} / ${secondaryText}，共 ${filteredItems.length} 款；推荐流按 8 个位置循环混排`;
}

function openTryOn(id) {
  const item = nails.find((nail) => nail.id === id);
  if (!item) return;
  trackEvent("style_card_click", item);
  trackEvent("detail_view", item, { page_source: "catalog", source: "card", action_result: "success" });
  dialogArt.style.setProperty("--dialog-bg", item.thumb);
  dialogArt.innerHTML = item.image ? `<img src="${item.image}" alt="${item.name}" />` : "";
  dialogTitle.textContent = `${item.name}试戴`;
  dialogDesc.textContent = `${item.definition} 当前店内笔记 ${item.likes} 点赞，用户评分 ${item.rating}/5.0。`;
  dialogIntentBtn.dataset.intentStyle = item.id;
  dialogIntentBtn.dataset.intentName = item.name;
  dialogIntentBtn.dataset.tryonJob = "";
  dialogIntentBtn.dataset.intentSource = "detail";
  dialogIntentBtn.disabled = false;
  dialogIntentBtn.textContent = "加入我想做";
  dialogConfirmBtn.dataset.confirmStyle = item.id;
  dialogConfirmBtn.dataset.confirmName = item.name;
  dialogConfirmBtn.dataset.tryonJob = "";
  dialogConfirmBtn.dataset.confirmSource = "detail";
  dialogConfirmBtn.disabled = false;
  dialogConfirmBtn.textContent = "确认要做";
  dialog.showModal();
}

function previewFile(input, slot) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    slot.innerHTML = `<img src="${reader.result}" alt="上传预览" />`;
  };
  reader.readAsDataURL(file);
}

function previewRecommendPhoto() {
  const file = recommendUpload.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    recommendPreview.innerHTML = `
      <img class="uploaded-hand" src="${reader.result}" alt="上传的手部照片" />
      <img class="hand-guide-overlay" src="./assets/hand-guide-outline.png" alt="" />
      <small>已上传，可继续描述需求</small>
    `;
  };
  reader.readAsDataURL(file);
}

async function generateTryOn(level = "normal") {
  const styleFile = styleUpload.files?.[0];
  const handFile = handUpload.files?.[0];

  if (!styleFile || !handFile) {
    tryonResult.innerHTML = `<p>请先上传美甲款式图片和手部图片。</p>`;
    return;
  }

  const formData = new FormData();
  formData.append("styleImage", styleFile);
  formData.append("handImage", handFile);
  formData.append("userId", currentUser.userId);
  formData.append("styleId", "custom_upload");
  formData.append("styleName", styleFile.name || "自定义上传款式");

  const isHyperreal = level === "hyperreal";
  tryonResult.innerHTML = `<div class="loading-state">${isHyperreal ? "正在走超仿真慢接口" : "正在走普通快速接口"}，当前为模拟生成并写入试戴数据...</div>`;
  trackEvent("tryon_click", { id: "custom_upload" }, {
    style_name: styleFile.name || "自定义上传款式",
    tryon_source: "custom_upload",
    try_on_type: level,
    action_result: "success"
  });

  try {
    const response = await fetch(isHyperreal ? "/api/hyperreal-tryon-generate" : "/api/tryon-generate", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "生成失败");

    tryonResult.innerHTML = `
      <div class="generated-result">
        <img src="${data.resultUrl}" alt="AI 美甲试戴效果图" />
        <div class="result-links">
          <span>${isHyperreal ? "超仿真试戴" : "普通试戴"}</span>
          <a href="${data.handUrl}" target="_blank">用户手图</a>
          <a href="${data.styleUrl}" target="_blank">美甲款式</a>
          <a href="${data.resultUrl}" target="_blank">生成效果图</a>
        </div>
        <div class="result-actions">
          <button class="primary-action" data-confirm-style="custom_upload" data-confirm-name="自定义上传款式" data-tryon-job="${data.id}" data-confirm-source="tryon_result">确认要做</button>
          <button class="select-action" data-intent-style="custom_upload" data-intent-name="自定义上传款式" data-tryon-job="${data.id}" data-intent-source="tryon_result">我想做</button>
        </div>
      </div>
    `;
    window.setTimeout(() => {
      trackEvent("tryon_result_view", { id: "custom_upload" }, {
        style_name: styleFile.name || "自定义上传款式",
        try_on_job_id: data.id,
        result_visible_duration_ms: 1000,
        generate_status: "success"
      });
    }, 1000);
    loadMetricsSummary();
  } catch (error) {
    tryonResult.innerHTML = `<p>${isHyperreal ? "超仿真试戴" : "普通试戴"}失败：${escapeHTML(error.message)}。</p>`;
  }
}
async function generateHandModel() {
  const handFile = handUpload.files?.[0];
  if (!handFile) {
    handModelResult.innerHTML = `<p>请先上传或拍摄一张手部图片。</p>`;
    return;
  }

  const formData = new FormData();
  formData.append("file", handFile);
  handModelBtn.disabled = true;
  handModelBtn.textContent = "模型生成中...";
  handModelResult.innerHTML = `<div class="loading-state">正在调用 clean WiLoR，生成 2D 点位、3D 网格和交叠判断...</div>`;

  try {
    const response = await fetch("/api/hand-detect-clean", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error || "手部模型生成失败");
    }

    const layers = Array.isArray(data.hand_layers) ? data.hand_layers : [];
    const relations = Array.isArray(data.visual_occlusion_relations) ? data.visual_occlusion_relations : [];
    const layerText = layers.length
      ? layers.map((hand) => `${hand.layer_rank === 0 ? "上层" : "下层"}：${hand.hand_side_label || hand.hand_side || `#${hand.hand_index}`}`).join(" / ")
      : "未检测到明显双手交叠层级";
    const relationText = relations.length
      ? relations.slice(0, 2).map((item) => `#${item.occluding_hand} 压住 #${item.occluded_hand}`).join("，")
      : "暂无明确遮挡关系";

    handModelResult.innerHTML = `
      <div class="hand-model-output">
        <img src="${data.imageUrl}?t=${Date.now()}" alt="手部 2D 点位与 3D 网格对照" />
        <div class="result-links">
          <a href="${data.keypointsUrl}" target="_blank">2D 点位图</a>
          <a href="${data.meshUrl}" target="_blank">3D 网格图</a>
          <a href="${data.jsonUrl}" target="_blank">判断 JSON</a>
        </div>
        <p class="analysis-note">检测到 ${data.num_hands || 0} 只手。${layerText}。${relationText}。</p>
      </div>
    `;
  } catch (error) {
    handModelResult.innerHTML = `<p>${escapeHTML(error.message)}。请确认 nail-api Docker 容器正在运行。</p>`;
  } finally {
    handModelBtn.disabled = false;
    handModelBtn.textContent = "生成手部模型";
  }
}
function renderNailSegmentResult(data) {
  const items = Array.isArray(data.detections) ? data.detections : [];
  const layers = Array.isArray(data.hand_layers) ? data.hand_layers : [];
  const layerText = layers.length
    ? layers.map((hand) => `${hand.layer_rank === 0 ? "上层" : "下层"}：${hand.hand_side_label}`).join(" · ")
    : "";
  const list = items.map((item) => {
    const assignment = item.assignment || {};
    const label = assignment.assigned
      ? `${assignment.hand_side_label}${assignment.finger_label}`
      : "未匹配到手指";
    const bbox = Array.isArray(item.bbox) ? item.bbox.map((value) => Math.round(value)).join(", ") : "";
    return `
      <li>
        <strong>#${item.id}</strong>
        <span>${label} · 置信度 ${(Number(item.confidence || 0) * 100).toFixed(1)}%</span>
        <code>[${bbox}]</code>
      </li>
    `;
  }).join("");

  nailSegmentResult.innerHTML = `
    <div class="nail-seg-output">
      <img src="${data.imageUrl}?t=${Date.now()}" alt="指甲分割识别结果" />
      ${layerText ? `<p class="analysis-note">${layerText}</p>` : ""}
      <ul class="nail-detection-list">
        ${list || "<li><span>没有检测到指甲区域</span></li>"}
      </ul>
    </div>
  `;
}

async function generateNailSegmentation() {
  const handFile = handUpload.files?.[0];
  if (!handFile) {
    nailSegmentResult.innerHTML = `<p>请先上传或拍摄一张手部图片。</p>`;
    return;
  }

  const formData = new FormData();
  formData.append("file", handFile);
  nailSegmentBtn.disabled = true;
  nailSegmentBtn.textContent = "识别中...";
  nailSegmentResult.innerHTML = `<div class="loading-state">正在识别指甲分割、横框和手指归属...</div>`;

  try {
    const response = await fetch("/api/nail-segment", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error || "指甲识别失败");
    }
    renderNailSegmentResult(data);
  } catch (error) {
    nailSegmentResult.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
  } finally {
    nailSegmentBtn.disabled = false;
    nailSegmentBtn.textContent = "识别指甲位置";
  }
}

function renderBatchResults() {
  batchEmpty.classList.toggle("hidden", batchResults.length > 0);
  batchResultGrid.innerHTML = batchResults.map((item) => `
    <article class="batch-card ${item.error ? "failed" : ""}">
      <div class="batch-result-media ${item.resultUrl ? "ready" : ""}">
        ${item.resultUrl
          ? `<img src="${item.resultUrl}" alt="${item.name}试戴效果图" />`
          : item.error
            ? `<em>生成失败：${escapeHTML(item.error)}</em>`
            : `<em>正在生成，结果图出来后会显示在这里</em>`}
      </div>
      <div class="batch-card-body">
        <h3>${item.name}</h3>
        <div class="tag-stack">
          <span class="tag">${item.primaryTag}</span>
          <span class="tag sub-tag">${item.secondaryTag}</span>
        </div>
        <p>${item.resultUrl ? "已生成真实试戴效果图。" : item.error ? "这张生成失败，可以稍后重试。" : "正在等待生成结果。"}</p>
        ${item.resultUrl ? `<a class="result-file-link" href="${item.resultUrl}" target="_blank">查看已保存图片</a>` : ""}
        ${item.resultUrl ? `
          <div class="result-actions compact-actions">
            <button class="primary-action compact-primary" data-confirm-style="${item.id}" data-confirm-name="${escapeHTML(item.name)}" data-tryon-job="${item.tryOnJobId || ""}" data-confirm-source="tryon_result">确认要做</button>
            <button class="select-action" data-intent-style="${item.id}" data-intent-name="${escapeHTML(item.name)}" data-tryon-job="${item.tryOnJobId || ""}" data-intent-source="tryon_result">我想做</button>
          </div>
        ` : ""}
      </div>
    </article>
  `).join("");
}

function showResultToast(count) {
  toastText.textContent = `一键试戴已生成 ${count} 个结果`;
  resultToast.classList.add("show");
}

function updateBatchProgress(done, total, label = "") {
  const percent = total ? Math.round((done / total) * 100) : 0;
  batchProgressBar.style.width = `${percent}%`;
  batchProgressText.textContent = label || `生成进度 ${done}/${total}`;
}

async function fileFromUrl(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`读取款式图失败：${filename}`);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

async function requestTryOn(item, handFile, level = "normal") {
  trackEvent("tryon_click", item, {
    tryon_source: "batch_results",
    try_on_type: level,
    action_result: "success"
  });
  const styleFile = await fileFromUrl(item.image, `${item.id}.jpg`);
  const formData = new FormData();
  formData.append("styleImage", styleFile);
  formData.append("handImage", handFile);
  formData.append("userId", currentUser.userId);
  formData.append("styleId", item.id);
  formData.append("styleName", item.name);

  const response = await fetch(level === "hyperreal" ? "/api/hyperreal-tryon-generate" : "/api/tryon-generate", {
    method: "POST",
    body: formData
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.detail || "生成失败");
  window.setTimeout(() => {
    trackEvent("tryon_result_view", item, {
      try_on_job_id: data.id,
      result_visible_duration_ms: 1000,
      generate_status: "success"
    });
  }, 1000);
  return data;
}

async function generateBatchTryOn(level = "normal") {
  const pending = nails.filter((item) => selectedTryOnIds.has(item.id));
  if (!pending.length) return;
  const handFile = batchHandUpload.files?.[0];
  if (!handFile) {
    updateBatchProgress(0, pending.length, "请先上传一张用户手图");
    return;
  }

  const isHyperreal = level === "hyperreal";
  batchTryonBtn.disabled = true;
  batchHyperrealTryonBtn.disabled = true;
  batchTryonBtn.textContent = isHyperreal ? "等待中..." : "生成中...";
  batchHyperrealTryonBtn.textContent = isHyperreal ? "超仿真生成中..." : "等待中...";
  resultToast.classList.remove("show");
  if (batchHandPreviewUrl) URL.revokeObjectURL(batchHandPreviewUrl);
  batchHandPreviewUrl = URL.createObjectURL(handFile);
  batchResults = pending.map((item) => ({
    ...item,
    stylePreviewUrl: item.image,
    handPreviewUrl: batchHandPreviewUrl
  }));
  renderBatchResults();
  switchPage("batchResults");
  updateBatchProgress(0, pending.length, isHyperreal ? "开始超仿真慢任务..." : "开始普通批量生成...");

  for (let index = 0; index < pending.length; index += 1) {
    const item = pending[index];
    updateBatchProgress(index, pending.length, `${isHyperreal ? "超仿真试戴" : "普通试戴"} ${index + 1}/${pending.length}：${item.name}`);
    try {
      const data = await requestTryOn(item, handFile, level);
      batchResults[index] = { ...batchResults[index], ...data, id: item.id, tryOnJobId: data.id };
    } catch (error) {
      batchResults[index] = { ...batchResults[index], error: error.message };
    }
    renderBatchResults();
    updateBatchProgress(index + 1, pending.length, `已完成 ${index + 1}/${pending.length}`);
  }

  showResultToast(batchResults.filter((item) => item.resultUrl).length);
  batchTryonBtn.textContent = "一键试戴";
  batchHyperrealTryonBtn.textContent = "超仿真试戴";
  updateTryOnBasket();
}

function renderMiniPicks(picks = nails.slice(0, 3)) {
  recommendResults.innerHTML = picks.map((item) => `
    <article class="mini-pick">
      <img src="${item.image}" alt="${item.name}" />
      <div>
        <h3>${item.name}</h3>
        <p>${item.primaryTag}/${item.secondaryTag} · ${item.rating}/5.0 · ${item.likes} 点赞</p>
      </div>
    </article>
  `).join("");
}

function visibilityKey(type, styleId, slotType = "") {
  const day = new Date().toISOString().slice(0, 10);
  return `${type}:${currentUser?.userId || "anonymous"}:${styleId}:${slotType}:${day}`;
}

function trackValidVisibility(type, item, meta) {
  const key = visibilityKey(type, item.id, meta.slot_type || "");
  if (validVisibilityEvents.has(key)) return;
  validVisibilityEvents.add(key);
  trackEvent(type, item, meta);
}

function setupStyleVisibilityTracking(items) {
  if (styleVisibilityObserver) styleVisibilityObserver.disconnect();
  const cardState = new WeakMap();
  const itemById = new Map(items.map((item) => [item.id, item]));

  document.querySelectorAll(".nail-card[data-style-id]").forEach((card) => {
    const item = itemById.get(card.dataset.styleId);
    if (!item) return;
    trackEvent("style_card_render", item, {
      page_source: "catalog",
      position_index: Number(card.dataset.positionIndex || 0),
      slot_type: card.dataset.slotType || "",
      recommend_source: "mixed_recommendation_flow",
      recommend_reason: card.dataset.recommendReason || ""
    });
  });

  styleVisibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const card = entry.target;
      const item = itemById.get(card.dataset.styleId);
      if (!item) return;

      const ratio = Number(entry.intersectionRatio || 0);
      const rect = card.getBoundingClientRect();
      const maxPossibleViewRatio = Math.min(1, window.innerHeight / Math.max(rect.height, 1));
      const effectiveViewRatio = Math.min(VIEW_RATIO, maxPossibleViewRatio);
      const state = cardState.get(card) || {};
      const meta = {
        page_source: "catalog",
        position_index: Number(card.dataset.positionIndex || 0),
        slot_type: card.dataset.slotType || "",
        recommend_source: "mixed_recommendation_flow",
        recommend_reason: card.dataset.recommendReason || "",
        visible_ratio: Number(ratio.toFixed(4)),
        effective_view_ratio: Number(effectiveViewRatio.toFixed(4))
      };

      if (ratio >= IMPRESSION_RATIO && !state.impressionTimer) {
        state.impressionStartedAt = performance.now();
        state.impressionTimer = window.setTimeout(() => {
          trackValidVisibility("style_impression", item, {
            ...meta,
            visible_duration_ms: Math.round(performance.now() - state.impressionStartedAt),
            is_valid_impression: true
          });
        }, IMPRESSION_MS);
      }
      if (ratio < IMPRESSION_RATIO && state.impressionTimer) {
        window.clearTimeout(state.impressionTimer);
        state.impressionTimer = null;
      }

      if (ratio >= effectiveViewRatio && !state.viewTimer) {
        state.viewStartedAt = performance.now();
        state.viewTimer = window.setTimeout(() => {
          trackValidVisibility("style_view", item, {
            ...meta,
            visible_duration_ms: Math.round(performance.now() - state.viewStartedAt),
            is_valid_view: true
          });
        }, VIEW_MS);
      }
      if (ratio < effectiveViewRatio && state.viewTimer) {
        window.clearTimeout(state.viewTimer);
        state.viewTimer = null;
      }

      cardState.set(card, state);
    });
  }, { threshold: [0, IMPRESSION_RATIO, VIEW_RATIO, 1] });

  document.querySelectorAll(".nail-card[data-style-id]").forEach((card) => styleVisibilityObserver.observe(card));
}

async function trackEvent(eventName, item = null, properties = {}) {
  try {
    await fetch("/api/analytics-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        userId: currentUser?.userId || "anonymous",
        styleId: item?.id || properties.styleId || null,
        entityId: properties.entityId || null,
        properties: {
          style_name: item?.name || properties.styleName,
          ...properties
        }
      })
    });
  } catch {
    // Metrics are useful but should never block the prototype UI.
  }
}

async function submitIntent(styleId, styleName, tryOnJobId, source = "unknown") {
  trackEvent("want_click", { id: styleId }, {
    style_name: styleName,
    try_on_job_id: tryOnJobId || "",
    want_source: source,
    action_result: "success"
  });
  trackEvent("style_intent_click", { id: styleId }, {
    style_name: styleName,
    try_on_job_id: tryOnJobId || "",
    intent_source: source
  });
  const response = await fetch("/api/style-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: currentUser.userId,
      styleId,
      styleName,
      tryOnJobId,
      source
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "提交意向失败");
  toastText.textContent = `已加入“我想做”：${styleName}`;
  resultToast.classList.add("show");
  await loadMockRecords();
  await loadMetricsSummary();
}

async function confirmOrder(styleId, styleName, tryOnJobId, source = "unknown") {
  trackEvent("confirm_click", { id: styleId }, {
    style_name: styleName,
    try_on_job_id: tryOnJobId || "",
    confirm_source: source,
    action_result: "success"
  });
  trackEvent("style_confirm_click", { id: styleId }, {
    style_name: styleName,
    try_on_job_id: tryOnJobId || "",
    confirm_source: source
  });
  const response = await fetch("/api/confirm-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: currentUser.userId,
      styleId,
      styleName,
      tryOnJobId,
      source,
      amount: 198
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "确认做失败");
  toastText.textContent = `已生成预约成交：${styleName}`;
  resultToast.classList.add("show");
  await loadMockRecords();
  await loadMetricsSummary();
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function renderMetrics(data) {
  if (!metricCards || !metricStyleRows || !metricRecentEvents) return;
  const totals = data.totals || {};
  metricCards.innerHTML = [
    ["曝光", totals.exposures || 0],
    ["加入试戴", totals.candidates || 0],
    ["模拟试戴", totals.try_ons || 0],
    ["我想做", totals.intents || 0],
    ["确认做/下单", totals.orders || 0],
    ["试戴后确认率", percent(totals.tryon_confirm_rate)],
    ["直接确认率", percent(totals.direct_confirm_rate)],
    ["总确认率", percent(totals.total_confirm_rate)]
  ].map(([label, value]) => `
    <article class="metric-card-live">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");

  metricStyleRows.innerHTML = (data.styles || []).slice(0, 8).map((row) => `
    <div class="metric-row metric-row-live">
      <span>${escapeHTML(row.style_name || row.style_id)}</span>
      <span>${row.exposures}</span>
      <span>${row.candidates}</span>
      <span>${row.try_ons}</span>
      <span>${row.intents}</span>
      <span>${row.orders}</span>
      <span>${percent(row.intent_rate)}</span>
    </div>
  `).join("") || `<div class="empty-state">还没有模拟数据，先去款式概览加入试戴并生成。</div>`;

  metricRecentEvents.innerHTML = (data.recent_events || []).map((event) => `
    <li><strong>${event.event_name}</strong><span>${event.style_id || "--"} · ${new Date(event.created_at).toLocaleTimeString()}</span></li>
  `).join("") || `<li><span>暂无事件</span></li>`;
}

async function loadMetricsSummary() {
  if (!metricCards) return;
  try {
    const response = await fetch("/api/metrics-summary");
    const data = await response.json();
    renderMetrics(data);
  } catch {
    metricCards.innerHTML = `<article class="metric-card-live"><span>指标服务</span><strong>未连接</strong></article>`;
  }
}

function renderSimulationSummary(data) {
  if (!simulationCards || !simulationHotList || !simulationColdList || !simulationModelReport) return;
  const report = data.model_report_true_3class || data.model_report_3class || {};
  simulationCards.innerHTML = [
    ["款式数", data.n_styles || 0],
    ["天数", data.n_days || 0],
    ["日数据行", data.n_daily_rows || 0],
    ["周窗口行", data.n_weekly_rows || 0],
    ["三分类准确率", percent(report.accuracy)],
    ["Macro F1", percent(report.macro_f1)]
  ].map(([label, value]) => `
    <article class="metric-card-live">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");

  const renderRows = (rows, type) => (rows || []).slice(0, 6).map((row) => `
    <div class="simulation-item">
      <strong>${escapeHTML(row.style_id)} · ${escapeHTML(row.category)}</strong>
      <span>${escapeHTML(row.label || row.true_state)} · 浏览 ${row.view_uv} · 试戴 ${row.tryon_uv} · 确认 ${row.total_confirm_uv}</span>
      <small>${type === "cold" ? `冷门分 ${Number(row.cold_risk_score || 0).toFixed(2)}` : `热门分 ${Number(row.hot_score || 0).toFixed(2)}`} · 增长 ${Number(row.growth_score || 0).toFixed(2)}</small>
    </div>
  `).join("") || `<div class="empty-state">暂无数据</div>`;

  simulationHotList.innerHTML = renderRows(data.top_hot, "hot");
  simulationColdList.innerHTML = renderRows(data.top_cold, "cold");
  simulationModelReport.innerHTML = (report.class_report || []).map((row) => `
    <div class="simulation-item">
      <strong>${escapeHTML(row.label)}</strong>
      <span>Precision ${percent(row.precision)} · Recall ${percent(row.recall)} · F1 ${percent(row.f1)}</span>
      <small>测试样本 ${row.support}</small>
    </div>
  `).join("") || `<div class="empty-state">请先运行模拟脚本。</div>`;
}

async function loadSimulationSummary() {
  if (!simulationCards) return;
  try {
    const response = await fetch("/api/simulation-summary");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "没有模拟结果");
    renderSimulationSummary(data);
  } catch (error) {
    simulationCards.innerHTML = `<article class="metric-card-live"><span>模拟系统</span><strong>未生成</strong></article>`;
    if (simulationHotList) simulationHotList.innerHTML = `<div class="empty-state">${escapeHTML(error.message)}</div>`;
    if (simulationColdList) simulationColdList.innerHTML = "";
    if (simulationModelReport) simulationModelReport.innerHTML = "";
  }
}

function renderMockRecords(data) {
  if (!wantListGrid || !orderListGrid) return;
  const intents = data.intents || [];
  const orders = data.orders || [];
  const tryOnById = new Map((data.try_on_jobs || []).map((job) => [job.id, job]));
  const pendingIntents = intents.filter((intent) => !orders.some((order) => (
    order.style_id === intent.style_id
    && (order.try_on_job_id || "") === (intent.try_on_job_id || "")
  )));

  wantEmpty.classList.toggle("hidden", pendingIntents.length > 0);
  wantListGrid.innerHTML = pendingIntents.map((intent) => {
    const tryOn = tryOnById.get(intent.try_on_job_id) || {};
    return `
      <article class="batch-card">
        <div class="batch-result-media ${tryOn.result_url ? "ready" : ""}">
          ${tryOn.result_url ? `<img src="${tryOn.result_url}" alt="${escapeHTML(intent.style_name)}试戴图" />` : `<em>从款式/详情加入</em>`}
        </div>
        <div class="batch-card-body">
          <h3>${escapeHTML(intent.style_name || intent.style_id)}</h3>
          <p>强意向加购 · ${new Date(intent.created_at).toLocaleString()}</p>
          <div class="result-actions compact-actions">
            ${tryOn.result_url ? `<a class="result-file-link" href="${tryOn.result_url}" target="_blank">查看试戴图</a>` : ""}
            <button class="primary-action" data-confirm-style="${intent.style_id}" data-confirm-name="${escapeHTML(intent.style_name || intent.style_id)}" data-tryon-job="${intent.try_on_job_id || ""}" data-confirm-source="want_list">确认做/下单</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  orderEmpty.classList.toggle("hidden", orders.length > 0);
  orderListGrid.innerHTML = orders.map((order) => {
    const tryOn = tryOnById.get(order.try_on_job_id) || {};
    return `
      <article class="batch-card">
        <div class="batch-result-media ${tryOn.result_url ? "ready" : ""}">
          ${tryOn.result_url ? `<img src="${tryOn.result_url}" alt="${escapeHTML(order.style_name)}预约成交图" />` : `<em>预约成交</em>`}
        </div>
        <div class="batch-card-body">
          <h3>${escapeHTML(order.style_name || order.style_id)}</h3>
          <p>预约成交 · 金额模拟 ¥${Number(order.amount || 0).toFixed(0)}</p>
          <p>状态：${order.status === "confirmed" ? "已确认做" : escapeHTML(order.status || "pending")}</p>
          <small>${new Date(order.ordered_at).toLocaleString()}</small>
          ${tryOn.result_url ? `<a class="result-file-link" href="${tryOn.result_url}" target="_blank">查看试戴图</a>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

async function loadMockRecords() {
  if (!wantListGrid) return;
  try {
    const response = await fetch("/api/mock-records");
    const data = await response.json();
    renderMockRecords(data);
  } catch {
    wantListGrid.innerHTML = `<div class="empty-state">记录服务暂时不可用。</div>`;
  }
}

function escapeHTML(text) {
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function addMessage(role, text, extraHtml = "") {
  chatWindow.insertAdjacentHTML("beforeend", `
    <div class="message ${role}">
      ${role === "user" ? "" : '<div class="avatar">AI</div>'}
      <div class="bubble">
        ${escapeHTML(text)}
        ${extraHtml}
      </div>
      ${role === "user" ? '<div class="avatar">我</div>' : ""}
    </div>
  `);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderChatRecommendationCards(picks) {
  if (!picks.length) return "";
  const ids = picks.map((item) => item.id).join(",");
  return `
    <div class="chat-recommendations">
      ${picks.map((item) => `
        <article class="chat-rec-card">
          <img src="${item.image}" alt="${escapeHTML(item.name)}" />
          <div>
            <h3>${escapeHTML(item.name)}</h3>
            <p>${escapeHTML(item.primaryTag)} / ${escapeHTML(item.secondaryTag)} · ${escapeHTML(item.rating)}/5.0</p>
            <button class="select-action ${selectedTryOnIds.has(item.id) ? "selected" : ""}" data-select-tryon="${item.id}">
              ${selectedTryOnIds.has(item.id) ? "已加入" : "加入试戴"}
            </button>
          </div>
        </article>
      `).join("")}
      <div class="chat-rec-actions">
        <button class="primary-action" data-add-recommendations="${ids}">全部加入试戴</button>
        <button class="ghost-action" data-add-recommendations="${ids}" data-page-target="catalog">去一键试戴</button>
      </div>
    </div>
  `;
}

function addRecommendationMessage(text, picks) {
  addMessage("ai", text, renderChatRecommendationCards(picks));
}

function pickByNeed(text) {
  const content = text.toLowerCase();
  if (content.includes("猫眼")) return [nails[1], nails[2], nails[3]];
  if (content.includes("可爱") || content.includes("手绘")) return [nails[0], nails[3], nails[2]];
  if (content.includes("黄") || content.includes("显白")) return [nails[2], nails[1], nails[3]];
  if (content.includes("通勤") || content.includes("面试") || content.includes("低调")) return [nails[3], nails[1], nails[2]];
  return nails.slice(0, 3);
}

function updateMemory(text) {
  const memories = [];
  if (/黄|肤色|显白/.test(text)) memories.push("肤色顾虑：关注显白/黄皮友好");
  if (/短甲|长甲|甲床|本甲/.test(text)) memories.push("甲型信息：需要结合甲长和甲床");
  if (/预算|200|300|价格/.test(text)) memories.push("预算信息：用户提到价格范围");
  if (/不要|担心|介意|慎|翻车|持久/.test(text)) memories.push("禁忌偏好：需要解释风险和维护周期");
  if (/通勤|上班|面试|约会|旅行|婚礼/.test(text)) memories.push("使用场景：已提取场景需求");

  if (!memories.length) return;
  memoryList.innerHTML = memories.map((item) => `<span>${item}</span>`).join("");
}

function applyMemoryItems(items) {
  if (!items.length) return;
  memoryList.innerHTML = items.map((item) => `<span>${escapeHTML(item)}</span>`).join("");
}

function applyRecommendedIds(ids) {
  const picks = ids
    .map((id) => nails.find((item) => item.id === id))
    .filter(Boolean);
  if (picks.length) renderMiniPicks(picks);
  return picks;
}

function localRespondToNeed(text) {
  const hasPhoto = recommendUpload.files?.length > 0;
  const picks = pickByNeed(text);
  renderMiniPicks(picks);
  updateMemory(text);

  const lead = hasPhoto
    ? "看你的需求，这几款更合适。"
    : "先给你挑这几款，上传手图后还能更准。";
  const risk = text.includes("猫眼")
    ? "猫眼很好看，但光泽后面会弱一点。"
    : text.includes("手绘") || text.includes("可爱")
      ? "手绘款建议选图案少一点的，更稳。"
      : "想低调耐看，就优先冰透和裸粉。";

  addRecommendationMessage(`${lead} 我先放这几款，喜欢的话可以直接加入试戴。${risk}`, picks);
}

async function respondToNeed(text) {
  addMessage("ai", "我正在结合店内款式库和你的需求整理推荐...");

  try {
    const response = await fetch("/api/deepseek-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: chatHistory,
        styles: nails,
        hasPhoto: recommendUpload.files?.length > 0,
        memory: [...memoryList.querySelectorAll("span")].map((item) => item.textContent)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "DeepSeek API 调用失败");
    }

    const picks = applyRecommendedIds(data.recommendedIds || []);
    applyMemoryItems(data.memory || []);
    const reply = [data.reply, data.followUpQuestion].filter(Boolean).join(" ");
    addRecommendationMessage(reply, picks);
    chatHistory.push({ role: "user", content: text }, { role: "assistant", content: reply });
    chatHistory = chatHistory.slice(-8);
  } catch (error) {
    addMessage("ai", `DeepSeek 客服暂时没有连上，先用本地规则给你兜底推荐。原因：${error.message}`);
    localRespondToNeed(text);
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchPage(tab.dataset.page));
});

document.addEventListener("click", (event) => {
  const thumb = event.target.closest(".nail-thumb");
  const pageTarget = event.target.closest("[data-page-target]");
  const filterButton = event.target.closest("[data-filter-level]");
  const selectButton = event.target.closest("[data-select-tryon]");
  const addRecommendationsButton = event.target.closest("[data-add-recommendations]");
  if (thumb) openTryOn(thumb.dataset.id);
  if (addRecommendationsButton) {
    addRecommendationsButton.dataset.addRecommendations.split(",").filter(Boolean).forEach((id) => selectedTryOnIds.add(id));
    addRecommendationsButton.dataset.addRecommendations.split(",").filter(Boolean).forEach((id) => {
      const item = nails.find((nail) => nail.id === id);
      if (item) trackEvent("tryon_candidate_add", item, { source: "ai_recommend_all" });
    });
    updateCatalog();
  }
  if (selectButton) {
    const id = selectButton.dataset.selectTryon;
    const item = nails.find((nail) => nail.id === id);
    if (selectedTryOnIds.has(id)) {
      selectedTryOnIds.delete(id);
      if (item) trackEvent("tryon_candidate_remove", item, { source: "catalog" });
      selectButton.classList.remove("selected");
      selectButton.textContent = "加入试戴";
    } else {
      selectedTryOnIds.add(id);
      if (item) trackEvent("tryon_candidate_add", item, { source: "catalog" });
      selectButton.classList.add("selected");
      selectButton.textContent = "已加入";
    }
    updateCatalog();
  }
  if (filterButton) {
    const level = filterButton.dataset.filterLevel;
    const value = filterButton.dataset.filterValue;
    filterState[level] = value;
    if (level === "primary") filterState.secondary = "全部";
    updateCatalog();
  }
  if (pageTarget) {
    if (dialog.open) dialog.close();
    resultToast.classList.remove("show");
    switchPage(pageTarget.dataset.pageTarget);
    if (pageTarget.dataset.pageTarget === "dataDesign") loadMetricsSummary();
    if (pageTarget.dataset.pageTarget === "wantList") loadMockRecords();
  }
});

document.addEventListener("click", async (event) => {
  const intentButton = event.target.closest("[data-intent-style]");
  const confirmButton = event.target.closest("[data-confirm-style]");
  try {
    if (intentButton) {
      intentButton.disabled = true;
      await submitIntent(intentButton.dataset.intentStyle, intentButton.dataset.intentName, intentButton.dataset.tryonJob, intentButton.dataset.intentSource);
      intentButton.textContent = "已想做";
      if (dialog.open) dialog.close();
      switchPage("wantList");
    }
    if (confirmButton) {
      confirmButton.disabled = true;
      await confirmOrder(confirmButton.dataset.confirmStyle, confirmButton.dataset.confirmName, confirmButton.dataset.tryonJob, confirmButton.dataset.confirmSource);
      confirmButton.textContent = "已下单";
      switchPage("wantList");
    }
  } catch (error) {
    toastText.textContent = error.message;
    resultToast.classList.add("show");
  }
});

document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
mockLoginBtn.addEventListener("click", mockLogin);
styleUpload.addEventListener("change", () => previewFile(styleUpload, stylePreview));
handUpload.addEventListener("change", () => {
  previewFile(handUpload, handPreview);
  if (handModelPreviewUrl) URL.revokeObjectURL(handModelPreviewUrl);
  handModelPreviewUrl = "";
  handModelResult.innerHTML = `<p>已上传手图，可以生成关键点和 3D 网格叠加图。</p>`;
  nailSegmentResult.innerHTML = `<p>已上传手图，可以识别指甲区域、横框和对应手指。</p>`;
});
recommendUpload.addEventListener("change", previewRecommendPhoto);
batchHandUpload.addEventListener("change", () => {
  const file = batchHandUpload.files?.[0];
  batchHandLabel.textContent = file ? `手图：${file.name.slice(0, 10)}` : "上传手图";
  batchHandUpload.closest(".basket-upload").classList.toggle("has-file", Boolean(file));
  updateTryOnBasket();
});
document.querySelector("#composeBtn").addEventListener("click", generateTryOn);
hyperrealComposeBtn.addEventListener("click", () => generateTryOn("hyperreal"));
handModelBtn.addEventListener("click", generateHandModel);
nailSegmentBtn.addEventListener("click", generateNailSegmentation);
batchTryonBtn.addEventListener("click", generateBatchTryOn);
batchHyperrealTryonBtn.addEventListener("click", () => generateBatchTryOn("hyperreal"));
refreshMetricsBtn?.addEventListener("click", loadMetricsSummary);
refreshSimulationBtn?.addEventListener("click", loadSimulationSummary);
refreshWantListBtn?.addEventListener("click", loadMockRecords);
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  addMessage("user", text);
  chatInput.value = "";
  respondToNeed(text);
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    chatInput.value = button.dataset.prompt;
    chatInput.focus();
  });
});

currentUser = loadCurrentUser();
renderCurrentUser();
updateCatalog();
renderMiniPicks();
renderBatchResults();
loadMetricsSummary();
loadSimulationSummary();
loadMockRecords();

