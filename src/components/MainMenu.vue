<script setup lang="ts">
import { computed } from 'vue'
import { loadResult } from '../game/quiz'
import { game, openQuiz, startGame, toggleFullscreen, toggleMute, ui } from '../game/store'
import HelpOverlay from './HelpOverlay.vue'
import Icon from './Icon.vue'

const quizKind = computed(() => (loadResult('pre') ? 'post' : 'pre'))
</script>

<template>
  <div class="menu felt">
    <div class="corner">
      <button title="音效" @click="toggleMute"><Icon :name="ui.muted ? 'volume-x' : 'volume-2'" :size="28" :stroke="2" /></button>
      <button title="全螢幕" @click="toggleFullscreen"><Icon name="scan" :size="28" :stroke="2" /></button>
      <button title="玩法" @click="ui.help = true"><Icon name="circle-question-mark" :size="28" :stroke="2" /></button>
    </div>

    <header>
      <div class="logo">BREACH</div>
      <h1>駭客入侵</h1>
      <p>你是駭客。玩完，你就知道怎麼防。</p>
    </header>

    <section class="stage" @click="startGame">
      <div class="back left">
        <div class="frame">
          <Icon name="building-2" :size="86" :stroke="1.4" />
          <b>?</b>
        </div>
        <span>目標企業</span>
      </div>
      <button class="go" @click.stop="startGame">
        <Icon name="play" :size="34" :stroke="2.6" />
        出擊
      </button>
      <div class="back right">
        <div class="frame">
          <Icon name="crosshair" :size="86" :stroke="1.4" />
          <b>?</b>
        </div>
        <span>任務</span>
      </div>
    </section>

    <footer>
      <button class="chip" @click="openQuiz(quizKind)">
        <Icon name="list-checks" :size="22" :stroke="2.4" />{{ quizKind === 'pre' ? '前測' : '後測' }}
      </button>
    </footer>

    <HelpOverlay v-if="game.screen === 'menu'" />
  </div>
</template>

<style scoped>
.menu {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 70px;
  overflow: hidden;
}
.corner {
  position: absolute;
  right: 28px;
  top: 24px;
  display: flex;
  gap: 12px;
  z-index: 5;
}
.corner button {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--text2);
  background: var(--slate);
  border: 3px solid var(--edge2);
  transition: 0.15s;
}
.corner button:hover {
  color: #fff;
  border-color: var(--gold);
}

header {
  text-align: center;
}
.logo {
  font-family: var(--font-logo);
  font-weight: 900;
  font-size: 32px;
  letter-spacing: 30px;
  text-indent: 30px;
  color: var(--gold);
}
h1 {
  margin: 6px 0 0;
  font-size: 140px;
  font-weight: 900;
  letter-spacing: 28px;
  text-indent: 28px;
  line-height: 1.1;
  color: var(--paper);
  text-shadow:
    0 6px 0 #6d4f17,
    0 14px 28px rgba(0, 0, 0, 0.6);
}
header p {
  margin: 12px 0 0;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 6px;
  color: var(--text2);
}

.stage {
  display: flex;
  align-items: center;
  gap: 90px;
  cursor: pointer;
}
.back {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 6px;
  text-indent: 6px;
  color: var(--text2);
}
.frame {
  position: relative;
  width: 230px;
  height: 320px;
  border-radius: 18px;
  border: 7px solid var(--gold3);
  display: grid;
  place-items: center;
  color: var(--gold2);
  background: linear-gradient(160deg, #31507f, #1c3358);
  box-shadow:
    0 0 0 3px #3a2c10,
    0 14px 26px rgba(0, 0, 0, 0.55);
  transition: transform 0.25s cubic-bezier(0.2, 1.1, 0.3, 1);
}
.frame :deep(svg) {
  margin-top: -60px;
  opacity: 0.9;
}
.frame b {
  position: absolute;
  bottom: 34px;
  font-family: var(--font-logo);
  font-size: 76px;
  color: var(--paper);
  text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
}
.left .frame {
  transform: rotate(-6deg);
}
.right .frame {
  transform: rotate(6deg);
}
.stage:hover .left .frame {
  transform: rotate(-9deg) translateY(-10px);
}
.stage:hover .right .frame {
  transform: rotate(9deg) translateY(-10px);
}
.go {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  height: 120px;
  padding: 0 80px;
  border-radius: 20px;
  font-size: 56px;
  font-weight: 900;
  letter-spacing: 14px;
  text-indent: 14px;
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border: 4px solid var(--gold3);
  box-shadow:
    0 8px 0 #6d4f17,
    0 16px 26px rgba(0, 0, 0, 0.5);
  transition:
    transform 0.1s,
    box-shadow 0.1s,
    filter 0.15s;
}
.go:hover {
  filter: brightness(1.08);
}
.go:active {
  transform: translateY(6px);
  box-shadow:
    0 2px 0 #6d4f17,
    0 6px 12px rgba(0, 0, 0, 0.5);
}

footer {
  position: absolute;
  bottom: 40px;
  display: flex;
  gap: 12px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 24px 0 18px;
  border-radius: 10px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text2);
  background: var(--slate);
  border: 3px solid var(--edge);
  transition: 0.15s;
}
.chip:hover {
  color: #fff;
  border-color: var(--gold);
}
</style>
