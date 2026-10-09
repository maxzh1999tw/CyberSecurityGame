<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import GameScreen from './components/GameScreen.vue'
import MainMenu from './components/MainMenu.vue'
import QuizScreen from './components/QuizScreen.vue'
import ReviewScreen from './components/ReviewScreen.vue'
import MobileOrientation from './components/MobileOrientation.vue'
import { fitStage, game, view } from './game/store'

// 使用可見的 CSS viewport。行動裝置模擬或瀏覽器工具列可能令
// window.innerWidth 大於實際 viewport，不能讓未縮放舞台反過來撐大頁面。
function readViewport() {
  const visual = window.visualViewport
  const width = visual?.width || document.documentElement.clientWidth || window.innerWidth
  const height = visual?.height || document.documentElement.clientHeight || window.innerHeight
  return { width, height }
}

function fit() {
  const { width, height } = readViewport()
  fitStage(width, height)
}
onMounted(() => {
  fit()
  window.addEventListener('resize', fit)
  window.addEventListener('orientationchange', fit)
  window.visualViewport?.addEventListener('resize', fit)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', fit)
  window.removeEventListener('orientationchange', fit)
  window.visualViewport?.removeEventListener('resize', fit)
})
</script>

<template>
  <div
    class="csg-stage"
    :style="{
      width: view.w + 'px',
      height: view.h + 'px',
      '--stage-scale': String(view.scale),
      transform: `translate(${view.left}px, ${view.top}px) scale(${view.scale})`,
    }"
    @contextmenu.prevent
  >
    <MainMenu v-if="game.screen === 'menu'" />
    <GameScreen v-else-if="game.screen === 'game'" />
    <QuizScreen v-else-if="game.screen === 'quiz'" />
    <ReviewScreen v-else />
  </div>
  <MobileOrientation />
</template>

<style>
.csg-stage {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  overflow: hidden;
  background: var(--table0);
}
</style>
