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
    <div v-if="ui.intro && m && sc" class="intro" role="dialog" aria-modal="true" aria-label="開場介紹">
      <div class="veil"></div>
      <main class="center">
        <div class="cards">
          <article class="card co">
            <div class="band">目標企業</div>
            <div class="identity">
              <div class="medal"><Icon class="mark" :name="sc.icon" :size="36" :stroke="1.7" /></div>
              <div class="identity-copy">
                <div class="name">{{ sc.company }}</div>
                <div class="chip">{{ sc.name }}・{{ sc.tagline }}</div>
              </div>
            </div>
            <p>{{ sc.story }}</p>
          </article>
          <article class="card mi">
            <div class="band">你的任務</div>
            <div class="identity">
              <div class="medal"><Icon class="mark" :name="m.icon" :size="36" :stroke="1.7" /></div>
              <div class="identity-copy">
                <div class="name">{{ m.name }}</div>
              </div>
            </div>
            <p>{{ m.story }}</p>
            <div class="goal"><b>目標</b><span>{{ m.goal }}</span></div>
          </article>
        </div>
        <button class="go" type="button" @click="confirmIntro">
          <Icon name="play" :size="34" :stroke="2.6" />開始
        </button>
      </main>
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
  background:
    radial-gradient(ellipse at 50% 38%, rgba(40, 52, 74, 0.46), transparent 68%),
    rgba(6, 9, 14, 0.92);
}
.center {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(calc(1100px / var(--stage-scale, 1)), calc(94vw / var(--stage-scale, 1)));
  height: min(calc(560px / var(--stage-scale, 1)), calc(100dvh / var(--stage-scale, 1)));
  max-height: 100%;
  min-height: 0;
  gap: calc(14px / var(--stage-scale, 1));
  padding-block: max(
    calc(12px / var(--stage-scale, 1)),
    calc(env(safe-area-inset-top, 0px) / var(--stage-scale, 1))
  ) max(
    calc(12px / var(--stage-scale, 1)),
    calc(env(safe-area-inset-bottom, 0px) / var(--stage-scale, 1))
  );
}
.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  gap: calc(16px / var(--stage-scale, 1));
}
.card {
  --cc: #3c6aa8;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 0 0 calc(16px / var(--stage-scale, 1));
  border-radius: calc(18px / var(--stage-scale, 1));
  border: calc(3px / var(--stage-scale, 1)) solid var(--cc);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(84, 77, 58, 0.45) transparent;
  background: linear-gradient(165deg, #fbf5e8 0%, #f4ecd8 62%, var(--paper2) 100%);
  box-shadow:
    0 0 0 calc(2px / var(--stage-scale, 1)) var(--gold3),
    0 calc(16px / var(--stage-scale, 1)) calc(38px / var(--stage-scale, 1)) rgba(0, 0, 0, 0.6);
  color: var(--ink);
}
.card.mi {
  --cc: var(--c-finish);
}
.co {
  animation: intro-card-left 380ms cubic-bezier(0.2, 0.8, 0.25, 1) backwards;
}
.mi {
  animation: intro-card-right 420ms cubic-bezier(0.2, 0.8, 0.25, 1) 70ms backwards;
}
.band {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  min-height: calc(36px / var(--stage-scale, 1));
  padding: calc(6px / var(--stage-scale, 1)) calc(18px / var(--stage-scale, 1));
  font-size: calc(14px / var(--stage-scale, 1));
  font-weight: 900;
  letter-spacing: calc(2px / var(--stage-scale, 1));
  color: #fff;
  background: var(--cc);
  box-shadow: inset 0 -1px rgba(255, 255, 255, 0.18);
}
.identity {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: calc(14px / var(--stage-scale, 1));
  padding: calc(16px / var(--stage-scale, 1)) calc(22px / var(--stage-scale, 1)) 0;
}
.medal {
  box-sizing: border-box;
  flex: 0 0 auto;
  width: calc(72px / var(--stage-scale, 1));
  height: calc(72px / var(--stage-scale, 1));
  display: grid;
  place-items: center;
  color: #fbf3dc;
  border-radius: 50%;
  background: #2c3d5c;
  border: calc(2px / var(--stage-scale, 1)) solid var(--gold);
  box-shadow: 0 calc(4px / var(--stage-scale, 1)) calc(10px / var(--stage-scale, 1)) rgba(0, 0, 0, 0.32);
}
.medal :deep(.mark) {
  width: calc(34px / var(--stage-scale, 1));
  height: calc(34px / var(--stage-scale, 1));
}
.identity-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  gap: calc(7px / var(--stage-scale, 1));
}
.name {
  max-width: 100%;
  font-size: calc(30px / var(--stage-scale, 1));
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: calc(1px / var(--stage-scale, 1));
  overflow-wrap: anywhere;
}
.chip {
  max-width: 100%;
  padding: calc(4px / var(--stage-scale, 1)) calc(10px / var(--stage-scale, 1));
  border-radius: 999px;
  font-size: calc(14px / var(--stage-scale, 1));
  font-weight: 800;
  line-height: 1.4;
  color: #fff;
  background: var(--cc);
  overflow-wrap: anywhere;
}
p {
  flex: 0 0 auto;
  margin: calc(14px / var(--stage-scale, 1)) calc(22px / var(--stage-scale, 1)) 0;
  font-size: calc(20px / var(--stage-scale, 1));
  font-weight: 650;
  line-height: 1.58;
  text-align: left;
  color: var(--ink);
}
.co p {
  margin-top: calc(14px / var(--stage-scale, 1));
  margin-bottom: 0;
}
.goal {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: calc(9px / var(--stage-scale, 1));
  margin: auto calc(18px / var(--stage-scale, 1)) 0;
  padding: calc(12px / var(--stage-scale, 1)) calc(14px / var(--stage-scale, 1));
  border-radius: calc(12px / var(--stage-scale, 1));
  font-size: calc(19px / var(--stage-scale, 1));
  font-weight: 700;
  line-height: 1.55;
  color: var(--ink);
  background: linear-gradient(135deg, #fff7e1, #f9edca);
  border: calc(2px / var(--stage-scale, 1)) solid var(--gold);
  box-shadow: inset calc(4px / var(--stage-scale, 1)) 0 0 rgba(143, 106, 38, 0.18);
}
.goal b {
  padding: calc(3px / var(--stage-scale, 1)) calc(8px / var(--stage-scale, 1));
  border-radius: calc(6px / var(--stage-scale, 1));
  font-size: calc(12px / var(--stage-scale, 1));
  font-weight: 900;
  letter-spacing: calc(1px / var(--stage-scale, 1));
  color: #fff;
  background: #8a5a1c;
}
.go {
  box-sizing: border-box;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: calc(10px / var(--stage-scale, 1));
  min-width: calc(176px / var(--stage-scale, 1));
  min-height: calc(60px / var(--stage-scale, 1));
  padding: 0 calc(32px / var(--stage-scale, 1));
  border-radius: calc(14px / var(--stage-scale, 1));
  font-size: calc(26px / var(--stage-scale, 1));
  font-weight: 900;
  letter-spacing: calc(3px / var(--stage-scale, 1));
  text-indent: calc(3px / var(--stage-scale, 1));
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border: calc(2px / var(--stage-scale, 1)) solid var(--gold3);
  box-shadow:
    0 calc(4px / var(--stage-scale, 1)) 0 #6d4f17,
    0 calc(9px / var(--stage-scale, 1)) calc(18px / var(--stage-scale, 1)) rgba(0, 0, 0, 0.42);
  transition: transform 140ms ease, box-shadow 140ms ease, filter 160ms ease;
  animation: intro-button-in 340ms cubic-bezier(0.2, 0.9, 0.3, 1) 140ms backwards;
}
.go:hover {
  filter: brightness(1.08);
}
.go:focus-visible {
  outline: calc(3px / var(--stage-scale, 1)) solid #fff8df;
  outline-offset: calc(4px / var(--stage-scale, 1));
}
.go:active {
  transform: translateY(calc(3px / var(--stage-scale, 1)));
  box-shadow:
    0 calc(1px / var(--stage-scale, 1)) 0 #6d4f17,
    0 calc(3px / var(--stage-scale, 1)) calc(8px / var(--stage-scale, 1)) rgba(0, 0, 0, 0.4);
}
@keyframes intro-card-left {
  from {
    transform: translateX(calc(-24px / var(--stage-scale, 1)));
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
@keyframes intro-card-right {
  from {
    transform: translateY(calc(12px / var(--stage-scale, 1)));
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
@keyframes intro-button-in {
  from {
    transform: translateY(calc(8px / var(--stage-scale, 1)));
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
.fade-leave-active {
  transition: opacity 240ms ease;
}
.fade-leave-to {
  opacity: 0;
}
@media (orientation: landscape) and (max-height: 430px) {
  .center {
    width: min(2040px, calc(94vw / var(--stage-scale, 1)));
    gap: calc(9px / var(--stage-scale, 1));
    padding-block: max(
      calc(6px / var(--stage-scale, 1)),
      calc(env(safe-area-inset-top, 0px) / var(--stage-scale, 1))
    ) max(
      calc(6px / var(--stage-scale, 1)),
      calc(env(safe-area-inset-bottom, 0px) / var(--stage-scale, 1))
    );
  }
  .cards {
    gap: calc(10px / var(--stage-scale, 1));
  }
  .card {
    padding-bottom: calc(10px / var(--stage-scale, 1));
  }
  .band {
    min-height: calc(30px / var(--stage-scale, 1));
    padding-inline: calc(14px / var(--stage-scale, 1));
    font-size: calc(13px / var(--stage-scale, 1));
  }
  .identity {
    gap: calc(10px / var(--stage-scale, 1));
    padding: calc(8px / var(--stage-scale, 1)) calc(14px / var(--stage-scale, 1)) 0;
  }
  .medal {
    width: calc(54px / var(--stage-scale, 1));
    height: calc(54px / var(--stage-scale, 1));
  }
  .medal :deep(.mark) {
    width: calc(28px / var(--stage-scale, 1));
    height: calc(28px / var(--stage-scale, 1));
  }
  .identity-copy {
    gap: calc(5px / var(--stage-scale, 1));
  }
  .name {
    font-size: calc(20px / var(--stage-scale, 1));
  }
  .chip {
    padding-block: calc(3px / var(--stage-scale, 1));
    font-size: calc(11px / var(--stage-scale, 1));
  }
  p {
    margin: calc(9px / var(--stage-scale, 1)) calc(14px / var(--stage-scale, 1)) 0;
    font-size: calc(15px / var(--stage-scale, 1));
    line-height: 1.5;
  }
  .co p {
    margin-block: auto;
  }
  .goal {
    gap: calc(7px / var(--stage-scale, 1));
    margin-inline: calc(12px / var(--stage-scale, 1));
    padding: calc(8px / var(--stage-scale, 1)) calc(10px / var(--stage-scale, 1));
    font-size: calc(14px / var(--stage-scale, 1));
    line-height: 1.45;
  }
  .goal b {
    font-size: calc(11px / var(--stage-scale, 1));
  }
  .go {
    min-width: calc(156px / var(--stage-scale, 1));
    min-height: calc(54px / var(--stage-scale, 1));
    padding-inline: calc(24px / var(--stage-scale, 1));
    font-size: calc(23px / var(--stage-scale, 1));
  }
  .go :deep(svg) {
    width: calc(22px / var(--stage-scale, 1));
    height: calc(22px / var(--stage-scale, 1));
  }
}
@media (prefers-reduced-motion: reduce) {
  .co,
  .mi,
  .go {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .go,
  .fade-leave-active {
    transition: none;
  }
}
</style>
