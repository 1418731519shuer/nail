/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14 App Router：本地开发无严格请求体限制
  // 生产部署到 Vercel 时免费版限制 4.5MB，需升级或自托管
  // 图片上传大小由前端控制（见 config/ai.ts maxImageMB）
};

module.exports = nextConfig;
