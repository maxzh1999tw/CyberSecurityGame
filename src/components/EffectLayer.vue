<script setup lang="ts">
// 浮動數字、橫幅、提示
import { ui, view } from '../game/store'
import type { Beam } from '../game/store'
import Icon from './Icon.vue'

/** 封包走的弧線（往上拱一點） */
function beamPath(b: Beam): string {
  const mx = (b.x1 + b.x2) / 2
  const my = Math.min(b.y1, b.y2) - 60
  return `M ${b.x1} ${b.y1} Q ${mx} ${my} ${b.x2} ${b.y2}`
}
</script>

<template>
  <div class="layer">
    <div
      v-for="f in ui.floaters"
      :key="f.id"
      class="float"
      :class="f.tone"
      :style="{ left: f.x + 'px', top: f.y + 'px' }"
    >
      <Icon v-if="f.icon" :name="f.icon" :size="28" :stroke="2.4" />
      <span>{{ f.text }}</span>
    </div>

    <!-- 病毒封包：從基礎設施飛向被翻開的弱點，後面拖著尾巴 -->
    <template v-for="b in ui.beams" :key="b.id">
      <svg class="wire" :viewBox="`0 0 ${view.w} ${view.h}`" :width="view.w" :height="view.h">
        <path :d="beamPath(b)" class="wire-line" pathLength="1" />
      </svg>
      <i
        v-for="k in 5"
        :key="k"
        class="packet"
        :style="{ offsetPath: `path('${beamPath(b)}')`, animationDelay: (k - 1) * 45 + 'ms', '--k': k }"
      ></i>
    </template>

    <div
      v-for="p in ui.plaques"
      :key="p.id"
      class="plaque"
      :class="[p.tone, p.style]"
      :style="{ left: p.x + 'px', top: p.y + 'px', animationDuration: p.ms + 'ms' }"
    >
      <div class="medal"><Icon :name="p.icon" :size="34" :stroke="2.3" /></div>
      <div class="pt">
        <b>{{ p.title }}</b>
        <small v-if="p.sub">{{ p.sub }}</small>
      </div>
      <svg v-if="p.style === 'stamp' && p.tone === 'bad'" class="crack" viewBox="0 0 120 60" preserveAspectRatio="none">
        <path d="M60 0 L54 14 L66 22 L52 34 L63 44 L57 60" pathLength="1" />
      </svg>
    </div>

    <Transition name="banner">
      <div v-if="ui.banner" :key="ui.banner.id" class="banner" :class="ui.banner.tone">
        <div class="bar">
          <b>{{ ui.banner.text }}</b>
          <small v-if="ui.banner.sub">{{ ui.banner.sub }}</small>
        </div>
      </div>
    </Transition>

    <Transition name="toast">
      <div v-if="ui.toast" :key="ui.toast.id" class="toast">{{ ui.toast.text }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 70;
}
.float {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 18px 5px 14px;
  border-radius: 10px;
  font-size: 28px;
  font-weight: 900;
  white-space: nowrap;
  transform: translate(-50%, 0);
  animation: float-up 1.4s ease-out forwards;
  color: #fff;
  background: #1a2231;
  border: 3px solid var(--fc);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.55);
  --fc: #9cc4f2;
}
.float.good {
  --fc: var(--good2);
  background: #1d5a40;
}
.float.bad {
  --fc: #ff9a8c;
  background: #6a2a22;
}
.float.info {
  --fc: #9cc4f2;
  background: #24385a;
}
.float.gold {
  --fc: var(--gold2);
  background: #5a4416;
}
.float.noise {
  --fc: #ffb48a;
  background: #6a3a1e;
  font-family: var(--font-num);
  font-size: 36px;
}

