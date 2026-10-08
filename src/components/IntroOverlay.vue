<script setup lang="ts">
// 開場劇本：這是哪間公司、這次要做什麼。看完按「開始」才進遊戲。
import { computed } from 'vue'
import { MISSIONS, SCENARIOS } from '../game/data'
import { confirmIntro, game, ui } from '../game/store'
import Icon from './Icon.vue'

const m = computed(() => (game.s ? MISSIONS[game.s.mission] : null))
const sc = computed(() => (game.s ? SCENARIOS[game.s.scenario] : null))
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.intro && m && sc" class="intro">
      <div class="veil"></div>
      <div class="center">
        <div class="cards">
          <div class="card co">
            <div class="band">目標企業</div>
            <div class="medal"><Icon :name="sc.icon" :size="72" :stroke="1.5" /></div>
            <div class="name">{{ sc.company }}</div>
            <div class="chip">{{ sc.name }}・{{ sc.tagline }}</div>
            <p>{{ sc.story }}</p>
          </div>
          <div class="card mi">
            <div class="band">你的任務</div>
            <div class="medal"><Icon :name="m.icon" :size="72" :stroke="1.5" /></div>
            <div class="name">{{ m.name }}</div>
            <p>{{ m.story }}</p>
            <div class="goal"><b>目標</b>{{ m.goal }}</div>
          </div>
        </div>
        <button class="go" @click="confirmIntro">
          <Icon name="play" :size="34" :stroke="2.6" />開始
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.intro {
  position: absolute;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
}
.veil {
  position: absolute;
  inset: 0;
  background: rgba(6, 9, 14, 0.9);
}
.center {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}
.cards {
  display: flex;
  gap: 56px;
}
.card {
  --cc: #3c6aa8;
  width: 520px;
  min-height: 520px;
  padding: 0 0 32px;
  border-radius: 22px;
  border: 8px solid var(--cc);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  background: linear-gradient(180deg, #f8f1df, var(--paper2));
  box-shadow:
    0 0 0 3px var(--gold3),
    0 24px 60px rgba(0, 0, 0, 0.7);
  color: var(--ink);
  overflow: hidden;
}
.card.mi {
  --cc: var(--c-finish);
}
.co {
  animation: slide-in-left 0.6s cubic-bezier(0.2, 0.9, 0.3, 1) both;
}
.mi {
  animation: card-flip 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.1) 0.25s both;
}
.band {
  align-self: stretch;
  padding: 8px 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 10px;
  text-indent: 10px;
  color: #fff;
  background: var(--cc);
}
.medal {
  margin-top: 8px;
  width: 128px;
  height: 128px;
  display: grid;
  place-items: center;
  color: #fbf3dc;
  border-radius: 50%;
  background: #2c3d5c;
  box-shadow:
    0 0 0 6px var(--gold),
    0 6px 12px rgba(0, 0, 0, 0.4);
}
.name {
  margin-top: 6px;
  font-size: 46px;
  font-weight: 900;
  letter-spacing: 4px;
  text-indent: 4px;
}
.chip {
  padding: 3px 18px;
  border-radius: 8px;
  font-size: 21px;
  font-weight: 900;
  color: #fff;
  background: var(--cc);
}
p {
  margin: 4px 0 0;
  padding: 0 34px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.7;
  color: var(--ink);
}
.goal {
  margin: auto 28px 0;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.6;
  text-align: left;
  color: var(--ink);
  background: #fff3cf;
  border: 3px solid var(--gold);
}
.goal b {
  margin-right: 10px;
  padding: 1px 10px;
  border-radius: 6px;
  font-size: 18px;
  letter-spacing: 3px;
  color: #fff;
  background: #8a5a1c;
}
.go {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  height: 100px;
  padding: 0 90px;
  border-radius: 18px;
  font-size: 48px;
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
  animation: pop 0.5s cubic-bezier(0.2, 1.2, 0.3, 1) 0.9s both;
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
@keyframes card-flip {
  from {
    transform: perspective(1200px) rotateY(95deg) scale(0.7);
    opacity: 0;
  }
  to {
    transform: perspective(1200px) rotateY(0) scale(1);
    opacity: 1;
  }
}
@keyframes slide-in-left {
  from {
    transform: translateX(-80px);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
@keyframes pop {
  from {
    transform: scale(0.7);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
.fade-leave-active {
  transition: opacity 0.4s;
}
.fade-leave-to {
  opacity: 0;
}
</style>
