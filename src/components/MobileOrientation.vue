<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from './Icon.vue'

const mobile = ref(false)
const landscape = ref(false)
const dismissed = ref(false)
const attempted = ref(false)
const fullscreenReady = ref(false)
const message = ref('')

const visible = computed(() => mobile.value && !dismissed.value)
const canContinue = computed(() => landscape.value && attempted.value)

function sync() {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  mobile.value = coarse && Math.min(window.innerWidth, window.innerHeight) <= 900
  landscape.value = window.matchMedia('(orientation: landscape)').matches
  fullscreenReady.value = !!document.fullscreenElement
  if (landscape.value && attempted.value && !fullscreenReady.value) {
    message.value = '無法開啟全螢幕，可直接繼續。'
  }
}

async function enterLandscape() {
  attempted.value = true
  message.value = ''
  let fullscreenEntered = !!document.fullscreenElement

  try {
    if (!fullscreenEntered && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen()
      fullscreenEntered = !!document.fullscreenElement
    }
  } catch {
    // 部分行動瀏覽器不允許網頁進入全螢幕，改由手動橫放繼續。
  }

  try {
    const orientation = (screen as Screen & { orientation?: { lock?: (value: 'landscape') => Promise<void> } }).orientation
    if (orientation?.lock) await orientation.lock('landscape')
  } catch {
    // 瀏覽器或系統可能拒絕鎖定方向；下方會明確提示手動旋轉。
  }

  await new Promise((resolve) => window.setTimeout(resolve, 180))
  sync()
  if (landscape.value && (fullscreenEntered || fullscreenReady.value)) {
    dismissed.value = true
  } else if (!landscape.value) {
    message.value = '請將手機橫放後繼續。'
  } else {
    message.value = '無法開啟全螢幕，可直接繼續。'
  }
}

function continueInLandscape() {
  if (landscape.value) dismissed.value = true
}

onMounted(() => {
  sync()
  window.addEventListener('resize', sync)
  window.addEventListener('orientationchange', sync)
  document.addEventListener('fullscreenchange', sync)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', sync)
  window.removeEventListener('orientationchange', sync)
  document.removeEventListener('fullscreenchange', sync)
})
</script>

<template>
  <Transition name="orientation-gate">
    <div v-if="visible" class="orientation-gate" role="dialog" aria-modal="true" aria-labelledby="orientation-title">
      <section class="orientation-panel">
        <div class="phone-mark" aria-hidden="true">
          <Icon name="smartphone" :size="58" :stroke="1.6" />
          <span class="turn-arrow">↻</span>
        </div>
        <h1 id="orientation-title">{{ landscape ? '進入戰場' : '請將手機橫放' }}</h1>
        <p v-if="message" class="orientation-message" role="status">{{ message }}</p>
        <div class="orientation-actions">
          <button class="enter" @click="enterLandscape">
            <Icon name="scan" :size="24" :stroke="2.2" />
            全螢幕開始
          </button>
          <button v-if="canContinue" class="continue" @click="continueInLandscape">繼續遊戲</button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.orientation-gate {
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background:
    radial-gradient(ellipse at 50% 30%, rgba(62, 83, 118, 0.56), transparent 62%),
    rgba(6, 9, 14, 0.95);
  backdrop-filter: blur(10px);
}
.orientation-panel {
  width: min(540px, 100%);
  max-height: 100%;
  overflow: auto;
  padding: clamp(18px, 4vh, 32px) clamp(20px, 5vw, 42px);
  border-radius: 20px;
  border: 2px solid var(--gold3);
  background: linear-gradient(155deg, rgba(36, 45, 63, 0.98), rgba(18, 24, 35, 0.98));
  box-shadow: 0 22px 64px rgba(0, 0, 0, 0.65), inset 0 0 0 1px rgba(242, 217, 148, 0.15);
  text-align: center;
}
.phone-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 74px;
  height: 74px;
  margin: 0 auto 8px;
  color: var(--gold2);
}
.turn-arrow {
  position: absolute;
  right: -10px;
  bottom: -2px;
  font: 700 32px/1 var(--font-num);
  color: var(--good2);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
}
h1 {
  margin: 5px 0 8px;
  color: var(--paper);
  font-size: clamp(24px, 5vw, 34px);
  font-weight: 900;
  letter-spacing: 0.08em;
  text-shadow: 0 3px 0 #6d4f17;
}
.orientation-message {
  margin: 12px auto 0;
  padding: 8px 12px;
  border: 1px solid rgba(242, 217, 148, 0.38);
  border-radius: 10px;
  color: var(--gold2);
  background: rgba(216, 176, 90, 0.1);
  font-size: 14px;
  line-height: 1.5;
}
.orientation-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}
.orientation-actions button {
  min-height: 48px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 900;
  touch-action: manipulation;
}
.enter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border: 2px solid var(--gold3);
  box-shadow: 0 4px 0 #6d4f17;
}
.continue {
  color: var(--text2);
  background: var(--slate);
  border: 1px solid var(--edge2);
}
.orientation-gate-enter-active,
.orientation-gate-leave-active {
  transition: opacity 220ms ease;
}
.orientation-gate-enter-active .orientation-panel,
.orientation-gate-leave-active .orientation-panel {
  transition: transform 260ms cubic-bezier(0.18, 1.15, 0.35, 1);
}
.orientation-gate-enter-from,
.orientation-gate-leave-to {
  opacity: 0;
}
.orientation-gate-enter-from .orientation-panel,
.orientation-gate-leave-to .orientation-panel {
  transform: translateY(14px) scale(0.96);
}
@media (orientation: landscape) and (max-height: 430px) {
  .orientation-panel {
    width: min(760px, 100%);
    display: grid;
    grid-template-columns: 74px 1fr;
    column-gap: 18px;
    align-items: center;
    text-align: left;
    padding: 14px 22px;
  }
  .phone-mark {
    grid-row: 1 / span 3;
    margin: 0;
  }
  .orientation-message {
    margin-left: 0;
  }
  .orientation-actions {
    justify-content: flex-start;
    margin-top: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .orientation-gate-enter-active,
  .orientation-gate-leave-active,
  .orientation-gate-enter-active .orientation-panel,
  .orientation-gate-leave-active .orientation-panel {
    transition-duration: 1ms;
  }
}
</style>
