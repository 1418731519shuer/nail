# AI 美甲试戴与运营系统交付包

这个目录是当前项目的干净迁移版，分为用户端和运营端两部分，方便后续部署、交给其他 AI 阅读、继续开发或演示。

## 目录结构

```text
nail-ai-ops-package/
├─ user-client/          用户端网页 + Node API 服务
│  ├─ index.html         用户端单页应用入口
│  ├─ app.js             用户端交互、试戴、埋点、DeepSeek 顾客助手逻辑
│  ├─ styles.css         用户端样式
│  ├─ server.js          Node 后端：静态服务、DeepSeek、试戴、指标、模拟数据接口
│  ├─ assets/            美甲款式图、手部扫描引导图
│  ├─ db/                模拟数据库、SQL 设计、埋点 JSON
│  ├─ docs/              指标、数据库、模拟模型、产品口径文档
│  ├─ scripts/           趋势模拟、SQLite 导入、指甲分割、WiLoR 推理脚本
│  └─ outputs/simulation 模拟趋势 CSV 和模型效果摘要
├─ admin-ops/            运营端 Vue + Element Plus 应用
│  ├─ src/App.vue        运营端全局布局 + 右侧 AI 运营助手抽屉
│  ├─ src/views/         运营日报、热门冷门、款式管理、推荐位、AI助手页面
│  ├─ src/api/opsData.js 用户端 API 数据归一化与推荐位组装
│  ├─ src/router/        运营端路由
│  └─ vite.config.js     3000 端口 + /api 代理到用户端 4173
└─ start-dev.ps1         Windows 一键启动脚本
```

## 快速启动

### 1. 配置用户端环境变量

复制：

```powershell
cd C:\Users\chen\Documents\Codex\2026-05-08\nail-ai-ops-package\user-client
copy .env.example .env
```

然后编辑 `.env`：

```env
DEEPSEEK_API_KEY="你的 DeepSeek key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
PORT=4173
NAIL_TRYON_MODE="mock"
```

注意：不要把真实 `.env` 提交或发给别人。交付包里只保留 `.env.example`。

### 2. 启动用户端

```powershell
cd C:\Users\chen\Documents\Codex\2026-05-08\nail-ai-ops-package\user-client
node server.js
```

打开：

```text
http://localhost:4173
```

### 3. 启动运营端

```powershell
cd C:\Users\chen\Documents\Codex\2026-05-08\nail-ai-ops-package\admin-ops
npm install
npm run dev -- --host 127.0.0.1
```

打开：

```text
http://127.0.0.1:3000
```

运营端通过 `vite.config.js` 把 `/api` 代理到 `http://localhost:4173`，所以必须先启动用户端后端。

### 4. 一键启动

也可以从根目录运行：

```powershell
cd C:\Users\chen\Documents\Codex\2026-05-08\nail-ai-ops-package
.\start-dev.ps1
```

## 当前业务页面

### 用户端

用户端是单页应用，主要页面包括：

- 款式概览：展示美甲款式，支持一级/二级标签筛选。
- 自定义美甲试戴：上传款式图和用户手图，普通试戴/超仿真试戴接口分开。
- 智能美甲推荐：顾客与 AI 对话，AI 根据需求推荐店内款式。
- 我想做/确认做：沉淀强意向和预约成交。
- 一键试戴结果：多款批量试戴结果展示。

款式概览现在采用 8 个推荐槽循环：

```text
前 4 个完整露出：2 热门/稳定 + 1 潜力 + 1 个性化/新品
后 4 个半露出：1 热门 + 1 潜力 + 1 样本不足/新品 + 1 多样性补位
```

用户端不展示“冷门/弱势”等后台标签，只展示自然文案：

```text
今日精选 / 店内常做款 / 小众但好看 / 适合你试试 / 正在流行 / 新款灵感 / 店长推荐 / 换个风格
```

### 运营端

运营端页面包括：

- 运营日报 `/dashboard`
  - 今日试戴、AI 试戴用户、确认要做、人均试戴/成交。
  - 冷热双线趋势图，使用 ECharts 5.5.1。
  - 热门款式 TOP5。
- 热门冷门 `/trending`
  - 热门趋势榜、冷门预警榜、模拟数据库状态、模型效果。
- 款式管理 `/styles`
  - 款式列表和运营状态。
- 推荐位管理 `/recommend`
  - 8 个推荐位，一行 4 个。
  - 展示试戴、想要做、确认要做、确认率、热门分。
- AI 运营助手 `/ai-assistant`
  - 完整对话页面。

另外所有运营端页面右下角都有一个 `AI` 小按钮，点击后右侧弹出 AI 运营助手抽屉。

## DeepSeek 接口

DeepSeek Key 只放在用户端后端 `.env`，前端不直接持有 key。

### 顾客侧 AI 推荐

```http
POST /api/deepseek-chat
```

用途：用户端智能美甲推荐客服。

输入核心字段：

```json
{
  "message": "用户需求",
  "history": [],
  "styles": [],
  "hasPhoto": false,
  "memory": []
}
```

输出：

```json
{
  "reply": "给顾客看的短回复",
  "recommendedIds": ["款式id"],
  "memory": ["偏好标签"],
  "followUpQuestion": "追问"
}
```

### 运营侧 AI 助手

```http
POST /api/ops-deepseek-chat
```

用途：运营端右侧抽屉和完整 AI 运营助手页面。

输入核心字段：

