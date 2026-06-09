const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

const root = __dirname;
loadEnv(path.join(root, ".env"));

const port = Number(process.env.PORT || 4173);
const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
const apiKey = process.env.DEEPSEEK_API_KEY;
const tryOnScript = process.env.NAIL_TRYON_SCRIPT || "E:\\豆包工具\\美甲试戴_浏览器版.py";
const tryOnWorkdir = process.env.NAIL_TRYON_WORKDIR || root;
const handDetectionBaseUrl = (process.env.NAIL_DETECTION_BASE_URL || "http://localhost:8088").replace(/\/$/, "");
const nailSegModelPath = process.env.NAIL_SEG_MODEL || "C:\\Users\\chen\\Downloads\\nails_seg_s_yolov8_v1.pt";
const nailSegScript = path.join(root, "scripts", "nail_segment.py");
const cleanWilorScript = path.join(root, "scripts", "wilor_clean_infer.py");
const wilorDockerContainer = process.env.WILOR_DOCKER_CONTAINER || "nail-api";
const tryOnMode = (process.env.NAIL_TRYON_MODE || "mock").toLowerCase();
const mockDbPath = path.join(root, "db", "mock-analytics.json");
const recommendSyncPath = path.join(root, "db", "recommend-sync-state.json");
const xhsProcessedDir = path.join(root, "..", "data", "xhs", "processed");
const xhsStyleDatasetPath = path.join(xhsProcessedDir, "xhs-style-dataset.json");
const xhsStyleEnrichedDatasetPath = path.join(xhsProcessedDir, "xhs-style-dataset.enriched.json");
const storageDirs = {
  hands: path.join(root, "uploads", "user-hands"),
  styles: path.join(root, "uploads", "nail-styles"),
  results: path.join(root, "outputs", "generated-results"),
  analysis: path.join(root, "outputs", "analysis-results")
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

const jsonFileCache = new Map();
let mockDbCache = null;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/deepseek-chat") {
      await handleDeepSeekChat(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ops-deepseek-chat") {
      await handleOpsDeepSeekChat(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/tryon-generate") {
      await handleTryOnGenerate(req, res, "normal");
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/hyperreal-tryon-generate") {
      await handleTryOnGenerate(req, res, "hyperreal");
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/analytics-event") {
      await handleAnalyticsEvent(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/confirm-order") {
      await handleConfirmOrder(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/style-intent") {
      await handleStyleIntent(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/metrics-summary") {
      await handleMetricsSummary(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/mock-records") {
      await handleMockRecords(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/xhs-style-dataset") {
      await handleXhsStyleDataset(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/xhs-image") {
      await handleXhsImage(req, res, url);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/simulation-summary") {
      await handleSimulationSummary(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/xhs-trend-snapshot") {
      await handleXhsTrendSnapshot(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/xhs-trend-overview") {
      await handleXhsTrendOverview(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/xhs-style-trend") {
      await handleXhsStyleTrend(req, res, url);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/xhs-style-compare") {
      await handleXhsStyleCompare(req, res, url);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/simulation-db-summary") {
      await handleSimulationDbSummary(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/recommend-sync-state") {
      await handleRecommendSyncState(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/recommend-sync-state") {
      await handleRecommendSyncSave(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/recommend-sync-activity") {
      await handleRecommendSyncActivity(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/recommend-sync-apply") {
      await handleRecommendSyncApply(req, res);
      return;
    }
    // ── OPS 原子操作路由 ────────────────────────────────────────────────────────
    if (req.method === "GET" && url.pathname === "/api/ops/styles") {
      await handleOpsStyles(req, res); return;
    }
    if (req.method === "GET" && url.pathname === "/api/ops/feed-slots") {
      await handleOpsFeedSlots(req, res); return;
    }
    if (req.method === "GET" && url.pathname === "/api/ops/audit-log") {
      await handleOpsAuditLog(req, res); return;
    }
    if (req.method === "GET" && url.pathname === "/api/ops/context") {
      await handleOpsContext(req, res); return;
    }
    if (req.method === "POST" && url.pathname === "/api/ops/execute") {
      await handleOpsExecute(req, res); return;
    }
    if (req.method === "OPTIONS" && url.pathname.startsWith("/api/ops/")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.writeHead(204); res.end(); return;
    }


    if (req.method === "POST" && url.pathname === "/api/hand-detect-clean") {
      await handleHandDetectClean(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/hand-detect-3d") {
      await handleHandDetect3D(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/nail-segment") {
      await handleNailSegment(req, res);
      return;
    }

    // 防机器人 beacon：只有执行 JS 的真人浏览器才会调用此接口
    if (req.method === "POST" && url.pathname === "/api/beacon") {
      await handleBeacon(req, res);
      return;
    }

    // beacon log query
    if (url.pathname === "/api/beacon-log") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
    }
    if (req.method === "GET" && url.pathname === "/api/beacon-log") {
      try {
        const raw = fs.existsSync(BEACON_LOG) ? fs.readFileSync(BEACON_LOG, "utf8") : "";
        const lines2 = raw.trim().split(String.fromCharCode(10)).filter(Boolean).reverse().slice(0, 200);
        const records = lines2.map(l2 => { const [ip,page,ua,time]=l2.split("|"); return {ip,page,ua,time}; });
        sendJson(res, 200, { records });
      } catch(e) { sendJson(res, 500, { error: String(e) }); }
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    serveStatic(url.pathname, res);
  } catch (error) {
    sendJson(res, 500, { error: "Server error", detail: error.message });
  }
});

server.listen(port, () => {
  ensureStorageDirs();
  console.log(`Nail try-on prototype: http://localhost:${port}`);
});

function ensureStorageDirs() {
  Object.values(storageDirs).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function readJsonCached(filePath) {
  const stats = fs.statSync(filePath);
  const cacheKey = path.resolve(filePath);
  const cached = jsonFileCache.get(cacheKey);
  if (cached && cached.mtimeMs === stats.mtimeMs) {
    return cached.value;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  jsonFileCache.set(cacheKey, { mtimeMs: stats.mtimeMs, value: parsed, raw });
  return parsed;
}

function readJsonRawCached(filePath) {
  const stats = fs.statSync(filePath);
  const cacheKey = path.resolve(filePath);
  const cached = jsonFileCache.get(cacheKey);
  if (cached && cached.mtimeMs === stats.mtimeMs) {
    return cached.raw || JSON.stringify(cached.value);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  jsonFileCache.set(cacheKey, { mtimeMs: stats.mtimeMs, value: parsed, raw });
  return raw;
}

function sendJsonFile(res, filePath) {
  try {
    const raw = readJsonRawCached(filePath);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(raw);
  } catch (e) {
    sendJson(res, 500, { error: e.message });
  }
}

function serveStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(root, safePath));

  if (!filePath.startsWith(root)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    res.end(data);
  });
}

async function handleDeepSeekChat(req, res) {
  if (!apiKey) {
    sendJson(res, 500, { error: "Missing DEEPSEEK_API_KEY in .env" });
    return;
  }

  const body = await readJson(req);
  const userMessage = String(body.message || "").trim();
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const styles = Array.isArray(body.styles) ? body.styles : [];
  const memory = Array.isArray(body.memory) ? body.memory : [];
  const hasPhoto = Boolean(body.hasPhoto);

  if (!userMessage) {
    sendJson(res, 400, { error: "message is required" });
    return;
  }

  const messages = [
    {
      role: "system",
      content: buildSystemPrompt(styles, memory, hasPhoto)
    },
    ...history.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content || "").slice(0, 1200)
    })),
    { role: "user", content: userMessage }
  ];

  const payload = {
    model: "deepseek-chat",
    messages,
    max_tokens: 4500,
    temperature: 0.2,
    response_format: { type: "json_object" }
  };

  const data = await fetchWithRetry(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const content = data?.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { reply: content };
  }

  sendJson(res, 200, normalizeAdvisorReply(parsed, styles));
}

async function handleOpsDeepSeekChat(req, res) {
  if (!apiKey) {
    sendJson(res, 500, { error: "Missing DEEPSEEK_API_KEY in .env" });
    return;
  }

  const body = await readJson(req);
  const userMessage = String(body.message || "").trim();
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const opsContext = body.opsContext && typeof body.opsContext === "object" ? body.opsContext : {};
  const plannerMode = Boolean(body.plannerMode);

  if (!userMessage) {
    sendJson(res, 400, { error: "message is required" });
    return;
  }

  // Load current state for planner context
  const opsState = plannerMode ? loadOpsState() : null;

  const messages = [
    {
      role: "system",
      content: plannerMode
        ? buildOpsToolPlannerPrompt(opsContext, opsState)
        : buildOpsSystemPrompt(opsContext)
    },
    ...history.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content || "").slice(0, 1600)
    })),
    { role: "user", content: userMessage }
  ];

  const payload = {
    model: "deepseek-chat",
    messages,
    max_tokens: 1800,
    temperature: 0.2,
    response_format: { type: "json_object" }
  };

  const data = await fetchWithRetry(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const content = data?.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { reply: content };
  }

  if (plannerMode) {
    const toolPlanResult = normalizeOpsToolPlanReply(parsed, userMessage);
    if (toolPlanResult.toolPlan && toolPlanResult.toolPlan.needConfirm && opsState) {
      toolPlanResult.executionResult = generateExecutionResult(toolPlanResult.toolPlan, opsState);
    }
    sendJson(res, 200, toolPlanResult);
  } else {
    sendJson(res, 200, normalizeOpsAdvisorReply(parsed));
  }
}

async function handleTryOnGenerate(req, res, tryOnLevel = "normal") {
  ensureStorageDirs();

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    sendJson(res, 400, { error: "multipart/form-data is required" });
    return;
  }

  const body = await readRaw(req, 30_000_000);
  const fields = parseMultipart(body, contentType);
  const styleFile = fields.find((item) => item.name === "styleImage" && item.filename);
  const handFile = fields.find((item) => item.name === "handImage" && item.filename);
  const userId = getMultipartValue(fields, "userId") || "anonymous";
  const styleId = getMultipartValue(fields, "styleId") || "custom_upload";
  const styleName = getMultipartValue(fields, "styleName") || styleFile?.filename || "自定义款式";

  if (!styleFile || !handFile) {
    sendJson(res, 400, { error: "styleImage and handImage are required" });
    return;
  }

  const jobId = makeJobId();
  const stylePath = path.join(storageDirs.styles, `${jobId}-style${safeImageExt(styleFile.filename, styleFile.contentType)}`);
  const handPath = path.join(storageDirs.hands, `${jobId}-hand${safeImageExt(handFile.filename, handFile.contentType)}`);
  const resultPath = path.join(storageDirs.results, `${jobId}-result.${tryOnMode === "real" ? "png" : "svg"}`);
  const promptPath = path.join(storageDirs.analysis, `${jobId}-tryon-prompt.txt`);

  fs.writeFileSync(stylePath, styleFile.data);
  fs.writeFileSync(handPath, handFile.data);

  appendMockEvent({
    event_name: "tryon_generate_start",
    user_id: userId,
    style_id: styleId,
    entity_id: jobId,
    properties: { style_name: styleName, mode: tryOnMode, try_on_level: tryOnLevel }
  });

  if (tryOnMode === "real") {
    const orientation = await prepareTryOnOrientation(jobId, handPath, handFile).catch((error) => ({
      error: error.message,
      ai_orientation_payload: []
    }));
    fs.writeFileSync(promptPath, buildTryOnPrompt(orientation), "utf8");
    await runTryOn(stylePath, handPath, resultPath, promptPath);
  } else {
    fs.writeFileSync(promptPath, buildMockTryOnPrompt(styleName), "utf8");
    await runMockTryOn(stylePath, handPath, resultPath, styleName, tryOnLevel);
  }

  if (!fs.existsSync(resultPath)) {
    appendMockEvent({
      event_name: "tryon_generate_fail",
      user_id: userId,
      style_id: styleId,
      entity_id: jobId,
      properties: { style_name: styleName, mode: tryOnMode, try_on_level: tryOnLevel }
    });
    sendJson(res, 500, { error: "Try-on generation failed: result file was not created" });
    return;
  }

  appendMockTryOn({
    id: jobId,
    user_id: userId,
    style_id: styleId,
    style_name: styleName,
    hand_url: toPublicPath(handPath),
    style_url: toPublicPath(stylePath),
    result_url: toPublicPath(resultPath),
    mode: tryOnMode,
    try_on_level: tryOnLevel,
    status: "succeeded"
  });
  appendMockEvent({
    event_name: "tryon_generate_success",
    user_id: userId,
    style_id: styleId,
    entity_id: jobId,
    properties: { style_name: styleName, mode: tryOnMode, try_on_level: tryOnLevel, result_url: toPublicPath(resultPath) }
  });

  sendJson(res, 200, {
    id: jobId,
    mode: tryOnMode,
    tryOnLevel,
    handUrl: toPublicPath(handPath),
    styleUrl: toPublicPath(stylePath),
    resultUrl: toPublicPath(resultPath),
    promptUrl: toPublicPath(promptPath)
  });
}

async function handleAnalyticsEvent(req, res) {
  const body = await readJson(req);
  const properties = body.properties || {};
  const eventName = String(body.eventName || body.event_name || "");
  appendMockEvent({
    event_name: String(body.eventName || body.event_name || ""),
    user_id: String(body.userId || body.user_id || "anonymous"),
    style_id: body.styleId || body.style_id || null,
    entity_id: body.entityId || body.entity_id || null,
    event_type: normalizeMetricEventName(eventName),
    page_source: properties.page_source || properties.page || "unknown",
    position_index: properties.position_index || properties.position || null,
    keyword: properties.keyword || null,
    recommend_source: properties.recommend_source || properties.source || null,
    want_source: properties.want_source || properties.intent_source || null,
    confirm_source: properties.confirm_source || null,
    visible_ratio: properties.visible_ratio ?? null,
    visible_duration_ms: properties.visible_duration_ms ?? null,
    result_visible_duration_ms: properties.result_visible_duration_ms ?? null,
    is_valid_impression: Boolean(properties.is_valid_impression),
    is_valid_view: Boolean(properties.is_valid_view),
    action_result: properties.action_result || null,
    tryon_source: properties.tryon_source || null,
    generate_status: properties.generate_status || null,
    properties
  });
  sendJson(res, 200, { ok: true });
}

async function handleConfirmOrder(req, res) {
  const body = await readJson(req);
  const order = appendMockOrder({
    user_id: String(body.userId || "anonymous"),
    style_id: String(body.styleId || "custom_upload"),
    style_name: String(body.styleName || "未命名款式"),
    try_on_job_id: body.tryOnJobId || null,
    amount: Number(body.amount || 198),
    status: "confirmed"
  });
  appendMockEvent({
    event_name: "order_confirmed",
    user_id: order.user_id,
    style_id: order.style_id,
    entity_id: order.id,
    properties: { style_name: order.style_name, amount: order.amount }
  });
  sendJson(res, 200, { ok: true, order });
}

async function handleStyleIntent(req, res) {
  const body = await readJson(req);
  const intent = appendMockIntent({
    user_id: String(body.userId || "anonymous"),
    style_id: String(body.styleId || "custom_upload"),
    style_name: String(body.styleName || "未命名款式"),
    try_on_job_id: body.tryOnJobId || null,
    intent_type: "want_to_do"
  });
  appendMockEvent({
    event_name: "style_intent_submit",
    user_id: intent.user_id,
    style_id: intent.style_id,
    entity_id: intent.id,
    properties: { style_name: intent.style_name, try_on_job_id: intent.try_on_job_id }
  });
  sendJson(res, 200, { ok: true, intent });
}

async function handleMetricsSummary(req, res) {
  sendJson(res, 200, buildMetricsSummary(readMockDb()));
}

async function handleMockRecords(req, res) {
  const data = readMockDb();
  sendJson(res, 200, {
    try_on_jobs: (data.try_on_jobs || []).slice(-50).reverse(),
    intents: (data.intents || []).slice(-50).reverse(),
    orders: (data.orders || []).slice(-50).reverse()
  });
}

async function handleXhsStyleDataset(req, res) {
  const datasetPath = fs.existsSync(xhsStyleEnrichedDatasetPath) ? xhsStyleEnrichedDatasetPath : xhsStyleDatasetPath;
  if (!fs.existsSync(datasetPath)) {
    sendJson(res, 404, { error: "xhs style dataset not found" });
    return;
  }
  try {
    const payload = readJsonCached(datasetPath);
    sendJson(res, 200, payload);
  } catch (error) {
    sendJson(res, 500, { error: "failed to read xhs style dataset", detail: error.message });
  }
}

async function handleXhsImage(req, res, url) {
  const file = path.basename(url.searchParams.get("file") || "");
  if (!file) {
    sendJson(res, 400, { error: "file is required" });
    return;
  }
  const imagePath = path.join(xhsProcessedDir, "images", file);
  if (!imagePath.startsWith(path.join(xhsProcessedDir, "images"))) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  if (!fs.existsSync(imagePath)) {
    sendJson(res, 404, { error: "image not found" });
    return;
  }
  const ext = path.extname(imagePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  fs.createReadStream(imagePath).pipe(res);
}

async function handleSimulationSummary(req, res) {
  const xhsSummaryPath = path.join(root, "outputs", "simulation", "xhs_summary.json");
  const summaryPath = fs.existsSync(xhsSummaryPath)
    ? xhsSummaryPath
    : path.join(root, "outputs", "simulation", "summary.json");
  if (!fs.existsSync(summaryPath)) {
    sendJson(res, 404, { error: "Simulation summary not found. Run python scripts/simulate_nail_trends.py first." });
    return;
  }
  const data = structuredClone(readJsonCached(summaryPath));
  const dbSummaryPath = path.join(root, "db", "simulation-db-summary.json");
  if (fs.existsSync(dbSummaryPath)) {
    data.database_summary = readJsonCached(dbSummaryPath);
  }
  sendJson(res, 200, data);
}

async function handleXhsTrendSnapshot(req, res) {
  const snapshotPath = path.join(root, "outputs", "simulation", "xhs_trend_snapshot.json");
  if (!fs.existsSync(snapshotPath)) {
    sendJson(res, 404, { error: "XHS trend snapshot not found. Run python scripts/build_xhs_operational_mock.py first." });
    return;
  }
  sendJsonFile(res, snapshotPath);
}

async function handleXhsTrendOverview(req, res) {
  const snapshotPath = path.join(root, "outputs", "simulation", "xhs_trend_snapshot.json");
  const summaryPath = path.join(root, "outputs", "simulation", "xhs_summary.json");
  if (!fs.existsSync(snapshotPath) || !fs.existsSync(summaryPath)) {
    sendJson(res, 404, { error: "XHS trend overview not found. Run python scripts/build_xhs_operational_mock.py first." });
    return;
  }

  const snapshot = readJsonCached(snapshotPath);
  const summary = readJsonCached(summaryPath);
  const styleLookup = new Map((snapshot.styles || []).map((item) => [item.styleId, item]));
  const projectStyle = (row) => {
    const meta = styleLookup.get(row.style_id) || {};
    return {
      id: row.style_id,
      name: meta.styleName || row.style_id,
      image: meta.image || "",
      category: meta.primaryTag || row.category || "",
      secondaryTag: meta.secondaryTag || "",
      viewCount: Number(row.view_uv || 0),
      tryOnCount: Number(row.tryon_uv || 0),
      wantCount: Number(row.want_uv || 0),
      confirmCount: Number(row.total_confirm_uv || 0),
      confirmRate: Number(((row.want_to_confirm_rate || 0) * 100).toFixed(1)),
      tryonConfirmRate: Number(((row.tryon_confirm_rate || 0) * 100).toFixed(1)),
      hotIndex: Math.round((row.hot_score || 0) * 100),
      coldRisk: Math.round((row.cold_risk_score || 0) * 100),
      growthScore: Math.round((row.growth_score || 0) * 100),
      label: row.label || "Stable",
      suggestion: row.label === "ColdDown"
        ? "样本充足但承接偏弱，优先检查封面、价格和试戴结果。"
        : row.label === "Potential"
          ? "低曝光但意向或确认承接不错，适合继续给测试位。"
          : "热度和确认承接较好，适合保留核心曝光。"
    };
  };

  sendJson(res, 200, {
    updatedAt: snapshot.updatedAt,
    dateRange: snapshot.dateRange,
    weeklyRange: snapshot.weeklyRange,
    styleCount: snapshot.styles?.length || 0,
    latestHotIds: snapshot.latestHotIds || [],
    latestColdIds: snapshot.latestColdIds || [],
    latestPotentialIds: snapshot.latestPotentialIds || [],
    hotStyles: (summary.top_hot || []).map(projectStyle),
    coldStyles: (summary.top_cold || []).map(projectStyle),
    potentialStyles: (summary.top_potential || []).map(projectStyle),
    modelReport: summary.model_report_true_3class || summary.model_report_3class || null,
    method: {
      source: "offline_simulation_plus_business_rules",
      scores: ["hot_score", "cold_risk_score", "growth_score"],
      labels: ["HotUp", "Stable", "Potential", "ColdDown", "Untested"]
    }
  });
}

async function handleXhsStyleTrend(req, res, url) {
  const snapshotPath = path.join(root, "outputs", "simulation", "xhs_trend_snapshot.json");
  if (!fs.existsSync(snapshotPath)) {
    sendJson(res, 404, { error: "XHS trend snapshot not found. Run python scripts/build_xhs_operational_mock.py first." });
    return;
  }

  const styleId = String(url.searchParams.get("styleId") || "").trim();
  const days = Math.max(7, Math.min(120, Number(url.searchParams.get("days") || 120)));
  if (!styleId) {
    sendJson(res, 400, { error: "styleId is required" });
    return;
  }

  const snapshot = readJsonCached(snapshotPath);
  const style = (snapshot.styles || []).find((item) => item.styleId === styleId);
  if (!style) {
    sendJson(res, 404, { error: "style trend not found" });
    return;
  }

  sendJson(res, 200, {
    styleId: style.styleId,
    styleName: style.styleName,
    image: style.image,
    primaryTag: style.primaryTag,
    secondaryTag: style.secondaryTag,
    dateRange: snapshot.dateRange,
    weeklyRange: snapshot.weeklyRange,
    daily: (style.daily || []).slice(-days),
    weekly: style.weekly || []
  });
}

function safeMetricRate(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function buildMetricValue(item, metric) {
  const viewUv = Number(item.view_uv || 0);
  const tryonUv = Number(item.tryon_result_uv || 0);
  const wantUv = Number(item.want_uv || 0);
  const confirmUv = Number(item.total_confirm_uv || 0);

  if (metric === "view_uv") return viewUv;
  if (metric === "tryon_result_uv") return tryonUv;
  if (metric === "want_uv") return wantUv;
  if (metric === "total_confirm_uv") return confirmUv;
  if (metric === "want_per_view") return safeMetricRate(wantUv, viewUv);
  if (metric === "confirm_per_view") return safeMetricRate(confirmUv, viewUv);
  if (metric === "confirm_per_want") return safeMetricRate(confirmUv, wantUv);
  if (metric === "confirm_per_tryon") return safeMetricRate(confirmUv, tryonUv);

  return viewUv;
}

async function handleXhsStyleCompare(req, res, url) {
  const snapshotPath = path.join(root, "outputs", "simulation", "xhs_trend_snapshot.json");
  if (!fs.existsSync(snapshotPath)) {
    sendJson(res, 404, { error: "XHS trend snapshot not found. Run python scripts/build_xhs_operational_mock.py first." });
    return;
  }

  const rawStyleIds = String(url.searchParams.get("styleIds") || "").trim();
  const days = Math.max(7, Math.min(120, Number(url.searchParams.get("days") || 30)));
  const metric = String(url.searchParams.get("metric") || "want_per_view").trim();
  const supportedMetrics = new Set([
    "view_uv",
    "tryon_result_uv",
    "want_uv",
    "total_confirm_uv",
    "want_per_view",
    "confirm_per_view",
    "confirm_per_want",
    "confirm_per_tryon"
  ]);

  if (!rawStyleIds) {
    sendJson(res, 400, { error: "styleIds is required" });
    return;
  }

  if (!supportedMetrics.has(metric)) {
    sendJson(res, 400, { error: `Unsupported metric: ${metric}` });
    return;
  }

  const styleIds = rawStyleIds
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, 4);

  if (!styleIds.length) {
    sendJson(res, 400, { error: "At least one valid styleId is required" });
    return;
  }

  const snapshot = readJsonCached(snapshotPath);
  const styleLookup = new Map((snapshot.styles || []).map((item) => [item.styleId, item]));
  const series = styleIds
    .map((styleId) => styleLookup.get(styleId))
    .filter(Boolean)
    .map((style) => {
      const daily = (style.daily || []).slice(-days);
      return {
        styleId: style.styleId,
        styleName: style.styleName,
        image: style.image,
        primaryTag: style.primaryTag,
        secondaryTag: style.secondaryTag,
        dates: daily.map((item) => item.date),
        values: daily.map((item) => buildMetricValue(item, metric)),
        sampleViews: daily.reduce((sum, item) => sum + Number(item.view_uv || 0), 0),
        sampleTryons: daily.reduce((sum, item) => sum + Number(item.tryon_result_uv || 0), 0),
        sampleWants: daily.reduce((sum, item) => sum + Number(item.want_uv || 0), 0),
        sampleConfirms: daily.reduce((sum, item) => sum + Number(item.total_confirm_uv || 0), 0)
      };
    });

  if (!series.length) {
    sendJson(res, 404, { error: "No style trends found for the requested styleIds" });
    return;
  }

  sendJson(res, 200, {
    metric,
    days,
    isRate: metric.includes("_per_"),
    dateRange: snapshot.dateRange,
    series
  });
}

async function handleSimulationDbSummary(req, res) {
  const summaryPath = path.join(root, "db", "simulation-db-summary.json");
  if (!fs.existsSync(summaryPath)) {
    sendJson(res, 404, {
      error: "Simulation database summary not found. Run python scripts/import_simulation_to_sqlite.py first."
    });
    return;
  }
  sendJsonFile(res, summaryPath);
}

async function handleHandDetect3D(req, res) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    sendJson(res, 400, { error: "multipart/form-data is required" });
    return;
  }

  const body = await readRaw(req, 30_000_000);
  const fields = parseMultipart(body, contentType);
  const handFile = fields.find((item) => item.name === "file" && item.filename)
    || fields.find((item) => item.name === "handImage" && item.filename);

  if (!handFile) {
    sendJson(res, 400, { error: "file is required" });
    return;
  }

  const outbound = new FormData();
  const blob = new Blob([handFile.data], { type: handFile.contentType || "image/jpeg" });
  outbound.append("file", blob, handFile.filename || "hand.jpg");

  let response;
  try {
    response = await fetch(`${handDetectionBaseUrl}/api/detect-with-3d`, {
      method: "POST",
      body: outbound
    });
  } catch (error) {
    sendJson(res, 502, {
      error: "Hand detection service is not reachable",
      detail: `请确认 WiLoR Docker 服务已在 ${handDetectionBaseUrl} 启动。${error.message}`
    });
    return;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    sendJson(res, response.status, {
      error: "Hand detection failed",
      detail: detail || `WiLoR service returned ${response.status}`
    });
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  res.writeHead(200, {
    "Content-Type": response.headers.get("content-type") || "image/jpeg",
    "Cache-Control": "no-store"
  });
  res.end(buffer);
}

async function handleHandDetectClean(req, res) {
  ensureStorageDirs();
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    sendJson(res, 400, { error: "multipart/form-data is required" });
    return;
  }

  const body = await readRaw(req, 30_000_000);
  const fields = parseMultipart(body, contentType);
  const handFile = fields.find((item) => item.name === "file" && item.filename)
    || fields.find((item) => item.name === "handImage" && item.filename);

  if (!handFile) {
    sendJson(res, 400, { error: "file is required" });
    return;
  }

  const jobId = makeJobId();
  const inputPath = path.join(storageDirs.hands, `${jobId}-wilor-input${safeImageExt(handFile.filename, handFile.contentType)}`);
  const keypointsPath = path.join(storageDirs.analysis, `${jobId}-wilor-2d.jpg`);
  const meshPath = path.join(storageDirs.analysis, `${jobId}-wilor-3d.jpg`);
  const combinedPath = path.join(storageDirs.analysis, `${jobId}-wilor-compare.jpg`);
  const jsonPath = path.join(storageDirs.analysis, `${jobId}-wilor.json`);
  fs.writeFileSync(inputPath, handFile.data);

  try {
    await runCleanWilor(inputPath, keypointsPath, meshPath, combinedPath, jsonPath, jobId);
  } catch (error) {
    sendJson(res, 500, { error: "Clean WiLoR generation failed", detail: error.message });
    return;
  }

  if (!fs.existsSync(combinedPath) || !fs.existsSync(jsonPath)) {
    sendJson(res, 500, { error: "Clean WiLoR generation failed", detail: "result files were not created" });
    return;
  }

  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch {
    data = {};
  }

  sendJson(res, 200, {
    id: jobId,
    inputUrl: toPublicPath(inputPath),
    imageUrl: toPublicPath(combinedPath),
    keypointsUrl: toPublicPath(keypointsPath),
    meshUrl: toPublicPath(meshPath),
    jsonUrl: toPublicPath(jsonPath),
    num_hands: data.num_hands || 0,
    hand_layers: data.hand_layers || [],
    visual_occlusion_relations: data.visual_occlusion_relations || [],
    render_plan: data.render_plan || {}
  });
}

async function handleNailSegment(req, res) {
  ensureStorageDirs();
  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    sendJson(res, 400, { error: "multipart/form-data is required" });
    return;
  }

  const body = await readRaw(req, 30_000_000);
  const fields = parseMultipart(body, contentType);
  const handFile = fields.find((item) => item.name === "file" && item.filename)
    || fields.find((item) => item.name === "handImage" && item.filename);

  if (!handFile) {
    sendJson(res, 400, { error: "file is required" });
    return;
  }

  if (!fs.existsSync(nailSegModelPath)) {
    sendJson(res, 500, { error: "Missing nail segmentation model", detail: nailSegModelPath });
    return;
  }

  const jobId = makeJobId();
  const inputPath = path.join(storageDirs.hands, `${jobId}-nail-seg-input${safeImageExt(handFile.filename, handFile.contentType)}`);
  const annotatedPath = path.join(storageDirs.analysis, `${jobId}-nail-seg.jpg`);
  const jsonPath = path.join(storageDirs.analysis, `${jobId}-nail-seg.json`);
  const handJsonPath = path.join(storageDirs.analysis, `${jobId}-hand-detect.json`);
  fs.writeFileSync(inputPath, handFile.data);

  let handDetection = null;
  try {
    handDetection = await requestHandDetectionJson(handFile);
    fs.writeFileSync(handJsonPath, JSON.stringify(handDetection, null, 2), "utf8");
  } catch (error) {
    handDetection = { error: error.message };
  }
  const handDetectionSummary = summarizeHandDetection(handDetection);

  try {
    await runNailSegmentation(inputPath, annotatedPath, jsonPath, fs.existsSync(handJsonPath) ? handJsonPath : "");
  } catch (error) {
    sendJson(res, 500, {
      error: "Nail segmentation failed",
      detail: error.message,
      handDetection: handDetectionSummary
    });
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  sendJson(res, 200, {
    id: jobId,
    imageUrl: toPublicPath(annotatedPath),
    jsonUrl: toPublicPath(jsonPath),
    inputUrl: toPublicPath(inputPath),
    handDetection: handDetectionSummary,
    ...data
  });
}

function summarizeHandDetection(data) {
  if (!data || data.error) return data || null;
  const hands = Array.isArray(data.hands) ? data.hands : [];
  return {
    num_hands: Number(data.num_hands || hands.length || 0),
    message: data.message || "",
    hands: hands.map((hand, index) => ({
      hand_index: index,
      is_right: Boolean(hand.is_right),
      hand_side: hand.is_right ? "right" : "left",
      hand_side_label: hand.is_right ? "右手" : "左手",
      bbox: hand.bbox || [],
      keypoints_2d: hand.keypoints_2d || []
    }))
  };
}

async function requestHandDetectionJson(file) {
  const outbound = new FormData();
  outbound.append("file", new Blob([file.data], { type: file.contentType || "image/jpeg" }), file.filename || "hand.jpg");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${handDetectionBaseUrl}/api/detect`, {
      method: "POST",
      body: outbound,
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `WiLoR service returned ${response.status}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timeout);
  }
}

async function prepareTryOnOrientation(jobId, handPath, handFile) {
  const handJsonPath = path.join(storageDirs.analysis, `${jobId}-tryon-hand-detect.json`);
  const annotatedPath = path.join(storageDirs.analysis, `${jobId}-tryon-nail-orientation.jpg`);
  const jsonPath = path.join(storageDirs.analysis, `${jobId}-tryon-nail-orientation.json`);

  const handDetection = await requestHandDetectionJson(handFile);
  fs.writeFileSync(handJsonPath, JSON.stringify(handDetection, null, 2), "utf8");
  await runNailSegmentation(handPath, annotatedPath, jsonPath, handJsonPath);

  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  return {
    imageUrl: toPublicPath(annotatedPath),
    jsonUrl: toPublicPath(jsonPath),
    num_nails: data.num_nails || 0,
    ai_orientation_payload: Array.isArray(data.ai_orientation_payload)
      ? data.ai_orientation_payload
      : []
  };
}

function buildTryOnPrompt(orientation) {
  const payload = Array.isArray(orientation?.ai_orientation_payload)
    ? orientation.ai_orientation_payload.map((item) => ({
        nail_id: item.nail_id,
        hand_side: item.hand_side,
        hand_side_label: item.hand_side_label,
        finger: item.finger,
        finger_label: item.finger_label,
        center: item.center,
        oriented_box_points: item.oriented_box_points,
        angle_degrees: item.angle_degrees,
        long_axis_vector: item.long_axis_vector
      }))
    : [];

  return [
    "仅把第一张图的美甲替换到第二张图，仅替换指甲，保持原图手部姿势、皮肤、背景、光线完全不变，不修改任何其他细节，不添加滤镜。",
    "不要在最终图片上画任何框、文字、箭头、点位或辅助线。",
    "下面是第二张图中每个指甲的定位和朝向元数据，只用于对齐美甲图案：",
    JSON.stringify(payload, null, 2),
    "对齐规则：center 是指甲中心点；oriented_box_points 是指甲的旋转外框；long_axis_vector/angle_degrees 是指甲从甲根朝甲尖的大致方向。美甲图案必须沿这个方向贴合，只覆盖对应指甲区域。"
  ].join("\n");
}

function runTryOn(stylePath, handPath, resultPath, promptPath) {
  return new Promise((resolve, reject) => {
    const args = [tryOnScript, stylePath, handPath, resultPath];
    if (promptPath) args.push(promptPath);
    execFile("python", args, {
      cwd: tryOnWorkdir,
      timeout: 600000,
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || `${error.message}${error.killed ? " (可能是生成超时)" : ""}`));
        return;
      }
      resolve(stdout);
    });
  });
}

