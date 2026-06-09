#!/bin/bash
# 一键启动：首次自动初始化，后续直接启动
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
ADMIN="$ROOT/admin-ops"

# ── 首次检测：缺少 styles.db 则先生成所有数据 ──────────────
if [ ! -f "$ADMIN/styles.db" ]; then
  echo "⚙️  首次运行，初始化数据（约 1-2 分钟）..."
  echo ""

  # 检查依赖
  command -v python3 >/dev/null 2>&1 || { echo "❌ 需要 python3"; exit 1; }
  command -v node    >/dev/null 2>&1 || { echo "❌ 需要 Node.js"; exit 1; }

  # 安装 npm 依赖
  echo "→ 安装 npm 依赖..."
  cd "$ADMIN" && npm install --silent && cd "$ROOT"

  # 生成所有数据
  bash "$ROOT/user-client/scripts/run_all.sh"

  echo ""
  echo "✅ 初始化完成！"
  echo ""
fi

# ── 填写 API Key 提示 ──────────────────────────────────────
KEY_FILE="$ROOT/user-client/deepseek-key.txt"
KEY_VAL="$(cat "$KEY_FILE" 2>/dev/null | tr -d '[:space:]')"
if [ "$KEY_VAL" = "在此填写你的DeepSeekAPIKey" ] || [ -z "$KEY_VAL" ]; then
  echo "⚠️  提示：AI 运营助手需要 DeepSeek API Key"
  echo "   请在 user-client/deepseek-key.txt 中填写后重启"
  echo ""
fi

# ── 启动 ──────────────────────────────────────────────────
echo "🚀 启动运营端..."
cd "$ADMIN"
npm run dev:full