```json
{
  "message": "运营问题",
  "history": [],
  "opsContext": {
    "totals": {},
    "todayStats": {},
    "hotStyles": [],
    "coldStyles": [],
    "potentialStyles": [],
    "recommendList": [],
    "modelReport": {}
  }
}
```

输出：

```json
{
  "reply": "给运营看的建议",
  "actions": ["可执行动作"],
  "focusStyles": ["重点款式"],
  "riskLevel": "low|medium|high",
  "followUpQuestion": "追问"
}
```

## 数据与指标

当前项目采用“模拟数据 + 明细抽样 + 日/周聚合”的方式跑通看板。

核心表和文件：

- `user-client/db/schema.sql`：完整数据库表结构。
- `user-client/db/nail_simulation.sqlite`：SQLite 模拟数据库。
- `user-client/db/simulation-db-summary.json`：数据库摘要。
- `user-client/outputs/simulation/summary.json`：模型与模拟结果摘要。
- `user-client/docs/database-design.md`：数据库设计说明。
- `user-client/docs/pm-metrics-readme.md`：产品经理视角指标说明。
- `user-client/docs/simulation-model-readme.md`：模拟模型说明。

核心行为事件：

```text
style_impression       有效曝光
style_view             有效浏览
detail_view            详情浏览
tryon_click            发起试戴
tryon_result_view      查看试戴结果
want_click             想要做
confirm_click          确认要做
confirm_done           门店最终确认
```

核心指标：

```text
TryOnRate              试戴率 = tryon_uv / view_uv
WantRate               想要率 = want_uv / view_uv
TryOnConfirmRate       试戴后确认率 = confirm_after_tryon_uv / tryon_result_uv
WantToConfirmRate      想要后确认率 = confirm_from_want_uv / want_uv
TotalConfirmRate       总确认率 = confirm_uv / view_uv
HotScore               热门分
ColdRiskScore          冷门风险分
GrowthScore            增长分
```

冷热标签：

```text
HotUp                  升温热门款
Stable                 稳定款
Potential              潜力款，低曝光高转化
Untested               样本不足
Cold_FirstLook         第一眼不吸引
Cold_Detail            详情页劝退
Cold_AfterTryon        试戴后劝退
Cold_AfterWant         想要后不确认
ColdDown               综合降温
```

## 模拟数据重建

如需重新生成模拟数据：

```powershell
cd user-client
python scripts/simulate_nail_trends.py
python scripts/import_simulation_to_sqlite.py
```

生成结果：

```text
outputs/simulation/
db/nail_simulation.sqlite
db/simulation-db-summary.json
```

## 试戴生成接口

当前默认是模拟试戴：

```env
NAIL_TRYON_MODE="mock"
```

接口：

```http
POST /api/tryon-generate
POST /api/hyperreal-tryon-generate
```

区别：

- 普通试戴：快速接口，占位给后续普通生成模型。
- 超仿真试戴：慢接口，占位给后续高质量生成模型。

当 `NAIL_TRYON_MODE="real"` 时，会走 `NAIL_TRYON_SCRIPT` 指定的豆包浏览器脚本。

## 手部/指甲识别外部依赖

项目预留了两个识别能力：

### WiLoR 手部 3D 检测

```env
NAIL_DETECTION_BASE_URL="http://localhost:8088"
```

对应接口：

```http
POST /api/hand-detect-clean
POST /api/hand-detect-3d
```

### 指甲分割模型

```env
NAIL_SEG_MODEL="C:\Users\chen\Downloads\nails_seg_s_yolov8_v1.pt"
```

对应接口：

```http
POST /api/nail-segment
```

如果这两个外部服务或模型不存在，用户端页面会提示失败，但不会影响款式概览、运营端看板和 DeepSeek 助手。

## 运营端推荐位逻辑

推荐位在 `admin-ops/src/api/opsData.js` 中组装。

8 个推荐位：

```text
hero_full_1   今日精选       首屏高热度
hero_full_2   店内常做款     高确认转化
hero_full_3   小众但好看     潜力款激活
hero_full_4   适合你试试     个性化/新品补位
peek_half_1   正在流行       热门延续
peek_half_2   新款灵感       潜力款二次测试
peek_half_3   店长推荐       样本不足小流量测试
peek_half_4   换个风格       风格多样性补位
```

推荐位埋点字段：

```text
slot_type
recommend_source
recommend_reason
position_index
```

## 给后续 AI 的阅读顺序

如果你是接手这个项目的 AI，建议按这个顺序读：

1. `README.md`，先理解整体架构。
2. `user-client/server.js`，理解所有后端接口。
3. `user-client/app.js`，理解用户端页面和埋点。
4. `admin-ops/src/api/opsData.js`，理解运营端数据归一化和推荐位。
5. `admin-ops/src/App.vue`，理解全局布局和 AI 运营助手抽屉。
6. `admin-ops/src/views/dashboard/index.vue`，理解运营日报。
7. `user-client/docs/database-design.md` 和 `docs/simulation-model-readme.md`，理解数据库和模拟模型。

## 注意事项

- 不要提交真实 `.env` 或 DeepSeek Key。
- 不要把 `node_modules/`、`dist/`、临时上传图和生成结果放进交付包。
- 用户端必须先于运营端启动，因为运营端 `/api` 代理依赖用户端 4173。
- 当前成交口径：`确认要做` 可以作为模拟预约/成交，方便运营数据演示。
- 当前 AI 试戴生成默认是 mock，后续可以替换为真实生成 API 或豆包浏览器脚本。
