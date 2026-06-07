import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as echarts from 'echarts'
import router from './router'
import App from './App.vue'
import './assets/styles/main.css'

// ── ECharts 全局字体 ──────────────────────────────────────
// 标签/图例用 DM Sans + Noto Sans SC，数字轴用 DM Mono
echarts.registerTheme('nail', {
  textStyle: {
    fontFamily: "'DM Sans', 'Noto Sans SC', 'PingFang SC', sans-serif",
    fontSize: 12,
    color: 'rgba(45,26,16,0.65)',
  },
  title: {
    textStyle: {
      fontFamily: "'DM Sans', 'Noto Sans SC', sans-serif",
      fontWeight: 600,
      color: '#2d1a10',
    },
  },
  legend: {
    textStyle: {
      fontFamily: "'DM Sans', 'Noto Sans SC', 'PingFang SC', sans-serif",
      fontSize: 12,
      color: 'rgba(45,26,16,0.6)',
    },
  },
  axisLabel: {
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: 11,
    color: 'rgba(45,26,16,0.45)',
  },
  tooltip: {
    textStyle: {
      fontFamily: "'DM Sans', 'Noto Sans SC', sans-serif",
      fontSize: 13,
      color: '#2d1a10',
    },
  },
  categoryAxis: {
    axisLabel: {
      fontFamily: "'DM Sans', 'Noto Sans SC', sans-serif",
      fontSize: 11,
    },
  },
  valueAxis: {
    axisLabel: {
      fontFamily: "'DM Mono', monospace",
      fontSize: 11,
    },
  },
})

// 把主题名挂到 window，各组件 init 时使用
window.__ECHARTS_THEME__ = 'nail'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus, { locale: zhCn })
app.use(router)
app.mount('#app')