/* ───────── 結果銘牌：一個事件一塊（金邊切角牌 + 圓章 + 標題與說明） ───────── */
.plaque {
  --pc: #7fa6d8;
  --pd: #1a2638;
  --pl: #dbeaff;
  position: absolute;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-width: 270px;
  max-width: 440px;
  padding: 12px 34px 12px 68px;
  transform: translate(-50%, -50%);
  animation: plaque-in 2s ease-out forwards;
  filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.6));
  --chamfer: polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px));
}
.plaque::before,
.plaque::after {
  content: '';
  position: absolute;
  z-index: -1;
  clip-path: var(--chamfer);
}
.plaque::before {
  inset: 0;
  background: linear-gradient(180deg, var(--gold2), var(--gold3));
}
.plaque::after {
  inset: 3px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--pc) 30%, var(--pd)), var(--pd) 80%);
}
.medal {
  position: absolute;
  left: -24px;
  top: 50%;
  width: 70px;
  height: 70px;
  margin-top: -35px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--pc) 55%, #fff), var(--pc) 55%, color-mix(in srgb, var(--pc) 60%, #000));
  border: 5px solid var(--gold2);
  box-shadow:
    0 0 0 3px var(--gold3),
    0 6px 12px rgba(0, 0, 0, 0.5),
    inset 0 -8px 12px rgba(0, 0, 0, 0.25);
}
.medal :deep(svg) {
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35));
}
.pt {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.pt b {
  font-size: 36px;
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: 6px;
  color: #fff;
  -webkit-text-stroke: 6px #0c121c;
  paint-order: stroke fill;
  text-shadow: 0 0 18px color-mix(in srgb, var(--pc) 70%, transparent);
  white-space: nowrap;
}
.pt small {
  margin-top: 4px;
  padding-top: 5px;
  border-top: 2px solid color-mix(in srgb, var(--pl) 40%, transparent);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1.3;
  color: var(--pl);
}
.plaque.good {
  --pc: #3fae7c;
  --pd: #11332a;
  --pl: #c6f5de;
}
.plaque.bad {
  --pc: #d4503f;
  --pd: #3a1511;
  --pl: #ffd0c8;
}
.plaque.ice {
  --pc: #5ea6dc;
  --pd: #14304a;
  --pl: #d6efff;
}
.plaque.gold {
  --pc: #d8b05a;
  --pd: #3a2c10;
  --pl: #fff0c4;
}
.plaque.virus {
  --pc: #5fcf62;
  --pd: #10301a;
  --pl: #d6ffd0;
}
.plaque.stamp {
  animation-name: stamp-in;
}
.plaque.stamp .medal {
  animation: medal-pop 0.5s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}
@keyframes plaque-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -28%) scale(0.7);
  }
  9% {
    opacity: 1;
    transform: translate(-50%, -52%) scale(1.07);
  }
  15% {
    transform: translate(-50%, -50%) scale(1);
  }
  80% {
    opacity: 1;
    transform: translate(-50%, -56%);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -76%);
  }
}
@keyframes stamp-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(2.5) rotate(-9deg);
  }
  8% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.92) rotate(-3deg);
  }
  12% {
    transform: translate(-48%, -51%) scale(1.04) rotate(-2deg);
  }
  16% {
    transform: translate(-50%, -50%) scale(1) rotate(-2deg);
  }
  80% {
    opacity: 1;
    transform: translate(-50%, -55%) rotate(-2deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -76%) rotate(-2deg);
  }
}
@keyframes medal-pop {
  0% {
    transform: scale(0) rotate(-120deg);
  }
  100% {
    transform: none;
  }
}
/* 失敗時牌子上裂開的紋路 */
.crack {
  position: absolute;
  inset: 3px;
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  pointer-events: none;
  opacity: 0.85;
}
.crack path {
  fill: none;
  stroke: #080b11;
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
  stroke-linejoin: bevel;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: crack-draw 0.22s 0.16s ease-out forwards;
}
@keyframes crack-draw {
  to {
    stroke-dashoffset: 0;
  }
}

/* ───────── 病毒封包 ───────── */
.wire {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  overflow: visible;
}
.wire-line {
  fill: none;
  stroke: #7ee06a;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0.8;
  filter: drop-shadow(0 0 6px #7ee06a);
  animation:
    wire-draw 0.5s ease-out forwards,
    wire-fade 0.4s 0.55s ease-in forwards;
}
@keyframes wire-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes wire-fade {
  to {
    opacity: 0;
  }
}
.packet {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(34px - var(--k) * 4px);
  height: calc(34px - var(--k) * 4px);
  margin: calc(var(--k) * 2px - 17px) 0 0 calc(var(--k) * 2px - 17px);
  border-radius: 50%;
  background: radial-gradient(circle, #f0ffe8 0%, #7ee06a 55%, rgba(126, 224, 106, 0) 75%);
  box-shadow: 0 0 16px #7ee06a;
  offset-rotate: 0deg;
  offset-distance: 0%;
  opacity: 0;
  animation: packet-fly 0.55s cubic-bezier(0.4, 0, 0.25, 1) both;
}
@keyframes packet-fly {
  0% {
    offset-distance: 0%;
    opacity: 0;
  }
  10% {
    opacity: calc(1 - var(--k) * 0.14);
  }
  100% {
    offset-distance: 100%;
    opacity: calc(0.9 - var(--k) * 0.14);
  }
}

.banner {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  margin-top: -80px;
  height: 160px;
  display: grid;
  place-items: center;
}
.bar {
  width: 100%;
  height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--bc);
  border-top: 4px solid var(--gold);
  border-bottom: 4px solid var(--gold);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
}
.bar b {
  font-size: 76px;
  font-weight: 900;
  letter-spacing: 18px;
  text-indent: 18px;
  color: #fff;
  text-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
  line-height: 1.1;
}
.bar small {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.95);
}
.banner.company {
  --bc: #264a82;
}
.banner.hacker {
  --bc: #1f6e4d;
}
.banner.danger {
  --bc: #8e2a20;
}
.banner-enter-active {
  animation: banner-in 0.32s cubic-bezier(0.2, 1, 0.3, 1);
}
.banner-leave-active {
  animation: banner-in 0.25s reverse ease-in;
}
@keyframes banner-in {
  from {
    opacity: 0;
    transform: scaleY(0.3);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.toast {
  position: absolute;
  left: 50%;
  bottom: 340px;
  transform: translateX(-50%);
  padding: 10px 30px;
  border-radius: 12px;
  font-size: 24px;
  font-weight: 900;
  color: #fff;
  background: #7a2a22;
  border: 3px solid #ff9a8c;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.55);
}
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.25s,
    transform 0.25s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 14px);
}
</style>