async function runCleanWilor(inputPath, keypointsPath, meshPath, combinedPath, jsonPath, jobId) {
  if (!fs.existsSync(cleanWilorScript)) {
    throw new Error(`Missing clean WiLoR script: ${cleanWilorScript}`);
  }

  const containerDir = `/tmp/wilor_jobs/${jobId}`;
  const inputName = path.basename(inputPath);
  const containerInput = `${containerDir}/${inputName}`;
  const containerKeypoints = `${containerDir}/keypoints.jpg`;
  const containerMesh = `${containerDir}/mesh.jpg`;
  const containerCombined = `${containerDir}/compare.jpg`;
  const containerJson = `${containerDir}/result.json`;

  await execFileAsync("docker", ["exec", wilorDockerContainer, "sh", "-lc", `rm -rf ${containerDir} && mkdir -p ${containerDir}`], 60_000);
  await execFileAsync("docker", ["cp", cleanWilorScript, `${wilorDockerContainer}:/tmp/wilor_clean_infer.py`], 60_000);
  await execFileAsync("docker", ["cp", inputPath, `${wilorDockerContainer}:${containerInput}`], 60_000);
  await execFileAsync("docker", [
    "exec",
    wilorDockerContainer,
    "sh",
    "-lc",
    [
      "PYOPENGL_PLATFORM=egl",
      "python /tmp/wilor_clean_infer.py",
      `--image ${containerInput}`,
      "--model-root /app",
      `--json-output ${containerJson}`,
      `--keypoints-output ${containerKeypoints}`,
      `--mesh-output ${containerMesh}`,
      `--combined-output ${containerCombined}`,
      "--device auto"
    ].join(" ")
  ], 240_000);

  await execFileAsync("docker", ["cp", `${wilorDockerContainer}:${containerKeypoints}`, keypointsPath], 60_000);
  await execFileAsync("docker", ["cp", `${wilorDockerContainer}:${containerMesh}`, meshPath], 60_000);
  await execFileAsync("docker", ["cp", `${wilorDockerContainer}:${containerCombined}`, combinedPath], 60_000);
  await execFileAsync("docker", ["cp", `${wilorDockerContainer}:${containerJson}`, jsonPath], 60_000);
}

