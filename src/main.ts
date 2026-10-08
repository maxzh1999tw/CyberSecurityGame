import { createApp } from 'vue'
import '@fontsource/noto-sans-tc/500.css'
import '@fontsource/noto-sans-tc/700.css'
import '@fontsource/noto-sans-tc/900.css'
import '@fontsource/rajdhani/latin-500.css'
import '@fontsource/rajdhani/latin-700.css'
import '@fontsource/orbitron/latin-700.css'
import '@fontsource/orbitron/latin-900.css'
import './style.css'
import App from './App.vue'
import * as store from './game/store'
import * as engine from './game/engine'

createApp(App).mount('#app')

// 開發時方便在瀏覽器主控台檢查狀態
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__csg = { ...store, engine }
}
