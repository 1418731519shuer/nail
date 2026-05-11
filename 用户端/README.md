# 美甲 AI 试戴原型

## 启动 DeepSeek 客服代理

1. 复制 `.env.example` 为 `.env`
2. 把新生成的 DeepSeek key 填入 `.env`
3. 启动服务：

```bash
npm start
```

4. 打开：

```text
http://localhost:4173
```

第三页“智能推荐”会通过 `/api/deepseek-chat` 调用本地后端代理，再由后端读取 `.env` 调用 DeepSeek。不要把 API key 写进 `app.js` 或任何前端文件。

## 美甲试戴生成

第二页“自定义美甲试戴”会调用本地接口：

```text
POST /api/tryon-generate
```

上传字段：

```text
styleImage: 用户想做的美甲款式图
handImage: 用户手部照片
```

文件会按用途保存到三个文件夹：

```text
uploads/user-hands/          用户手部照片
uploads/nail-styles/         用户要做的美甲款式
outputs/generated-results/   AI 生成效果图
```

后端会调用：

```text
E:\豆包工具\美甲试戴_浏览器版.py <款式图> <手图> <保存路径>
```

生成可能较慢，服务端等待上限为 10 分钟。浏览器版会控制豆包网页，如果首次使用需要先确保豆包账号已登录。
