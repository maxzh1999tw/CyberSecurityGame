<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import GameScreen from './components/GameScreen.vue'
import MainMenu from './components/MainMenu.vue'
import QuizScreen from './components/QuizScreen.vue'
import ReviewScreen from './components/ReviewScreen.vue'
import { fitStage, game, view } from './game/store'

// 舞台高度固定 1080，寬度跟著視窗延伸，整個畫面都用得到
function fit() {
  fitStage(window.innerWidth, window.innerHeight)
}
onMounted(() => {
  fit()
  window.addEventListener('resize', fit)
})
onBeforeUnmount(() => window.removeEventListener('resize', fit))
</script>

<template>
  <div
    class="csg-stage"
    :style="{
      width: view.w + 'px',
      height: view.h + 'px',
      transform: `translate(${view.left}px, ${view.top}px) scale(${view.scale})`,
    }"
    @contextmenu.prevent
  >
    <MainMenu v-if="game.screen === 'menu'" />
    <GameScreen v-else-if="game.screen === 'game'" />
    <QuizScreen v-else-if="game.screen === 'quiz'" />
    <ReviewScreen v-else />
  </div>
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
