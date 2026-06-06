# 美甲趋势模拟与模型流程 README

## 1. 目标

当前阶段不做真实预测，先做一套效果稳定、逻辑顺、能跑通看板和模型流程的模拟系统。

流程：

```text
模拟 300 款 * 120 天每日聚合数据
-> 聚合成 7 日窗口指标
-> 自动生成 HotUp / ColdDown / Stable / Potential / Untested 等标签
-> 用当前窗口指标预测下一窗口标签
-> 输出热门榜、冷门榜、潜力榜、模型效果
```

## 2. 为什么先模拟每日聚合

第一版不模拟用户明细，而是直接模拟：

```text
style_id + date + 每日行为量
```

这样已经足够验证：

```text
冷门预警
热门趋势
潜力款识别
样本不足判断
模型训练
前端看板展示
```

## 3. 隐藏真实状态

模拟器先给每个款式分配一个隐藏状态：

```text
HotUp
Stable
Cold_FirstLook
Cold_Detail
Cold_AfterTryon
Cold_AfterWant
ColdDown
Potential
Untested
```

这些状态控制浏览量趋势和各路径转化率，让模拟数据有真实业务结构。

## 4. 行为链路

模拟数据按真实路径生成，而不是让每个指标独立随机：

```text
view_uv
├─ detail_uv
├─ tryon_uv
│  └─ tryon_result_uv
│     ├─ want_after_tryon_uv
│     └─ confirm_after_tryon_uv
├─ want_uv
│  └─ confirm_from_want_uv
└─ confirm_direct_uv
```

最终：

```text
total_confirm_uv =
confirm_direct_uv
+ confirm_detail_uv
+ confirm_after_tryon_uv
+ confirm_from_want_uv
```

## 5. 输出文件

运行：

```bash
python scripts\simulate_nail_trends.py
```

输出：

```text
outputs/simulation/simulated_nail_style_table.csv
outputs/simulation/simulated_nail_style_daily_metrics.csv
outputs/simulation/simulated_nail_style_weekly_metrics.csv
outputs/simulation/hot_trend_leaderboard.csv
outputs/simulation/cold_risk_leaderboard.csv
outputs/simulation/potential_leaderboard.csv
outputs/simulation/summary.json
```

## 6. 模型说明

脚本优先使用 `scikit-learn` 的 `RandomForestClassifier`。如果当前环境没有安装 sklearn，会自动退回 `NearestCentroid` 兜底分类器。

它不是为了证明真实世界预测能力，而是为了验证：

```text
指标设计 -> 标签体系 -> 模型训练 -> 看板输出
```

当前脚本同时输出两类效果：

```text
model_report_true_3class：预测模拟器隐藏真实状态，效果更稳定
model_report_3class：预测规则生成的下一周期标签，波动更大
```

第一版建议对外展示 `model_report_true_3class`：

```text
HotUp
ColdRisk
Normal
```

## 7. 前端展示

网页数据设计页会读取：

```text
GET /api/simulation-summary
```

展示：

```text
模拟数据规模
三分类准确率
Macro F1
热门趋势榜
冷门预警榜
模型效果表
```

## 8. 后续升级

下一步可以做：

```text
1. 把模拟 CSV 导入数据库
2. 用 style_daily_metrics / style_window_metrics 直接跑 SQL 聚合
3. 加一个“重新生成模拟数据”按钮
4. 安装 LightGBM 或 XGBoost，提高演示模型效果
5. 用真实埋点逐步替换模拟参数
```