function runNailSegmentation(inputPath, outputPath, jsonPath, handJsonPath) {
  return new Promise((resolve, reject) => {
    const args = [
      nailSegScript,
      "--model", nailSegModelPath,
      "--image", inputPath,
      "--output", outputPath,
      "--json-output", jsonPath
    ];
    if (handJsonPath) args.push("--hand-json", handJsonPath);
    execFile("python", args, {
      cwd: root,
      timeout: 180000,
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

function buildSystemPrompt(styles, memory, hasPhoto) {
  return `
你是美甲门店的 AI 试戴客服，语气像真实店员：口语、简短、直接，不要长篇科普。
你的任务：
1. 根据用户需求推荐店内可做的款式，不要编造不存在的款式。
2. 一次最多说 2-4 句，重点放在"为什么适合"和"一个小提醒"。
3. 可以追问预算、甲长、肤色顾虑、场景、是否接受贴钻/金箔/手绘，但追问要短。
4. 必须提醒真实顾虑，例如手绘考验技师、猫眼光泽持久度、渐变长出来分层、短甲效果限制，但一句话带过。
5. 如果用户已上传手部照片入口，说明"我会结合手部照片判断"，但不要假装已经做了真实视觉识别。
6. 输出必须是 JSON 对象，不要 Markdown。

店内款式数据库：
${JSON.stringify(styles.map((item) => ({
    id: item.id,
    name: item.name,
    primaryTag: item.primaryTag,
    secondaryTag: item.secondaryTag,
    rating: item.rating,
    likes: item.likes,
    definition: item.definition,
    tagGroups: item.tagGroups || {},
    businessMetrics: item.businessMetrics || null
  })), null, 2)}

本次对话记忆：
${JSON.stringify(memory, null, 2)}

用户是否已上传手部照片入口：${hasPhoto ? "是" : "否"}

返回 JSON 格式：
{
  "reply": "给用户看的自然中文回复，45-90字，口语一点，不要太多",
  "recommendedIds": ["最多3个店内款式id"],
  "memory": ["本轮新提取或更新的记忆标签"],
  "followUpQuestion": "一个很短的可选追问，最多25字"
}
`;
}

function normalizeAdvisorReply(parsed, styles) {
  const validIds = new Set(styles.map((item) => item.id));
  const recommendedIds = Array.isArray(parsed.recommendedIds)
    ? parsed.recommendedIds.filter((id) => validIds.has(id)).slice(0, 3)
    : [];

  return {
    reply: String(parsed.reply || "我先给你挑几款更稳的，喜欢的话可以直接加入试戴。").slice(0, 120),
    recommendedIds,
    memory: Array.isArray(parsed.memory) ? parsed.memory.map(String).slice(0, 8) : [],
    followUpQuestion: parsed.followUpQuestion ? String(parsed.followUpQuestion).slice(0, 40) : ""
  };
}

function buildOpsSystemPrompt(opsContext) {
  const compactContext = {
    totals: opsContext.totals || {},
    todayStats: opsContext.todayStats || {},
    hotStyles: Array.isArray(opsContext.hotStyles) ? opsContext.hotStyles.slice(0, 5).map(s => ({ id: s.id, name: s.name, hotIndex: s.hotIndex, confirmRate: s.confirmRate, trend: s.trend })) : [],
    coldStyles: Array.isArray(opsContext.coldStyles) ? opsContext.coldStyles.slice(0, 5).map(s => ({ id: s.id, name: s.name, coldRisk: s.coldRisk, trend: s.trend })) : [],
    potentialStyles: Array.isArray(opsContext.potentialStyles) ? opsContext.potentialStyles.slice(0, 4).map(s => ({ id: s.id, name: s.name, growthScore: s.growthScore })) : [],
    recommendList: Array.isArray(opsContext.recommendList) ? opsContext.recommendList.slice(0, 8).map(s => ({ position: s.position, styleName: s.styleName, slotType: s.slotType })) : [],
    modelReport: opsContext.modelReport || null,
    currentPage: opsContext.currentPage || ""
  };

  return `
你是美甲门店的 AI 运营助手，服务对象是店长/运营人员，不是顾客。
语气要求：中文、口语、简短、直接，像真实运营同事给建议；不要写长报告，默认 3-6 句。

你的任务：
1. 基于提供的运营数据回答，不能编造不存在的数据。
2. 能解释今日运营、热门款、冷门风险、潜力款、推荐位排序、试戴/想要做/确认要做转化。
3. 给建议时必须可执行，例如"把某款放到首屏第几位""降低某款曝光""检查封面/价格/试戴效果"。
4. 如果数据不足，要直接说明"样本不足"，不要假装预测准确。
5. 用户问推荐位时，优先使用 8 个推荐槽：前 4 个负责转化，后 4 个负责探索。
6. 输出必须是 JSON 对象，不要 Markdown。
7. reply 字段严格控制在 80-150 字以内，禁止列举大量款式名。
8. actions 最多 4 条，每条不超过 30 字，只说关键操作，不列举款式名单。
9. focusStyles 最多列 3 个款式名，且必须是数据中表现最突出的。

当前运营数据：
${JSON.stringify(compactContext, null, 2)}

返回 JSON 格式：
{
  "reply": "给运营看的自然中文回复，严格80-150字，不要列举款式名单",
  "actions": ["最多4条，每条≤30字"],
  "focusStyles": ["最多3个最重要款式名"],
  "riskLevel": "low|medium|high",
  "followUpQuestion": "一个可选追问，最多30字"
}
`;
}

function buildOpsToolPlannerPrompt(opsContext, state) {
  // Build current styles context for DeepSeek to match names to IDs
  const allStyles = (state && state.styles) ? state.styles : [];
  const styleContext = allStyles
    .filter(s => s.name && s.id)
    .slice(0, 100)
    .map(s => ({
      id: s.id,
      name: s.name,
      code: s.styleCode || s.id,
      status: s.status || s.rawStatus || 'published',
      tags: Array.isArray(s.tags) ? s.tags.slice(0, 4) : []
    }));

  // Feed slots context
  const feedSlots = (state && state.recommendConfig && state.recommendConfig.slots)
    ? state.recommendConfig.slots.slice(0, 8).map(sl => ({
        pos: sl.position,
        styleId: sl.styleId,
        name: allStyles.find(s => s.id === sl.styleId)?.name || sl.styleId
      }))
    : [];

  const opsStr = [
    '── 款式状态操作 ──',
    'unpublish_style       下架单款  params:{styleId}',
    'publish_style         上架单款  params:{styleId}',
    'archive_style         归档单款  params:{styleId}',
    'restore_style         恢复上架  params:{styleId}',
    'batch_unpublish_styles 批量下架  params:{styleIds:[]}',
    '── 推荐位操作 ──',
    'replace_recommendation_slot    替换单个推荐槽  params:{position,newStyleId}',
    'batch_replace_recommendation_slots 批量替换槽位 params:{slots:[{position,styleId}]}',
    '── 款式属性操作 ──',
    'update_style_sort_weight  修改排序权重  params:{styleId,weight}',
    'toggle_style_promoted     开关主推标记  params:{styleId,promoted:bool}',
    'toggle_style_makeable     开关可制作    params:{styleId,makeable:bool}',
    'batch_update_price        批量改价      params:{styleIds:[],newPrice}',
    'batch_update_tags         批量改标签    params:{styleIds:[],tags:{}}',
    'create_style              新增款式      params:{name,price,...}',
    '── 查询操作（只读，不需确认）──',
    'search_styles             搜索款式      params:{keyword?,status?,tag?}',
    'get_style_detail          款式详情      params:{styleId}',
    'get_daily_stats           今日数据      params:{}',
    'get_recommendation_config 推荐位配置   params:{}',
  ].join('\n');

  return `你是美甲运营端 ToolPlanner AI。把用户自然语言指令转成 ToolPlan JSON。
禁止输出自然语言，禁止 Markdown，只输出 JSON。

【当前门店款式（共${styleContext.length}款）】
${JSON.stringify(styleContext, null, 2)}

【当前推荐位（共${feedSlots.length}槽）】
${JSON.stringify(feedSlots, null, 2)}

【可用原子操作】
${opsStr}

【判断规则】
1. 用户要求下架/上架/归档/恢复/替换/改价/改标签 → intentType="execute", needConfirm=true, riskLevel="medium"或"high"
2. 用户要查数据/分析趋势 → intentType="query"或"analysis", needConfirm=false
3. 必须从上方款式列表匹配目标款式名称 → 直接把匹配到的 id 写入 params.styleId
4. 如果款式名模糊匹配多个，取最相似的一个并说明
5. 推荐位替换需同时指定 position 和 newStyleId
6. 写操作 finalResponseType 必须是 "approval_required"

【输出格式（严格 JSON）】
{
  "toolPlan": {
    "intentType": "execute",
    "riskLevel": "medium",
    "needConfirm": true,
    "needSecondConfirm": false,
    "userGoal": "用户目标描述",
    "objects": {
      "styleIds": ["匹配到的id"],
      "protectedConditions": []
    },
    "plan": [
      {
        "step": 1,
        "operation": "unpublish_style",
        "reason": "下架目标款式",
        "params": { "styleId": "实际id" }
      }
    ],
    "finalResponseType": "approval_required"
  }
}`;
}

function generateExecutionResult(toolPlan, state) {
  const plan = toolPlan.plan || [];
  const styles = (state && state.styles) ? state.styles : [];
  let preview = null;
  let approval = null;

  // Map from direct op name to preview op name (for frontend compatibility)
  const opToPreview = {
    unpublish_style: "preview_unpublish_style",
    publish_style: "preview_publish_style",
    archive_style: "preview_archive_style",
    restore_style: "preview_restore_style",
    batch_unpublish_styles: "preview_batch_unpublish",
    replace_recommendation_slot: "preview_replace_single_slot",
    batch_replace_recommendation_slots: "preview_replace_section",
    toggle_style_promoted: "preview_toggle_promoted",
    batch_update_price: "preview_price_change",
    batch_update_tags: "preview_update_tags",
  };

  const statusAfter = {
    unpublish_style: "unpublished",
    publish_style: "published",
    archive_style: "archived",
    restore_style: "published",
    batch_unpublish_styles: "unpublished",
  };

  for (const step of plan) {
    const op = step.operation;
    const params = step.params || {};

    // Skip read-only ops
    if (["search_styles","get_style_detail","get_daily_stats","get_recommendation_config","get_section_styles","search_by_tag"].includes(op)) continue;

    const previewName = opToPreview[op] || ("preview_" + op);

    if (["unpublish_style","publish_style","archive_style","restore_style"].includes(op)) {
      const styleId = params.styleId;
      const style = styles.find(s => s.id === styleId || s.styleCode === styleId);
      const newStatus = statusAfter[op] || "unknown";
      preview = {
        operationName: previewName,
        targets: style ? [{
          targetId: style.id,
          name: style.name,
          before: { status: style.status || style.rawStatus || "published" },
          after: { status: newStatus }
        }] : [{ targetId: styleId, name: styleId, before: {}, after: { status: newStatus } }],
        after: { status: newStatus }
      };
      approval = {
        approvalId: "ai-plan-" + Date.now(),
        status: "pending",
        operationName: op,
        params: { styleId: style ? style.id : styleId }
      };
      break; // take first write op
    }

    if (op === "batch_unpublish_styles") {
      const ids = params.styleIds || [];
      const matched = styles.filter(s => ids.includes(s.id) || ids.includes(s.styleCode));
      preview = {
        operationName: previewName,
        targets: matched.map(s => ({ targetId: s.id, name: s.name, before: { status: s.status || "published" }, after: { status: "unpublished" } })),
        after: { status: "unpublished" }
      };
      approval = {
        approvalId: "ai-plan-" + Date.now(),
        status: "pending",
        operationName: op,
        params: { styleIds: matched.map(s => s.id) }
      };
      break;
    }

    if (op === "replace_recommendation_slot") {
      const newStyle = styles.find(s => s.id === params.newStyleId || s.styleCode === params.newStyleId);
      preview = {
        operationName: previewName,
        targets: newStyle ? [{ targetId: newStyle.id, name: newStyle.name }] : [],
        after: { position: params.position, styleId: params.newStyleId }
      };
      approval = {
        approvalId: "ai-plan-" + Date.now(),
        status: "pending",
        operationName: op,
        params
      };
      break;
    }

    if (op === "toggle_style_promoted") {
      const style = styles.find(s => s.id === params.styleId || s.styleCode === params.styleId);
      preview = {
        operationName: previewName,
        targets: style ? [{ targetId: style.id, name: style.name, before: { promoted: !params.promoted }, after: { promoted: params.promoted } }] : [],
        after: { promoted: params.promoted }
      };
      approval = {
        approvalId: "ai-plan-" + Date.now(),
        status: "pending",
        operationName: op,
        params: { styleId: style ? style.id : params.styleId, promoted: params.promoted }
      };
      break;
    }

    if (op === "batch_update_price") {
      const ids = params.styleIds || [];
      const matched = styles.filter(s => ids.includes(s.id));
      preview = {
        operationName: previewName,
        targets: matched.map(s => ({ targetId: s.id, name: s.name, before: { price: s.price }, after: { price: params.newPrice } })),
        after: { price: params.newPrice }
      };
      approval = {
        approvalId: "ai-plan-" + Date.now(),
        status: "pending",
        operationName: op,
        params
      };
      break;
    }

    // Generic fallback for other write ops
    if (op.startsWith("update_") || op.startsWith("batch_") || op.startsWith("create_") || op.startsWith("toggle_")) {
      preview = {
        operationName: previewName,
        targets: [],
        after: params
      };
      approval = {
        approvalId: "ai-plan-" + Date.now(),
        status: "pending",
        operationName: op,
        params
      };
      break;
    }
  }

  if (!preview || !approval) return null;
  return { preview, approval, plan: toolPlan };
}

function normalizeOpsToolPlanReply(parsed, userMessage) {
  const toolPlan = parsed.toolPlan || parsed;
  const allowedIntentTypes = new Set(["query", "analysis", "generate", "execute", "report"]);
  const allowedRisk = new Set(["low", "medium", "high", "critical"]);
  const allowedFinal = new Set([
    "data_answer",
    "analysis_report",
    "generation_result",
    "operation_preview",
    "approval_required",
    "daily_report",
    "weekly_report",
    "anomaly_report",
    "feed_report",
    "selection_report"
  ]);

  return {
    toolPlan: {
      intentType: allowedIntentTypes.has(toolPlan.intentType) ? toolPlan.intentType : "analysis",
      riskLevel: allowedRisk.has(toolPlan.riskLevel) ? toolPlan.riskLevel : "low",
      needConfirm: Boolean(toolPlan.needConfirm),
      needSecondConfirm: Boolean(toolPlan.needSecondConfirm),
      userGoal: String(toolPlan.userGoal || userMessage),
      objects: toolPlan.objects && typeof toolPlan.objects === "object" ? toolPlan.objects : {},
      plan: Array.isArray(toolPlan.plan) ? toolPlan.plan.map((item, index) => ({
        step: Number(item.step || index + 1),
        operation: String(item.operation || ""),
        reason: String(item.reason || ""),
        params: item.params && typeof item.params === "object" ? item.params : {}
      })).filter((item) => item.operation) : [],
      finalResponseType: allowedFinal.has(toolPlan.finalResponseType) ? toolPlan.finalResponseType : "analysis_report"
    }
  };
}

function normalizeOpsAdvisorReply(parsed) {
  return {
    reply: String(parsed.reply || "我先看今日试戴、想要做和确认要做数据，建议优先关注试戴后确认率和冷门风险。").slice(0, 500),
    actions: Array.isArray(parsed.actions) ? parsed.actions.map(String).slice(0, 4) : [],
    focusStyles: Array.isArray(parsed.focusStyles) ? parsed.focusStyles.map(String).slice(0, 4) : [],
    riskLevel: ["low", "medium", "high"].includes(parsed.riskLevel) ? parsed.riskLevel : "medium",
    followUpQuestion: parsed.followUpQuestion ? String(parsed.followUpQuestion).slice(0, 60) : ""
  };
}

async function fetchWithRetry(url, options) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(data?.error?.message || `DeepSeek API ${response.status}`);
      }
      return data;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < 3) await wait(attempt * 1000);
    }
  }
  throw lastError;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipart(body, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return [];
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const parts = [];
  let start = body.indexOf(boundary);

  while (start !== -1) {
    start += boundary.length;
    if (body[start] === 45 && body[start + 1] === 45) break;
    if (body[start] === 13 && body[start + 1] === 10) start += 2;

    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), start);
    if (headerEnd === -1) break;
    const headerText = body.slice(start, headerEnd).toString("utf8");
    let dataStart = headerEnd + 4;
    let next = body.indexOf(boundary, dataStart);
    if (next === -1) break;
    let dataEnd = next;
    if (body[dataEnd - 2] === 13 && body[dataEnd - 1] === 10) dataEnd -= 2;

    const disposition = headerText.match(/content-disposition:\s*form-data;([^\r\n]+)/i);
    const name = disposition?.[1]?.match(/name="([^"]+)"/)?.[1] || "";
    const filename = disposition?.[1]?.match(/filename="([^"]*)"/)?.[1] || "";
    const contentTypeMatch = headerText.match(/content-type:\s*([^\r\n]+)/i);

    parts.push({
      name,
      filename,
      contentType: contentTypeMatch?.[1]?.trim() || "",
      data: body.slice(dataStart, dataEnd)
    });

    start = next;
  }

  return parts;
}

