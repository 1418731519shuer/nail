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

    if (req.method === "GET" && url.pathname === "/api/simulation-summary") {
      await handleSimulationSummary(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/simulation-db-summary") {
      await handleSimulationDbSummary(req, res);
      return;
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

  if (!userMessage) {
    sendJson(res, 400, { error: "message is required" });
    return;
  }

  const messages = [
    {
      role: "system",
      content: buildOpsSystemPrompt(opsContext)
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

  sendJson(res, 200, normalizeOpsAdvisorReply(parsed));
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

async function handleSimulationSummary(req, res) {
  const summaryPath = path.join(root, "outputs", "simulation", "summary.json");
  if (!fs.existsSync(summaryPath)) {
    sendJson(res, 404, { error: "Simulation summary not found. Run python scripts/simulate_nail_trends.py first." });
    return;
  }
  const data = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const dbSummaryPath = path.join(root, "db", "simulation-db-summary.json");
  if (fs.existsSync(dbSummaryPath)) {
    data.database_summary = JSON.parse(fs.readFileSync(dbSummaryPath, "utf8"));
  }
  sendJson(res, 200, data);
}

async function handleSimulationDbSummary(req, res) {
  const summaryPath = path.join(root, "db", "simulation-db-summary.json");
  if (!fs.existsSync(summaryPath)) {
    sendJson(res, 404, {
      error: "Simulation database summary not found. Run python scripts/import_simulation_to_sqlite.py first."
    });
    return;
  }
  sendJson(res, 200, JSON.parse(fs.readFileSync(summaryPath, "utf8")));
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
2. 一次最多说 2-4 句，重点放在“为什么适合”和“一个小提醒”。
3. 可以追问预算、甲长、肤色顾虑、场景、是否接受贴钻/金箔/手绘，但追问要短。
4. 必须提醒真实顾虑，例如手绘考验技师、猫眼光泽持久度、渐变长出来分层、短甲效果限制，但一句话带过。
5. 如果用户已上传手部照片入口，说明“我会结合手部照片判断”，但不要假装已经做了真实视觉识别。
6. 输出必须是 JSON 对象，不要 Markdown。

店内款式数据库：
${JSON.stringify(styles.map((item) => ({
    id: item.id,
    name: item.name,
    primaryTag: item.primaryTag,
    secondaryTag: item.secondaryTag,
    rating: item.rating,
    likes: item.likes,
    definition: item.definition
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
    hotStyles: Array.isArray(opsContext.hotStyles) ? opsContext.hotStyles.slice(0, 8) : [],
    coldStyles: Array.isArray(opsContext.coldStyles) ? opsContext.coldStyles.slice(0, 8) : [],
    potentialStyles: Array.isArray(opsContext.potentialStyles) ? opsContext.potentialStyles.slice(0, 6) : [],
    recommendList: Array.isArray(opsContext.recommendList) ? opsContext.recommendList.slice(0, 8) : [],
    modelReport: opsContext.modelReport || null,
    currentPage: opsContext.currentPage || ""
  };

  return `
你是美甲门店的 AI 运营助手，服务对象是店长/运营人员，不是顾客。
语气要求：中文、口语、简短、直接，像真实运营同事给建议；不要写长报告，默认 3-6 句。

你的任务：
1. 基于提供的运营数据回答，不能编造不存在的数据。
2. 能解释今日运营、热门款、冷门风险、潜力款、推荐位排序、试戴/想要做/确认要做转化。
3. 给建议时必须可执行，例如“把某款放到首屏第几位”“降低某款曝光”“检查封面/价格/试戴效果”。
4. 如果数据不足，要直接说明“样本不足”，不要假装预测准确。
5. 用户问推荐位时，优先使用 8 个推荐槽：前 4 个负责转化，后 4 个负责探索。
6. 输出必须是 JSON 对象，不要 Markdown。

当前运营数据：
${JSON.stringify(compactContext, null, 2)}

返回 JSON 格式：
{
  "reply": "给运营看的自然中文回复，80-220字",
  "actions": ["最多4条可执行动作"],
  "focusStyles": ["最多4个重点款式名"],
  "riskLevel": "low|medium|high",
  "followUpQuestion": "一个可选追问，最多30字"
}
`;
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

function readMockDb() {
  if (!fs.existsSync(mockDbPath)) {
    return { events: [], try_on_jobs: [], intents: [], orders: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(mockDbPath, "utf8"));
  } catch {
    return { events: [], try_on_jobs: [], intents: [], orders: [] };
  }
}

function writeMockDb(data) {
  fs.mkdirSync(path.dirname(mockDbPath), { recursive: true });
  fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2), "utf8");
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
