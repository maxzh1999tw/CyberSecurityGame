<script setup lang="ts">
import { backToMenu, startGame, toggleFullscreen, toggleMute, ui } from '../game/store'
import Icon from './Icon.vue'

function restart() {
  ui.menuOpen = false
  startGame()
}
function home() {
  ui.menuOpen = false
  backToMenu()
}
function help() {
  ui.menuOpen = false
  ui.help = true
}
</script>

<template>
  <div class="gm">
    <button class="gear" :class="{ on: ui.menuOpen }" @click="ui.menuOpen = !ui.menuOpen">
      <Icon name="settings" :size="28" :stroke="2" />
    </button>
    <Transition name="drop">
      <div v-if="ui.menuOpen" class="menu">
        <button @click="toggleMute">
          <Icon :name="ui.muted ? 'volume-x' : 'volume-2'" :size="24" :stroke="2.2" />
          <span>音效 {{ ui.muted ? '關' : '開' }}</span>
        </button>
        <button @click="toggleFullscreen"><Icon name="scan" :size="24" :stroke="2.2" /><span>全螢幕</span></button>
        <button @click="help"><Icon name="circle-question-mark" :size="24" :stroke="2.2" /><span>玩法</span></button>
        <button @click="restart"><Icon name="rotate-ccw" :size="24" :stroke="2.2" /><span>重新開始</span></button>
        <button @click="home"><Icon name="menu" :size="24" :stroke="2.2" /><span>回主選單</span></button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.gm {
  position: relative;
}
.gear {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--text2);
  background: var(--slate);
  border: 3px solid var(--edge2);
  transition: 0.15s;
}
.gear:hover,
.gear.on {
  color: #fff;
  border-color: var(--gold);
}
.menu {
  position: absolute;
  right: 0;
  top: 66px;
  width: 232px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-radius: 14px;
  background: #151b27;
  border: 3px solid var(--edge2);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.6);
  z-index: 100;
}
.menu button {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 14px;
  border-radius: 9px;
  font-size: 20px;
  font-weight: 700;
  text-align: left;
}
.menu button:hover {
  background: #2c3d5c;
}
.drop-enter-active,
.drop-leave-active {
  transition: 0.16s;
}
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
