<script setup lang="ts">
// 主選單：直接選兩種遊戲模式（駭客模式／公司模式）
import { computed } from 'vue'
import { loadResult } from '../game/quiz'
import { startCompanyMode } from '../game/companyStore'
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
      <p>攻與守都能玩。玩完，你就知道怎麼防。</p>
    </header>

    <section class="modes">
      <!-- 駭客模式：陰暗、隱密 -->
      <button class="mode hacker" @click="startGame">
        <div class="pic">
          <Icon name="skull" :size="78" :stroke="1.5" />
          <span class="q q1">?</span><span class="q q2">?</span>
        </div>
        <div class="txt">
          <small>單人・扮演駭客</small>
          <b>駭客模式</b>
          <p>偵查弱點、入侵企業、完成任務。目標企業與任務每局隨機抽。</p>
        </div>
        <span class="cta"><Icon name="play" :size="26" :stroke="2.6" />出擊</span>
      </button>

      <!-- 公司模式：明亮、專業 -->
      <button class="mode office" @click="startCompanyMode">
        <div class="pic">
          <Icon name="building-2" :size="78" :stroke="1.5" />
          <span class="chart"><i></i><i></i><i></i></span>
        </div>
        <div class="txt">
          <small>單人・經營公司</small>
          <b>公司模式</b>
          <p>招募人才與設備、顧好營收，擋下電腦駭客的攻擊。</p>
        </div>
        <span class="cta"><Icon name="briefcase-business" :size="26" :stroke="2.4" />開業</span>
      </button>
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
  gap: 60px;
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
  font-size: 128px;
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
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 6px;
  color: var(--text2);
}

.modes {
  display: flex;
  gap: 48px;
}
.mode {
  position: relative;
  width: 560px;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 28px 32px 30px;
  border-radius: 24px;
  text-align: left;
  overflow: hidden;
  transition:
    transform 0.2s cubic-bezier(0.2, 1.2, 0.35, 1),
    box-shadow 0.2s;
}
.mode:hover {
  transform: translateY(-8px);
}
.pic {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 28px;
  display: grid;
  place-items: center;
}
.txt {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.txt small {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 3px;
}
.txt b {
  font-size: 46px;
  font-weight: 900;
  letter-spacing: 8px;
}
.txt p {
  margin: 4px 0 0;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.55;
}
.cta {
  align-self: flex-end;
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 64px;
  padding: 0 30px;
  border-radius: 16px;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 6px;
}

/* 駭客模式：深色、金邊、隱密 */
.mode.hacker {
  color: var(--paper);
  background:
    radial-gradient(ellipse 70% 60% at 20% 20%, rgba(134, 226, 182, 0.12), transparent 70%),
    linear-gradient(160deg, #1d2a40, #0e1522);
  border: 4px solid var(--gold3);
  box-shadow:
    0 0 0 2px #3a2c10,
    0 18px 34px rgba(0, 0, 0, 0.6);
}
.mode.hacker:hover {
  box-shadow:
    0 0 0 2px var(--gold),
    0 0 30px rgba(134, 226, 182, 0.18),
    0 24px 40px rgba(0, 0, 0, 0.65);
}
.mode.hacker .pic {
  color: #86e2b6;
  background: #0a0f18;
  border: 3px solid #2d3a52;
  box-shadow: inset 0 0 24px rgba(134, 226, 182, 0.15);
}
.mode.hacker .q {
  position: absolute;
  font-family: var(--font-logo);
  font-size: 28px;
  font-weight: 900;
  color: var(--gold2);
}
.q1 {
  right: -6px;
  top: -8px;
}
.q2 {
  left: -6px;
  bottom: -10px;
}
.mode.hacker small {
  color: #86e2b6;
}
.mode.hacker p {
  color: var(--text2);
}
.mode.hacker .cta {
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border: 3px solid var(--gold3);
  box-shadow: 0 5px 0 #6d4f17;
}

/* 公司模式：明亮的辦公室、藍色主色 */
.mode.office {
  color: #1d3557;
  background:
    radial-gradient(ellipse 80% 60% at 80% 0%, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0) 70%),
    linear-gradient(rgba(29, 53, 87, 0.05) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(90deg, rgba(29, 53, 87, 0.05) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(170deg, #f8fbff, #e4ecf6);
  border: 4px solid #b3c6e3;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.4),
    0 18px 34px rgba(0, 0, 0, 0.45);
}
.mode.office:hover {
  box-shadow:
    0 0 0 2px #fff,
    0 0 30px rgba(120, 170, 255, 0.35),
    0 24px 40px rgba(0, 0, 0, 0.5);
}
.mode.office .pic {
  color: #2563c9;
  background: #fff;
  border: 3px solid #cfdcef;
  box-shadow: 0 6px 16px rgba(30, 60, 120, 0.15);
}
.chart {
  position: absolute;
  right: -12px;
  bottom: -8px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 10px rgba(30, 60, 120, 0.2);
}
.chart i {
  width: 8px;
  border-radius: 2px;
  background: #2fb36f;
}
.chart i:nth-child(1) {
  height: 12px;
}
.chart i:nth-child(2) {
  height: 20px;
}
.chart i:nth-child(3) {
  height: 28px;
}
.mode.office small {
  color: #2563c9;
}
.mode.office p {
  color: #4a5a72;
}
.mode.office .cta {
  color: #fff;
  background: linear-gradient(180deg, #3b7be0, #2563c9);
  border: 3px solid #1b4ea3;
  box-shadow: 0 5px 0 #173f85;
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

@media (pointer: coarse) and (orientation: landscape) and (max-width: 1000px) {
  .menu {
    gap: 32px;
    padding: max(12px, calc(env(safe-area-inset-top, 0px) / var(--stage-scale)))
      max(18px, calc(env(safe-area-inset-right, 0px) / var(--stage-scale)))
      max(20px, calc(env(safe-area-inset-bottom, 0px) / var(--stage-scale)))
      max(18px, calc(env(safe-area-inset-left, 0px) / var(--stage-scale)));
  }
  .corner {
    top: max(12px, calc(env(safe-area-inset-top, 0px) / var(--stage-scale)));
    right: max(18px, calc(env(safe-area-inset-right, 0px) / var(--stage-scale)));
    gap: 8px;
  }
  .corner button {
    width: 128px;
    height: 128px;
  }
  .corner button :deep(svg) {
    width: 44px;
    height: 44px;
  }
  footer {
    bottom: max(20px, calc(env(safe-area-inset-bottom, 0px) / var(--stage-scale)));
  }
  .chip {
    min-height: 120px;
    height: auto;
  }
}

@media (pointer: coarse) and (orientation: landscape) and (max-width: 1000px) and (max-height: 430px) {
  .menu {
    gap: 20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .mode {
    transition: none;
  }
}
</style>
