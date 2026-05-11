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

    if (req.method === "POST" && url.pathname === "/api/tryon-generate") {
      await handleTryOnGenerate(req, res);
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

async function handleTryOnGenerate(req, res) {
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

  if (!styleFile || !handFile) {
    sendJson(res, 400, { error: "styleImage and handImage are required" });
    return;
  }

  const jobId = makeJobId();
  const stylePath = path.join(storageDirs.styles, `${jobId}-style${safeImageExt(styleFile.filename, styleFile.contentType)}`);
  const handPath = path.join(storageDirs.hands, `${jobId}-hand${safeImageExt(handFile.filename, handFile.contentType)}`);
  const resultPath = path.join(storageDirs.results, `${jobId}-result.png`);

  fs.writeFileSync(stylePath, styleFile.data);
  fs.writeFileSync(handPath, handFile.data);

  await runTryOn(stylePath, handPath, resultPath);

  if (!fs.existsSync(resultPath)) {
    sendJson(res, 500, { error: "Try-on generation failed: result file was not created" });
    return;
  }

  sendJson(res, 200, {
    id: jobId,
    handUrl: toPublicPath(handPath),
    styleUrl: toPublicPath(stylePath),
    resultUrl: toPublicPath(resultPath)
  });
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

function runTryOn(stylePath, handPath, resultPath) {
  return new Promise((resolve, reject) => {
    execFile("python", [tryOnScript, stylePath, handPath, resultPath], {
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
