#!/bin/bash
# 一键数据生成（从 nail/ 或 user-client/ 均可运行）
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
UC="$ROOT/user-client"
ADMIN="$ROOT/admin-ops"

echo "=== [1/5] 构建 XHS 款式数据集 ==="
node "$UC/scripts/build_xhs_style_dataset.mjs"

echo ""
echo "=== [2/5] 生成趋势仿真数据（~30s）==="
python3 "$UC/scripts/simulate_nail_trends.py"

echo ""
echo "=== [3/5] 构建运营 mock 数据 ==="
python3 "$UC/scripts/build_xhs_operational_mock.py"

echo ""
echo "=== [4/5] 导入 SQLite ==="
python3 "$UC/scripts/import_simulation_to_sqlite.py"

echo ""
echo "=== [5/5] 初始化运营端数据库 ==="
node "$ADMIN/init-styles-db.cjs"

echo ""
echo "✅ 数据生成完毕。"