function getMultipartValue(fields, name) {
  const item = fields.find((field) => field.name === name && !field.filename);
  return item ? item.data.toString("utf8").trim() : "";
}

function safeImageExt(filename, contentType) {
  const ext = path.extname(filename || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return ext;
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return ".jpg";
}

function makeJobId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `${stamp}-${Math.random().toString(16).slice(2, 8)}`;
}

function toPublicPath(filePath) {
  return `/${path.relative(root, filePath).replace(/\\/g, "/")}`;
}

function buildMockTryOnPrompt(styleName) {
  return [
    "MVP 模拟试戴模式。",
    `款式：${styleName}`,
    "当前阶段只生成试戴任务数据和模拟结果图，不调用真实生图 API。",
    "后续接入真实 API 时，将在这里替换为真实 prompt、mask、指甲朝向和图像条件。"
  ].join("\n");
}

async function runMockTryOn(stylePath, handPath, resultPath, styleName, tryOnLevel = "normal") {
  if (tryOnLevel === "hyperreal") {
    await wait(1800);
  }
  const styleUrl = toPublicPath(stylePath);
  const handUrl = toPublicPath(handPath);
  const title = tryOnLevel === "hyperreal" ? "模拟超仿真美甲试戴结果" : "模拟普通美甲试戴结果";
  const subtitle = tryOnLevel === "hyperreal"
    ? "慢任务接口：用于后续接高质量生图、mask、指甲朝向和扩散精修。"
    : "快速接口：用于普通预览和基础试戴数据模拟。";
  const badge = tryOnLevel === "hyperreal" ? "Hyperreal Mock · 慢接口" : "Normal Mock · 快接口";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff8f4"/>
      <stop offset="1" stop-color="#f0e7df"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#8f6f61" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="960" height="720" fill="url(#bg)"/>
  <text x="64" y="72" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#36231f">${escapeXML(title)}</text>
  <text x="64" y="112" font-family="Arial, sans-serif" font-size="18" fill="#7d6259">${escapeXML(subtitle)}</text>
  <g filter="url(#shadow)">
    <rect x="64" y="150" width="380" height="430" rx="22" fill="#ffffff"/>
    <image href="${escapeXML(handUrl)}" x="84" y="170" width="340" height="340" preserveAspectRatio="xMidYMid slice"/>
    <text x="84" y="548" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#3b2b27">用户手图</text>
  </g>
  <g filter="url(#shadow)">
    <rect x="516" y="150" width="380" height="430" rx="22" fill="#ffffff"/>
    <image href="${escapeXML(styleUrl)}" x="536" y="170" width="340" height="340" preserveAspectRatio="xMidYMid slice"/>
    <text x="536" y="548" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#3b2b27">${escapeXML(styleName)}</text>
  </g>
  <rect x="300" y="612" width="360" height="54" rx="27" fill="#2f211d"/>
  <text x="480" y="647" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#fffaf5">${escapeXML(badge)}</text>
</svg>`;
  fs.writeFileSync(resultPath, svg, "utf8");
}

function escapeXML(value) {
  return String(value || "").replace(/[<>&"']/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;"
  })[char]);
}

function defaultRecommendSyncState() {
  return {
    draftConfig: null,
    publishedConfig: null,
    pendingConfig: null,
    rolloutStatus: "idle",
    rolloutUpdatedAt: null,
    userActivity: {
      sessionId: null,
      sessionOpen: false,
      hasFocus: false,
      documentHidden: true,
      currentPage: "catalog",
      lastSeenAt: null
    },
    history: []
  };
}

const recommendStrategyNameMap = {
  hot: "热门优先",
  potential: "潜力放大",
  cold: "冷门观察",
  personalized: "个性化优先",
  custom: "自定义策略"
};

const recommendSlotDefinitions = [
  { position: 1, slotName: "P1 主爆款位", reason: "优先放高热度、高确认承接的主成交款，负责首屏快速吸引和成交。" },
  { position: 2, slotName: "P2 稳转化位", reason: "优先放稳定高想做率、高确认率款，负责承接首屏稳定转化。" },
  { position: 3, slotName: "P3 潜力激活位", reason: "优先放低曝光高转化的潜力款，负责补曝光和测试放量。" },
  { position: 4, slotName: "P4 风格补位", reason: "优先放与前 3 位差异更大的优质款，负责拉开首屏风格层次。" },
  { position: 5, slotName: "P5 下滑吸引位", reason: "优先放视觉冲击更强的款式，负责引导用户继续下滑浏览。" },
  { position: 6, slotName: "P6 新品测试位", reason: "优先放新上架或样本不足但资料完整的款，负责做首轮曝光测试。" },
  { position: 7, slotName: "P7 潜力扩展位", reason: "继续测试潜力候补款，观察加曝光后的承接表现。" },
  { position: 8, slotName: "P8 多样性兜底位", reason: "补足颜色、风格、工艺差异，保证前 8 款不单调。" }
];

const recommendCategoryLabelMap = {
  hot: "热门",
  potential: "潜力",
  cold: "冷门",
  personalized: "个性化"
};

function looksCorruptedText(value) {
  return typeof value === "string" && (value.includes("?") || value.includes("�"));
}

function sanitizeRecommendConfig(config) {
  if (!config) return null;

  const strategyId = String(config.strategyId || "hot");
  const strategyName = recommendStrategyNameMap[strategyId] || String(config.strategyName || "推荐策略");
  return {
    ...config,
    versionId: config.versionId || makeJobId(),
    strategyId,
    strategyName,
    intentText: looksCorruptedText(config.intentText) ? "" : String(config.intentText || ""),
    customCategories: Array.isArray(config.customCategories) ? config.customCategories : [],
    slots: Array.isArray(config.slots)
      ? config.slots.slice(0, 8).map((slot, index) => {
          const position = Number(slot.position || index + 1);
          const slotDef = recommendSlotDefinitions[position - 1] || recommendSlotDefinitions[index] || {
            position,
            slotName: `P${position}`,
            reason: ""
          };
          const category = String(slot.category || "hot");
          return {
            position,
            slotName: slotDef.slotName,
            category,
            strategyLabel: recommendCategoryLabelMap[category] || String(slot.strategyLabel || category),
            reason: looksCorruptedText(slot.reason) || !String(slot.reason || "").trim() ? slotDef.reason : String(slot.reason),
            styleId: slot.styleId ? String(slot.styleId) : "",
            styleName: slot.styleName ? String(slot.styleName) : ""
          };
        })
      : [],
    savedAt: config.savedAt || new Date().toISOString()
  };
}

function readRecommendSyncState() {
  if (!fs.existsSync(recommendSyncPath)) {
    return defaultRecommendSyncState();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(recommendSyncPath, "utf8"));
    return {
      ...defaultRecommendSyncState(),
      ...parsed,
      draftConfig: sanitizeRecommendConfig(parsed.draftConfig),
      publishedConfig: sanitizeRecommendConfig(parsed.publishedConfig),
      pendingConfig: sanitizeRecommendConfig(parsed.pendingConfig),
      userActivity: {
        ...defaultRecommendSyncState().userActivity,
        ...(parsed.userActivity || {}),
        sessionOpen: typeof parsed.userActivity?.sessionOpen === "boolean"
          ? parsed.userActivity.sessionOpen
          : Boolean(parsed.userActivity?.isActive),
        hasFocus: typeof parsed.userActivity?.hasFocus === "boolean"
          ? parsed.userActivity.hasFocus
          : Boolean(parsed.userActivity?.isActive)
      },
      history: Array.isArray(parsed.history)
        ? parsed.history.map((item) => ({
            ...item,
            strategyName: recommendStrategyNameMap[item?.strategyId] || (looksCorruptedText(item?.strategyName) ? "推荐策略" : String(item?.strategyName || ""))
          }))
        : []
    };
  } catch {
    return defaultRecommendSyncState();
  }
}

function writeRecommendSyncState(state) {
  fs.mkdirSync(path.dirname(recommendSyncPath), { recursive: true });
  const sanitizedState = {
    ...state,
    draftConfig: sanitizeRecommendConfig(state.draftConfig),
    publishedConfig: sanitizeRecommendConfig(state.publishedConfig),
    pendingConfig: sanitizeRecommendConfig(state.pendingConfig)
  };
  fs.writeFileSync(recommendSyncPath, JSON.stringify(sanitizedState, null, 2), "utf8");
}

function normalizeRecommendConfigPayload(body = {}, savedAt = new Date().toISOString()) {
  return sanitizeRecommendConfig({
    versionId: body.versionId || makeJobId(),
    strategyId: String(body.strategyId || "hot"),
    strategyName: String(body.strategyName || "热门优先"),
    intentText: String(body.intentText || ""),
    customCategories: Array.isArray(body.customCategories) ? body.customCategories : [],
    slots: Array.isArray(body.slots) ? body.slots.slice(0, 8).map((slot, index) => ({
      position: Number(slot.position || index + 1),
      slotName: String(slot.slotName || `P${index + 1}`),
      category: String(slot.category || "hot"),
      strategyLabel: String(slot.strategyLabel || slot.slotName || `P${index + 1}`),
      reason: String(slot.reason || ""),
      styleId: slot.styleId ? String(slot.styleId) : "",
      styleName: slot.styleName ? String(slot.styleName) : ""
    })) : [],
    savedAt
  });
}

function appendRecommendHistory(state, event, config, createdAt, extra = {}) {
  state.history = [
    {
      event,
      versionId: config?.versionId || "",
      strategyName: config?.strategyName || "",
      createdAt,
      ...extra
    },
    ...(state.history || [])
  ].slice(0, 30);
}

function isUserClientActive(activity) {
  if (!activity?.lastSeenAt) return false;
  const elapsed = Date.now() - new Date(activity.lastSeenAt).getTime();
  return elapsed < 45_000 && activity.sessionOpen !== false;
}

function promotePendingRecommendConfig(state, reason = "user_inactive") {
  if (!state.pendingConfig) return false;
  const appliedAt = new Date().toISOString();
  state.publishedConfig = {
    ...state.pendingConfig,
    appliedAt
  };
  appendRecommendHistory(state, "applied", state.publishedConfig, appliedAt, { reason });
  state.pendingConfig = null;
  state.rolloutStatus = "fully_live";
  state.rolloutUpdatedAt = appliedAt;
  return true;
}

function evaluateRecommendRollout(state, reason = "evaluate") {
  const userActive = isUserClientActive(state.userActivity);
  const changed = state.pendingConfig && !userActive ? promotePendingRecommendConfig(state, reason) : false;

  if (state.pendingConfig) {
    state.rolloutStatus = "queued_waiting_for_user_exit";
    state.rolloutUpdatedAt = new Date().toISOString();
  } else if (state.publishedConfig) {
    state.rolloutStatus = "fully_live";
    state.rolloutUpdatedAt ||= state.publishedConfig.appliedAt || state.publishedConfig.savedAt || new Date().toISOString();
  } else if (state.draftConfig) {
    state.rolloutStatus = "draft_only";
    state.rolloutUpdatedAt ||= state.draftConfig.savedAt || new Date().toISOString();
  } else {
    state.rolloutStatus = "idle";
  }

  return { state, userActive, changed };
}

async function handleRecommendSyncState(req, res) {
  const state = readRecommendSyncState();
  const evaluated = evaluateRecommendRollout(state, "state_read");
  if (evaluated.changed) {
    writeRecommendSyncState(evaluated.state);
  }
  sendJson(res, 200, {
    ...evaluated.state,
    userActive: evaluated.userActive,
    effectiveConfig: evaluated.state.publishedConfig || evaluated.state.pendingConfig || evaluated.state.draftConfig || null
  });
}

async function handleRecommendSyncSave(req, res) {
  const body = await readJson(req);
  const state = readRecommendSyncState();
  const nowIso = new Date().toISOString();
  const submittedConfig = normalizeRecommendConfigPayload(body, nowIso);
  const evaluated = evaluateRecommendRollout(state, "before_save");
  state.draftConfig = submittedConfig;
  appendRecommendHistory(state, "draft_saved", submittedConfig, nowIso);

  if (evaluated.userActive) {
    state.pendingConfig = submittedConfig;
    state.rolloutStatus = "queued_waiting_for_user_exit";
    state.rolloutUpdatedAt = nowIso;
    appendRecommendHistory(state, "queued", submittedConfig, nowIso, { reason: "user_active" });
  } else {
    state.pendingConfig = submittedConfig;
    promotePendingRecommendConfig(state, "user_inactive_on_save");
  }
  writeRecommendSyncState(state);

  sendJson(res, 200, {
    ok: true,
    queued: Boolean(evaluated.userActive),
    userActive: evaluated.userActive,
    rolloutStatus: state.rolloutStatus,
    draftConfig: state.draftConfig,
    pendingConfig: state.pendingConfig,
    publishedConfig: state.publishedConfig,
    effectiveConfig: state.publishedConfig || state.pendingConfig || state.draftConfig
  });
}

async function handleRecommendSyncActivity(req, res) {
  const body = await readJson(req);
  const state = readRecommendSyncState();
  state.userActivity = {
    sessionId: body.sessionId ? String(body.sessionId) : state.userActivity?.sessionId || null,
    sessionOpen: body.sessionOpen === false ? false : true,
    hasFocus: Boolean(body.hasFocus),
    documentHidden: Boolean(body.documentHidden),
    currentPage: String(body.currentPage || "catalog"),
    lastSeenAt: new Date().toISOString()
  };
  const evaluated = evaluateRecommendRollout(state, body.sessionOpen === false ? "session_closed" : "heartbeat");
  writeRecommendSyncState(state);
  sendJson(res, 200, {
    ok: true,
    userActive: evaluated.userActive,
    rolloutStatus: state.rolloutStatus,
    effectiveConfig: state.publishedConfig || state.pendingConfig || state.draftConfig
  });
}

async function handleRecommendSyncApply(req, res) {
  const body = await readJson(req);
  const state = readRecommendSyncState();
  const pendingConfig = state.pendingConfig;
  if (!pendingConfig) {
    sendJson(res, 404, { error: "No pending recommend config" });
    return;
  }
  if (body.versionId && body.versionId !== pendingConfig.versionId) {
    sendJson(res, 409, { error: "Pending version mismatch" });
    return;
  }
  if (isUserClientActive(state.userActivity)) {
    sendJson(res, 409, { error: "User client is still active; pending config cannot be applied yet." });
    return;
  }
  promotePendingRecommendConfig(state, "manual_apply");
  writeRecommendSyncState(state);
  sendJson(res, 200, { ok: true, publishedConfig: state.publishedConfig, rolloutStatus: state.rolloutStatus });
}

function readMockDb() {
  if (!fs.existsSync(mockDbPath)) {
    return { events: [], try_on_jobs: [], intents: [], orders: [] };
  }
  try {
    if (mockDbCache) return mockDbCache;
    mockDbCache = JSON.parse(fs.readFileSync(mockDbPath, "utf8"));
    return mockDbCache;
  } catch {
    return { events: [], try_on_jobs: [], intents: [], orders: [] };
  }
}

function writeMockDb(data) {
  fs.mkdirSync(path.dirname(mockDbPath), { recursive: true });
  fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2), "utf8");
  mockDbCache = data;
}

function appendMockEvent(event) {
  if (!event.event_name) return;
  const data = readMockDb();
  data.events ||= [];
  data.events.push({
    id: makeJobId(),
    store_id: "demo_store",
    created_at: new Date().toISOString(),
    ...event
  });
  writeMockDb(data);
}

function normalizeMetricEventName(eventName) {
  const map = {
    style_card_render: "style_card_render",
    style_impression: "style_impression",
    style_expose: "style_impression",
    style_view: "style_view",
    style_card_click: "detail_view",
    detail_view: "detail_view",
    want_click: "want_click",
    style_intent_click: "want_click",
    style_intent_submit: "want_click",
    tryon_click: "tryon_click",
    tryon_candidate_add: "tryon_click",
    tryon_result_view: "tryon_result_view",
    confirm_click: "confirm_click",
    style_confirm_click: "confirm_click",
    order_confirmed: "confirm_click",
    confirm_done: "confirm_done"
  };
  return map[eventName] || eventName;
}

function appendMockTryOn(job) {
  const data = readMockDb();
  data.try_on_jobs ||= [];
  data.try_on_jobs.push({
    store_id: "demo_store",
    created_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    ...job
  });
  writeMockDb(data);
}

function appendMockIntent(intent) {
  const data = readMockDb();
  data.intents ||= [];
  const row = {
    id: makeJobId(),
    store_id: "demo_store",
    created_at: new Date().toISOString(),
    ...intent
  };
  data.intents.push(row);
  writeMockDb(data);
  return row;
}

function appendMockOrder(order) {
  const data = readMockDb();
  data.orders ||= [];
  const row = {
    id: makeJobId(),
    store_id: "demo_store",
    ordered_at: new Date().toISOString(),
    source: "ai_try_on",
    ...order
  };
  data.orders.push(row);
  writeMockDb(data);
  return row;
}

function buildMetricsSummary(data) {
  const events = data.events || [];
  const tryOns = data.try_on_jobs || [];
  const intents = data.intents || [];
  const orders = data.orders || [];
  const exposureEvents = events.filter((event) => event.event_name === "style_expose");
  const validImpressionEvents = events.filter((event) => event.event_name === "style_impression" && event.is_valid_impression);
  const validViewEvents = events.filter((event) => event.event_name === "style_view" && event.is_valid_view);
  const candidateEvents = events.filter((event) => event.event_name === "tryon_candidate_add");
  const resultViews = events.filter((event) => event.event_name === "tryon_result_view");
  const intentClickEvents = events.filter((event) => event.event_name === "style_intent_click");
  const confirmEvents = events.filter((event) => event.event_name === "style_confirm_click");
  const directConfirms = confirmEvents.filter((event) => event.properties?.confirm_source === "card");
  const detailConfirms = confirmEvents.filter((event) => event.properties?.confirm_source === "detail");
  const tryOnResultConfirms = confirmEvents.filter((event) => event.properties?.confirm_source === "tryon_result");
  const wantListConfirms = confirmEvents.filter((event) => event.properties?.confirm_source === "want_list");
  const tryOnResultIntents = intentClickEvents.filter((event) => event.properties?.intent_source === "tryon_result");
  const unique = (rows, key) => new Set(rows.map((row) => row[key]).filter(Boolean)).size;
  const byStyle = new Map();

  for (const row of [...validImpressionEvents, ...validViewEvents, ...exposureEvents, ...candidateEvents, ...tryOns, ...intents, ...orders]) {
    const styleId = row.style_id || "unknown";
    const current = byStyle.get(styleId) || {
      style_id: styleId,
      style_name: row.style_name || row.properties?.style_name || styleId,
      exposures: 0,
      candidates: 0,
      try_ons: 0,
      intents: 0,
      orders: 0
    };
    current.style_name = row.style_name || row.properties?.style_name || current.style_name;
    if (row.event_name === "style_impression" || row.event_name === "style_expose") current.exposures += 1;
    if (row.event_name === "tryon_candidate_add") current.candidates += 1;
    if (row.result_url || row.status === "succeeded") current.try_ons += 1;
    if (intents.includes(row)) current.intents += 1;
    if (orders.includes(row)) current.orders += 1;
    byStyle.set(styleId, current);
  }

  const styleRows = [...byStyle.values()].map((row) => ({
    ...row,
    candidate_rate: safeRate(row.candidates, row.exposures),
    intent_rate: safeRate(row.intents, row.try_ons),
    booking_rate: safeRate(row.orders, row.intents)
  })).sort((a, b) => b.try_ons - a.try_ons || b.intents - a.intents);

  return {
    mode: tryOnMode,
    updated_at: new Date().toISOString(),
    totals: {
      exposures: validImpressionEvents.length || exposureEvents.length,
      views: validViewEvents.length,
      candidates: candidateEvents.length,
      try_ons: tryOns.length,
      try_on_users: unique(tryOns, "user_id"),
      result_views: resultViews.length,
      intents: intents.length,
      orders: orders.length,
      candidate_rate: safeRate(candidateEvents.length, validViewEvents.length || exposureEvents.length),
      direct_confirm_rate: safeRate(directConfirms.length, validViewEvents.length || exposureEvents.length),
      tryon_to_intent_rate: safeRate(intents.length, tryOns.length),
      tryon_confirm_rate: safeRate(tryOnResultConfirms.length, resultViews.length),
      tryon_start_to_confirm_rate: safeRate(tryOnResultConfirms.length, tryOns.length),
      tryon_want_rate: safeRate(tryOnResultIntents.length, resultViews.length),
      intent_to_order_rate: safeRate(orders.length, intents.length),
      total_confirm_rate: safeRate(confirmEvents.length || orders.length, validViewEvents.length || exposureEvents.length),
      confirm_sources: {
        card: directConfirms.length,
        detail: detailConfirms.length,
        tryon_result: tryOnResultConfirms.length,
        want_list: wantListConfirms.length
      }
    },
    styles: styleRows.slice(0, 20),
    recent_events: events.slice(-12).reverse()
  };
}

function safeRate(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(4)) : 0;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function execFileAsync(command, args, timeout) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd: root,
      timeout,
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 防机器人 beacon：真人浏览器执行 JS 后调用，写入专用日志供通知脚本监听
const BEACON_LOG = "/tmp/visitor-beacon.log";
async function handleBeacon(req, res) {
  // 允许跨域（页面和 API 同源，但保险起见）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  await new Promise((resolve) => req.on("end", resolve));

  let page = "/";
  try {
    const parsed = JSON.parse(body);
    page = parsed.page || "/";
  } catch (_) {}

  // 获取真实 IP（nginx 代理后用 X-Real-IP 或 X-Forwarded-For）
  const ip =
    req.headers["x-real-ip"] ||
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "";

  const ua = req.headers["user-agent"] || "";
  const time = new Date()
    .toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
    .replace(/\//g, "/");

  // 格式：IP|PAGE|UA|TIME
  const line = `${ip}|${page}|${ua}|${time}\n`;

  try {
    fs.appendFileSync(BEACON_LOG, line);
  } catch (_) {}

  sendJson(res, 200, { ok: true });
}


// ── OPS STATE DB ─────────────────────────────────────────────────────────────
const opsStatePath = path.join(root, "db", "ops-state.json");

function loadOpsState() {
  if (fs.existsSync(opsStatePath)) {
    try { return JSON.parse(fs.readFileSync(opsStatePath, "utf8")); } catch(_) {}
  }
  // 首次：从种子数据初始化
  const seedPath = path.join(root, "db", "xhs-admin-seed.json");
  const styles = fs.existsSync(seedPath) ? JSON.parse(fs.readFileSync(seedPath, "utf8")) : [];
  const state = {
    styles,
    feedSlots: [
      { position: 1, slotName: "P1 主爆款位", visibleType: "full_visible", styleId: styles[0]&&styles[0].id || null, styleName: styles[0]&&styles[0].name || null },
      { position: 2, slotName: "P2 稳转化位", visibleType: "full_visible", styleId: styles[1]&&styles[1].id || null, styleName: styles[1]&&styles[1].name || null },
      { position: 3, slotName: "P3 潜力激活位", visibleType: "full_visible", styleId: styles[2]&&styles[2].id || null, styleName: styles[2]&&styles[2].name || null },
      { position: 4, slotName: "P4 风格补位", visibleType: "full_visible", styleId: styles[3]&&styles[3].id || null, styleName: styles[3]&&styles[3].name || null },
      { position: 5, slotName: "P5 下滑吸引位", visibleType: "half_visible", styleId: styles[4]&&styles[4].id || null, styleName: styles[4]&&styles[4].name || null },
      { position: 6, slotName: "P6 新品测试位", visibleType: "half_visible", styleId: styles[5]&&styles[5].id || null, styleName: styles[5]&&styles[5].name || null },
      { position: 7, slotName: "P7 潜力扩展位", visibleType: "half_visible", styleId: styles[6]&&styles[6].id || null, styleName: styles[6]&&styles[6].name || null },
      { position: 8, slotName: "P8 多样性兜底位", visibleType: "half_visible", styleId: styles[7]&&styles[7].id || null, styleName: styles[7]&&styles[7].name || null }
    ],
    auditLogs: []
  };
  saveOpsState(state);
  return state;
}

function saveOpsState(state) {
  fs.writeFileSync(opsStatePath, JSON.stringify(state, null, 2), "utf8");
}

// GET /api/ops/styles
async function handleOpsStyles(req, res) {
  const state = loadOpsState();
  sendJson(res, 200, { styles: state.styles });
}

// GET /api/ops/feed-slots
async function handleOpsFeedSlots(req, res) {
  const state = loadOpsState();
  sendJson(res, 200, { feedSlots: state.feedSlots });
}

// GET /api/ops/audit-log
async function handleOpsAuditLog(req, res) {
  const state = loadOpsState();
  sendJson(res, 200, { logs: (state.auditLogs || []).slice(-200) });
}

// GET /api/ops/context  -- 给 DeepSeek 用的精简 JSON 上下文
async function handleOpsContext(req, res) {
  const state = loadOpsState();
  const ctx = {
    updatedAt: new Date().toISOString(),
    styleSummary: state.styles.map(function(s) {
      return {
        id: s.id, styleCode: s.styleCode, name: s.name,
        status: s.status, category: s.category, price: s.price,
        makeable: s.makeable, isPromoted: s.isPromoted,
        metrics: s.metrics ? {
          exposure: s.metrics.exposure, view: s.metrics.view,
          tryonSuccess: s.metrics.tryonSuccess, want: s.metrics.want,
          confirm: s.metrics.confirm, hotScore: s.metrics.hotScore,
          coldRiskScore: s.metrics.coldRiskScore, trendLabel: s.metrics.trendLabel,
          sampleStatus: s.metrics.sampleStatus
        } : null
      };
    }),
    feedSlots: state.feedSlots,
    recentLogs: (state.auditLogs || []).slice(-20)
  };
  sendJson(res, 200, ctx);
}

// POST /api/ops/execute  -- 执行原子写操作
async function handleOpsExecute(req, res) {
  let body = "";
  req.on("data", function(c) { body += c; });
  await new Promise(function(r) { req.on("end", r); });

  let payload;
  try { payload = JSON.parse(body); } catch(_) {
    return sendJson(res, 400, { ok: false, error: "invalid_json" });
  }

  const operation = payload.operation;
  const params = payload.params || {};
  const operatorId = payload.operatorId || "ops-manual";
  const note = payload.note || "";

  const state = loadOpsState();

  function findStyle(id) {
    if (!id) return null;
    return state.styles.find(function(s) { return s.id === id || s.styleCode === id; });
  }

  function writeLog(op, target, before, after) {
    if (!state.auditLogs) state.auditLogs = [];
    state.auditLogs.push({
      logId: "log-" + Date.now(),
      operation: op,
      targetId: target,
      operatorId: operatorId,
      note: note,
      before: before,
      after: after,
      executedAt: new Date().toISOString()
    });
  }

  var result;

  switch (operation) {
    case "unpublish_style":
    case "preview_unpublish_style": {
      var style = findStyle(params.styleId);
      if (!style) return sendJson(res, 404, { ok: false, error: "style_not_found" });
      var before0 = { status: style.status };
      style.status = "unpublished";
      style.unpublishedAt = new Date().toISOString().slice(0, 10);
      writeLog("unpublish_style", style.id, before0, { status: style.status });
      result = { ok: true, styleId: style.id, status: style.status };
      break;
    }
    case "publish_style":
    case "preview_publish_style":
    case "restore_style":
    case "preview_restore_style": {
      var style = findStyle(params.styleId);
      if (!style) return sendJson(res, 404, { ok: false, error: "style_not_found" });
      var before1 = { status: style.status };
      style.status = "published";
      style.unpublishedAt = null;
      writeLog("publish_style", style.id, before1, { status: style.status });
      result = { ok: true, styleId: style.id, status: style.status };
      break;
    }
    case "archive_style":
    case "preview_archive_style": {
      var style = findStyle(params.styleId);
      if (!style) return sendJson(res, 404, { ok: false, error: "style_not_found" });
      var before2 = { status: style.status };
      style.status = "archived";
      writeLog("archive_style", style.id, before2, { status: style.status });
      result = { ok: true, styleId: style.id, status: style.status };
      break;
    }
    case "update_style_description":
    case "preview_update_description": {
      var style = findStyle(params.styleId);
      if (!style) return sendJson(res, 404, { ok: false, error: "style_not_found" });
      var before3 = { description: style.description };
      style.description = params.description || style.description;
      writeLog("update_style_description", style.id, before3, { description: style.description });
      result = { ok: true, styleId: style.id };
      break;
    }
    case "update_style_tags":
    case "preview_update_tags": {
      var style = findStyle(params.styleId);
      if (!style) return sendJson(res, 404, { ok: false, error: "style_not_found" });
      var before4 = { tags: style.tags };
      style.tags = params.tags || style.tags;
      writeLog("update_style_tags", style.id, before4, { tags: style.tags });
      result = { ok: true, styleId: style.id };
      break;
    }
    case "update_style_price":
    case "preview_price_change": {
      var style = findStyle(params.styleId);
      if (!style) return sendJson(res, 404, { ok: false, error: "style_not_found" });
      var before5 = { price: style.price };
      style.price = params.price || style.price;
      writeLog("update_style_price", style.id, before5, { price: style.price });
      result = { ok: true, styleId: style.id };
      break;
    }
    case "replace_single_slot":
    case "preview_replace_single_slot": {
      var slot = state.feedSlots.find(function(s) { return s.position === params.position; });
      if (!slot) return sendJson(res, 404, { ok: false, error: "slot_not_found" });
      var newStyle = findStyle(params.newStyleId);
      var before6 = { styleId: slot.styleId, styleName: slot.styleName };
      slot.styleId = params.newStyleId;
      slot.styleName = newStyle ? newStyle.name : params.newStyleId;
      writeLog("replace_single_slot", "slot-" + params.position, before6, { styleId: slot.styleId, styleName: slot.styleName });
      result = { ok: true, position: slot.position, styleId: slot.styleId };
      break;
    }
    case "replace_section_styles":
    case "preview_replace_section": {
      var slots = params.slots || [];
      var before7 = state.feedSlots.map(function(s) { return { position: s.position, styleId: s.styleId }; });
      slots.forEach(function(item) {
        var slot = state.feedSlots.find(function(s) { return s.position === item.position; });
        if (slot) {
          var sty = findStyle(item.styleId);
          slot.styleId = item.styleId;
          slot.styleName = sty ? sty.name : item.styleId;
        }
      });
      writeLog("replace_section_styles", "home_feed", before7, state.feedSlots.map(function(s) { return { position: s.position, styleId: s.styleId }; }));
      result = { ok: true, feedSlots: state.feedSlots };
      break;
    }
    case "batch_unpublish_styles":
    case "preview_batch_unpublish": {
      var ids = params.styleIds || [];
      var changed = [];
      ids.forEach(function(id) {
        var style = findStyle(id);
        if (style && style.status === "published") {
          var before8 = { status: style.status };
          style.status = "unpublished";
          style.unpublishedAt = new Date().toISOString().slice(0, 10);
          writeLog("unpublish_style", style.id, before8, { status: style.status });
          changed.push(style.id);
        }
      });
      result = { ok: true, changed: changed };
      break;
    }
    case "update_style_cover_image":
    case "preview_update_cover_image": {
      var style = findStyle(params.styleId);
      if (!style) return sendJson(res, 404, { ok: false, error: "style_not_found" });
      var before_cover = { coverImage: style.coverImage };
      style.coverImage = params.coverImage || style.coverImage;
      if (style.imageAssets) { style.imageAssets.detailImages = params.detailImages || style.imageAssets.detailImages || []; }
      writeLog("update_style_cover_image", style.id, before_cover, { coverImage: style.coverImage });
      result = { ok: true, styleId: style.id };
      break;
    }
    case "save_recommend_config_draft":
    case "preview_replace_section_draft": {
      var slots = params.slots || state.feedSlots;
      var before_draft = JSON.parse(JSON.stringify(state.feedSlots));
      slots.forEach(function(item) {
        var slot = state.feedSlots.find(function(s) { return s.position === item.position; });
        if (slot && item.styleId) {
          var sty = findStyle(item.styleId);
          slot.styleId = item.styleId;
          slot.styleName = sty ? sty.name : item.styleId;
          if (item.reason) slot.reason = item.reason;
        }
      });
      writeLog("save_recommend_config_draft", "home_feed", before_draft, state.feedSlots.map(function(s) { return { position: s.position, styleId: s.styleId }; }));
      result = { ok: true, feedSlots: state.feedSlots, versionId: "draft-" + Date.now() };
      break;
    }
    case "publish_recommend_config":
    case "preview_feed_mix_change": {
      var slots2 = params.slots || state.feedSlots;
      var before_pub = JSON.parse(JSON.stringify(state.feedSlots));
      slots2.forEach(function(item) {
        var slot = state.feedSlots.find(function(s) { return s.position === item.position; });
        if (slot && item.styleId) {
          var sty = findStyle(item.styleId);
          slot.styleId = item.styleId;
          slot.styleName = sty ? sty.name : item.styleId;
          if (item.reason) slot.reason = item.reason;
        }
      });
      var pubVersion = "published-" + Date.now();
      writeLog("publish_recommend_config", "home_feed", before_pub, state.feedSlots.map(function(s) { return { position: s.position, styleId: s.styleId }; }));
      result = { ok: true, feedSlots: state.feedSlots, versionId: pubVersion, publishedAt: new Date().toISOString() };
      break;
    }
    case "create_operation_task": {
      if (!state.tasks) state.tasks = [];
      var task = {
        taskId: "task-" + Date.now(),
        title: params.title || "新运营待办",
        description: params.description || "",
        source: params.source || "manual",
        status: params.status || "todo",
        priority: params.priority || "medium",
        ownerId: params.ownerId || operatorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.tasks.unshift(task);
      writeLog("create_operation_task", task.taskId, null, { title: task.title, status: task.status });
      result = { ok: true, task: task };
      break;
    }
    case "update_task_status": {
      if (!state.tasks) state.tasks = [];
      var task2 = state.tasks.find(function(t) { return t.taskId === params.taskId; });
      if (!task2) return sendJson(res, 404, { ok: false, error: "task_not_found" });
      var before_task = { status: task2.status };
      task2.status = params.status || task2.status;
      task2.updatedAt = new Date().toISOString();
      writeLog("update_task_status", task2.taskId, before_task, { status: task2.status });
      result = { ok: true, task: task2 };
      break;
    }
    case "assign_task_owner": {
      if (!state.tasks) state.tasks = [];
      var task3 = state.tasks.find(function(t) { return t.taskId === params.taskId; });
      if (!task3) return sendJson(res, 404, { ok: false, error: "task_not_found" });
      var before_owner = { ownerId: task3.ownerId };
      task3.ownerId = params.ownerId || task3.ownerId;
      task3.updatedAt = new Date().toISOString();
      writeLog("assign_task_owner", task3.taskId, before_owner, { ownerId: task3.ownerId });
      result = { ok: true, task: task3 };
      break;
    }
    case "clone_recommend_config": {
      var cloned = JSON.parse(JSON.stringify(state.feedSlots));
      var cloneId = "config-clone-" + Date.now();
      if (!state.savedConfigs) state.savedConfigs = [];
      state.savedConfigs.push({ configId: cloneId, slots: cloned, savedAt: new Date().toISOString(), note: params.note || "" });
      writeLog("clone_recommend_config", cloneId, null, { configId: cloneId, slotsCount: cloned.length });
      result = { ok: true, configId: cloneId, slots: cloned };
      break;
    }
    case "create_recommendation_experiment": {
      if (!state.experiments) state.experiments = [];
      var exp = {
        experimentId: "exp-" + Date.now(),
        name: params.name || "新实验",
        description: params.description || "",
        controlSlots: JSON.parse(JSON.stringify(state.feedSlots)),
        testSlots: params.testSlots || [],
        trafficRatio: params.trafficRatio || 0.1,
        status: "created",
        createdAt: new Date().toISOString()
      };
      state.experiments.push(exp);
      writeLog("create_recommendation_experiment", exp.experimentId, null, { name: exp.name, status: exp.status });
      result = { ok: true, experiment: exp };
      break;
    }
    case "assign_experiment_traffic": {
      if (!state.experiments) state.experiments = [];
      var exp2 = state.experiments.find(function(e) { return e.experimentId === params.experimentId; });
      if (!exp2) return sendJson(res, 404, { ok: false, error: "experiment_not_found" });
      var before_exp = { trafficRatio: exp2.trafficRatio, status: exp2.status };
      exp2.trafficRatio = params.trafficRatio !== undefined ? params.trafficRatio : exp2.trafficRatio;
      exp2.status = "running";
      exp2.startedAt = new Date().toISOString();
      writeLog("assign_experiment_traffic", exp2.experimentId, before_exp, { trafficRatio: exp2.trafficRatio, status: exp2.status });
      result = { ok: true, experiment: exp2 };
      break;
    }
    case "stop_experiment": {
      if (!state.experiments) state.experiments = [];
      var exp3 = state.experiments.find(function(e) { return e.experimentId === params.experimentId; });
      if (!exp3) return sendJson(res, 404, { ok: false, error: "experiment_not_found" });
      var before_exp3 = { status: exp3.status };
      exp3.status = params.winner ? "completed" : "stopped";
      exp3.winner = params.winner || null;
      exp3.stoppedAt = new Date().toISOString();
      writeLog("stop_experiment", exp3.experimentId, before_exp3, { status: exp3.status, winner: exp3.winner });
      result = { ok: true, experiment: exp3 };
      break;
    }
    case "create_report_draft": {
      if (!state.reports) state.reports = [];
      var report = {
        reportId: "report-" + Date.now(),
        title: params.title || "新报告",
        type: params.type || "weekly",
        status: "draft",
        sections: params.sections || [],
        createdBy: operatorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.reports.push(report);
      writeLog("create_report_draft", report.reportId, null, { title: report.title, type: report.type });
      result = { ok: true, report: report };
      break;
    }
    case "save_report_snapshot": {
      if (!state.reports) state.reports = [];
      var report2 = state.reports.find(function(r) { return r.reportId === params.reportId; });
      if (!report2) return sendJson(res, 404, { ok: false, error: "report_not_found" });
      var before_rpt = { status: report2.status };
      report2.snapshot = params.snapshotData || { stylesCount: state.styles.length, publishedCount: state.styles.filter(function(s){return s.status==="published";}).length };
      report2.snapshotAt = new Date().toISOString();
      report2.updatedAt = new Date().toISOString();
      writeLog("save_report_snapshot", report2.reportId, before_rpt, { snapshotAt: report2.snapshotAt });
      result = { ok: true, report: report2 };
      break;
    }
    case "export_report": {
      if (!state.reports) state.reports = [];
      var report3 = state.reports.find(function(r) { return r.reportId === params.reportId; });
      if (!report3) return sendJson(res, 404, { ok: false, error: "report_not_found" });
      report3.exportedAt = new Date().toISOString();
      report3.exportFormat = params.format || "pdf";
      writeLog("export_report", report3.reportId, null, { format: report3.exportFormat, exportedAt: report3.exportedAt });
      result = { ok: true, reportId: report3.reportId, downloadUrl: "/api/ops/report-export/" + report3.reportId };
      break;
    }
    case "mark_report_reviewed": {
      if (!state.reports) state.reports = [];
      var report4 = state.reports.find(function(r) { return r.reportId === params.reportId; });
      if (!report4) return sendJson(res, 404, { ok: false, error: "report_not_found" });
      var before_rpt4 = { status: report4.status };
      report4.status = "reviewed";
      report4.reviewedBy = operatorId;
      report4.reviewedAt = new Date().toISOString();
      writeLog("mark_report_reviewed", report4.reportId, before_rpt4, { status: "reviewed", reviewedBy: operatorId });
      result = { ok: true, report: report4 };
      break;
    }
    case "create_style": {
      var newStyle = {
        id: params.id || ("style-" + Date.now() + "-" + Math.floor(Math.random()*10000)),
        styleCode: params.styleCode || ("S" + Date.now()),
        name: params.name || "未命名款式",
        description: params.description || "",
        category: params.category || "",
        price: Number(params.price) || 0,
        status: params.status || "draft",
        makeable: params.makeable !== undefined ? params.makeable : true,
        crawled: params.crawled || false,
        isPromoted: false,
        isColdStart: false,
        sortWeight: 0,
        listedAt: new Date().toISOString().slice(0,10),
        unpublishedAt: null,
        coverImage: params.coverImage || "",
        tags: params.tags || {
          color: params.colorTags || [],
          style: params.styleTags || [],
          craft: params.craftTags || [],
          length: params.lengthTags || [],
          scene: params.sceneTags || [],
          effect: params.effectTags || []
        },
        imageAssets: {
          detailImages: params.detailImages || [],
          referenceImages: params.referenceImages || [],
          tryonAssets: params.tryonAssets || []
        },
        metrics: { exposure: 0, view: 0, detail: 0, basketAdd: 0, tryonSuccess: 0, order: 0 }
      };
      state.styles.unshift(newStyle);
      writeLog("create_style", newStyle.id, null, { name: newStyle.name, status: newStyle.status });
      result = { ok: true, style: newStyle };
      break;
    }
    case "batch_create_styles": {
      var newStyles = Array.isArray(params.styles) ? params.styles : [];
      var created = [];
      newStyles.forEach(function(p) {
        var ns = {
          id: p.id || ("style-" + Date.now() + "-" + Math.floor(Math.random()*100000)),
          styleCode: p.styleCode || ("S" + Date.now()),
          name: p.name || "未命名",
          description: p.description || "",
          category: p.category || "",
          price: Number(p.price) || 0,
          status: p.status || "draft",
          makeable: p.makeable !== undefined ? p.makeable : true,
          crawled: p.crawled || false,
          isPromoted: false,
          isColdStart: false,
          sortWeight: 0,
          listedAt: new Date().toISOString().slice(0,10),
          unpublishedAt: null,
          coverImage: p.coverImage || "",
          tags: p.tags || {
            color: p.colorTags || [],
            style: p.styleTags || [],
            craft: p.craftTags || [],
            length: p.lengthTags || [],
            scene: p.sceneTags || [],
            effect: p.effectTags || []
          },
          imageAssets: {
            detailImages: p.detailImages || [],
            referenceImages: p.referenceImages || [],
            tryonAssets: p.tryonAssets || []
          },
          metrics: { exposure: 0, view: 0, detail: 0, basketAdd: 0, tryonSuccess: 0, order: 0 }
        };
        state.styles.unshift(ns);
        created.push(ns);
      });
      writeLog("batch_create_styles", "bulk", null, { count: created.length });
      result = { ok: true, styles: created, count: created.length };
      break;
    }
    case "toggle_style_promoted":
    case "set_style_promoted": {
      var sty_promo = findStyle(params.styleId);
      if (!sty_promo) return sendJson(res, 404, { ok: false, error: "style_not_found" });
      var before_promo = { isPromoted: sty_promo.isPromoted, isColdStart: sty_promo.isColdStart };
      if (params.isPromoted !== undefined) sty_promo.isPromoted = params.isPromoted;
      if (params.isColdStart !== undefined) sty_promo.isColdStart = params.isColdStart;
      writeLog("toggle_style_promoted", sty_promo.id, before_promo, { isPromoted: sty_promo.isPromoted });
      result = { ok: true, styleId: sty_promo.id, isPromoted: sty_promo.isPromoted };
      break;
    }
    case "toggle_style_makeable": {
      var sty_mk = findStyle(params.styleId);
      if (!sty_mk) return sendJson(res, 404, { ok: false, error: "style_not_found" });
      var before_mk = { makeable: sty_mk.makeable };
      sty_mk.makeable = params.makeable !== undefined ? params.makeable : !sty_mk.makeable;
      writeLog("toggle_style_makeable", sty_mk.id, before_mk, { makeable: sty_mk.makeable });
      result = { ok: true, styleId: sty_mk.id, makeable: sty_mk.makeable };
      break;
    }
    case "update_style_sort_weight": {
      var sty_sort = findStyle(params.styleId);
      if (!sty_sort) return sendJson(res, 404, { ok: false, error: "style_not_found" });
      var before_sort = { sortWeight: sty_sort.sortWeight };
      sty_sort.sortWeight = params.sortWeight !== undefined ? params.sortWeight : sty_sort.sortWeight;
      writeLog("update_style_sort_weight", sty_sort.id, before_sort, { sortWeight: sty_sort.sortWeight });
      result = { ok: true, styleId: sty_sort.id };
      break;
    }
    case "batch_update_tags": {
      var styleIds_bt = Array.isArray(params.styleIds) ? params.styleIds : (params.styleId ? [params.styleId] : []);
      var updated_bt = 0;
      styleIds_bt.forEach(function(sid) {
        var sty = findStyle(sid);
        if (sty) {
          var before = { tags: sty.tags };
          if (params.tags) {
            sty.tags = params.tags;
          } else if (params.addTags || params.removeTags) {
            // tags can be array or dict; normalise to dict by category
            if (Array.isArray(sty.tags)) {
              if (params.addTags) sty.tags = Array.from(new Set(sty.tags.concat(params.addTags)));
              if (params.removeTags) sty.tags = sty.tags.filter(function(t){return !params.removeTags.includes(t);});
            } else {
              // tags is object {color:[...], style:[...]}
              if (params.addTags) {
                if (!sty.tags.custom) sty.tags.custom = [];
                params.addTags.forEach(function(tag) { if (!sty.tags.custom.includes(tag)) sty.tags.custom.push(tag); });
              }
              if (params.removeTags) {
                Object.keys(sty.tags).forEach(function(k) {
                  if (Array.isArray(sty.tags[k])) sty.tags[k] = sty.tags[k].filter(function(t){return !params.removeTags.includes(t);});
                });
              }
            }
          }
          writeLog("batch_update_tags", sty.id, before, { tags: sty.tags });
          updated_bt++;
        }
      });
      result = { ok: true, updatedCount: updated_bt };
      break;
    }
    case "batch_update_price": {
      var styleIds_bp = Array.isArray(params.styleIds) ? params.styleIds : (params.styleId ? [params.styleId] : []);
      var updated_bp = 0;
      styleIds_bp.forEach(function(sid) {
        var sty = findStyle(sid);
        if (sty) {
          var before = { price: sty.price };
          if (params.price !== undefined) sty.price = params.price;
          if (params.priceAdjust) sty.price = Math.max(0, (sty.price||0) + params.priceAdjust);
          writeLog("batch_update_price", sty.id, before, { price: sty.price });
          updated_bp++;
        }
      });
      result = { ok: true, updatedCount: updated_bp };
      break;
    }
    default:
      return sendJson(res, 400, { ok: false, error: "unknown_operation", operation: operation });
  }

  saveOpsState(state);
  sendJson(res, 200, result);
}
