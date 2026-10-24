<script setup lang="ts">
// 下方：駭客頭像、行動點（左）／牌堆、結束回合（右）
import { computed, nextTick, ref, watch } from 'vue'
import { RECYCLE_COST, canEndTurn as engineCanEndTurn, canRecycle, freePlaysLeft, isMissionCard } from '../game/engine'
import { boardCenter, endTurn, game, nodeRect, playerHasMoves, registerAnchor, ui, view } from '../game/store'
import type { CardId } from '../game/types'
import Icon from './Icon.vue'

const s = computed(() => game.s!)
// 行動點總數：基本 + 員工加成 + 上回合保留的，或是這回合臨時多拿的
const total = computed(() => Math.max(s.value.apBase + s.value.apBonus + s.value.apCarry, s.value.ap))
const activeTurn = computed(() => !ui.busy && s.value.phase === 'hacker')
const canEndState = computed(() => engineCanEndTurn(s.value))
const canEnd = computed(() => activeTurn.value && canEndState.value)
const firstTurnLocked = computed(() => activeTurn.value && !canEndState.value)
// 手牌全部打不出去：有行動點就提示「換牌」，沒有才提示「結束回合」
const noMoves = computed(() => activeTurn.value && !playerHasMoves(s.value))
const nudgeRecycle = computed(() => noMoves.value && canRecycle(s.value))
const suggest = computed(() => canEnd.value && noMoves.value && !nudgeRecycle.value)
const dragging = computed(() => !!ui.drag && ui.drag.moved)
const protectedCard = computed(() => !!ui.drag && isMissionCard(s.value, ui.drag.id as CardId))
const recyclable = computed(() => dragging.value && !protectedCard.value && canRecycle(s.value))
const overPile = computed(() => dragging.value && !!ui.drag?.overPile)
const canRecycleNow = computed(() => activeTurn.value && canRecycle(s.value))
// 牌庫的位置也是這裡：抽牌、暗網情報都從換牌區飛出來
function pileRef(el: unknown) {
  registerAnchor('pile', el as HTMLElement | null)
  registerAnchor('deck', el as HTMLElement | null)
}

// 駭客的眼睛會瞄向你正在拖的牌、滑過的手牌或節點
const look = computed(() => {
  const ox = 86
  const oy = view.h - 86
  let tx: number | null = null
  let ty = 0
  if (ui.drag?.moved) {
    tx = ui.drag.x
    ty = ui.drag.y
  } else if (ui.hoverNode) {
    const r = nodeRect(ui.hoverNode)
    if (r) {
      tx = r.cx
      ty = r.cy
    }
  } else if (ui.hoverCard !== null) {
    tx = boardCenter()
    ty = view.h - 220
  }
  if (tx === null) return 'translate(0px, 0px)'
  const dx = tx - ox
  const dy = ty - oy
  const len = Math.hypot(dx, dy) || 1
  return `translate(${((dx / len) * 4).toFixed(2)}px, ${((dy / len) * 2.5).toFixed(2)}px)`
})

const shaking = ref(false)
watch(
  () => ui.apShake,
  async () => {
    shaking.value = false
    await nextTick()
    shaking.value = true
    setTimeout(() => (shaking.value = false), 500)
  },
)
</script>

<template>
  <div class="hud">
    <!-- 左下：駭客與行動點 -->
    <div class="hacker">
      <div class="portrait">
        <svg viewBox="0 0 120 120">
          <rect width="120" height="120" fill="#1a2536" />
          <circle cx="60" cy="58" r="46" fill="#243350" />
          <path d="M6 124 C6 94 28 82 60 82 C92 82 114 94 114 124 Z" fill="#10151f" />
          <path d="M60 12 C36 12 26 38 26 60 C26 76 36 86 46 90 L74 90 C84 86 94 76 94 60 C94 38 84 12 60 12 Z" fill="#171f30" stroke="#3d4f72" stroke-width="2" />
          <path d="M60 28 C44 28 38 44 38 60 C38 74 48 84 60 84 C72 84 82 74 82 60 C82 44 76 28 60 28 Z" fill="#06090f" />
          <g class="h-eyes" :style="{ transform: look }">
            <rect class="h-eye" x="44" y="52" width="12" height="6" rx="3" fill="#86e2b6" />
            <rect class="h-eye" x="64" y="52" width="12" height="6" rx="3" fill="#86e2b6" />
          </g>
          <path d="M50 71 Q60 76 70 71" fill="none" stroke="#86e2b6" stroke-width="2.4" stroke-linecap="round" opacity="0.8" />
        </svg>
      </div>
      <div :ref="(el) => registerAnchor('ap', el as HTMLElement | null)" class="ap" :class="{ shaking }">
        <div class="count"><Icon name="zap" :size="26" :stroke="2.6" /><b>{{ s.ap }}</b><small>/{{ total }}</small></div>
        <div class="gems">
          <i
            v-for="i in total"
            :key="i"
            class="gem"
            :class="{ full: i <= s.ap, bonus: i > s.apBase && i <= s.apBase + s.apBonus }"
          ></i>
        </div>
      </div>
      <div v-if="freePlaysLeft(s)" class="free"><Icon name="sparkles" :size="17" :stroke="2.4" />本回合 {{ freePlaysLeft(s) }} 張免費</div>
    </div>

    <!-- 右下：換牌區與結束回合 -->
    <div class="turn">
      <!-- 換牌區：牌庫也在這裡，抽到的牌從這裡飛出來 -->
      <div
        :ref="pileRef"
        class="pile"
        :class="{ ready: recyclable || (nudgeRecycle && !dragging), over: overPile, off: (dragging && !recyclable) || (!dragging && !canRecycleNow) }"
      >
        <Icon :name="protectedCard ? 'lock' : 'recycle'" :size="44" :stroke="2" class="pile-ico" />
        <div class="pile-txt">
          <b>{{ protectedCard ? '任務牌' : '換牌' }}</b>
          <span v-if="protectedCard">不能換掉</span>
          <span v-else>拖手牌到這裡・<Icon name="zap" :size="15" :stroke="2.8" />{{ RECYCLE_COST }}</span>
        </div>
      </div>
      <button
        :ref="(el) => registerAnchor('end', el as HTMLElement | null)"
        class="end"
        :class="{ suggest, off: !canEnd }"
        :disabled="!canEnd"
        :title="firstTurnLocked ? '首回合請先出牌或換牌' : undefined"
        :aria-label="firstTurnLocked ? '首回合請先出牌或換牌' : undefined"
        @click="endTurn"
      >
        結束回合
      </button>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 15;
}
.hud > * {
  pointer-events: auto;
}
.hacker {
  position: absolute;
  left: 22px;
  bottom: 22px;
  width: 320px;
  height: 150px;
  pointer-events: none;
}
.portrait {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  overflow: hidden;
  border: 5px solid var(--gold);
  box-shadow:
    0 0 0 3px var(--gold3),
    0 8px 16px rgba(0, 0, 0, 0.55);
  background: #1a2536;
}
.portrait svg {
  width: 100%;
  height: 100%;
}
.h-eyes {
  transition: transform 0.35s cubic-bezier(0.3, 1.3, 0.5, 1);
}
.h-eye {
  transform-box: fill-box;
  transform-origin: center;
  filter: drop-shadow(0 0 3px rgba(134, 226, 182, 0.8));
  animation: h-blink 6.3s infinite;
}
@keyframes h-blink {
  0%,
  93%,
  96%,
  100% {
    transform: scaleY(1);
  }
  94.5% {
    transform: scaleY(0.15);
  }
}
@media (prefers-reduced-motion: reduce) {
  .h-eyes {
    transition: none;
  }
  .h-eye {
    animation: none;
  }
}
.ap {
  position: absolute;
  left: 144px;
  bottom: 4px;
  width: 176px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ap.shaking {
  animation: shake 0.5s;
}
.count {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-family: var(--font-num);
  color: #bfdcff;
}
.count :deep(svg) {
  align-self: center;
  margin-right: 2px;
  color: #6fb2ff;
}
.count b {
  font-size: 52px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
}
.count small {
  font-size: 26px;
  color: var(--text3);
}
.gems {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.gem {
  width: 24px;
  height: 28px;
  clip-path: polygon(50% 0, 100% 24%, 100% 76%, 50% 100%, 0 76%, 0 24%);
  background: #1b2434;
  transition: 0.25s;
}
.gem.full {
  background: linear-gradient(160deg, #7cc0ff, #2a63c8);
}
.gem.bonus.full {
  background: linear-gradient(160deg, #ffe9a0, #d9962a);
}
.free {
  position: absolute;
  left: 0;
  bottom: 138px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px 4px 10px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 900;
  color: #fff;
  background: var(--good);
  border: 2px solid var(--good2);
}

.turn {
  position: absolute;
  right: 20px;
  bottom: 22px;
  width: 240px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 26px;
}
.pile {
  position: relative;
  height: 112px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  border-radius: 14px;
  color: var(--text2);
  background: linear-gradient(160deg, #24334f, #17213a);
  border: 3px dashed var(--edge2);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 6px 14px rgba(0, 0, 0, 0.4);
  transition:
    transform 0.2s,
    opacity 0.2s,
    background 0.2s,
    border-color 0.2s;
}
.pile-ico {
  flex: none;
  color: var(--gold2);
}
.pile-txt {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.pile-txt b {
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 6px;
  color: #fff;
}
.pile-txt span {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
}
.pile.ready {
  color: #fff;
  border: 3px solid var(--good2);
  background: linear-gradient(160deg, #2f8a61, #1f6447);
  animation: pulse-soft 1.1s infinite;
}
.pile.ready .pile-ico {
  color: #fff;
}
.pile.over {
  transform: scale(1.05);
  background: linear-gradient(160deg, #3aa874, #2a8059);
}
.pile.off {
  opacity: 0.45;
}

.end {
  height: 78px;
  border-radius: 14px;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 6px;
  text-indent: 6px;
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border: 3px solid var(--gold3);
  box-shadow:
    0 6px 0 #6d4f17,
    0 10px 16px rgba(0, 0, 0, 0.5);
  transition:
    transform 0.1s,
    box-shadow 0.1s,
    filter 0.15s;
}
.end:hover:not(.off) {
  filter: brightness(1.08);
}
.end:active:not(.off) {
  transform: translateY(4px);
  box-shadow:
    0 2px 0 #6d4f17,
    0 4px 8px rgba(0, 0, 0, 0.5);
}
.end.suggest {
  color: #fff;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
  background: linear-gradient(180deg, #58c996, #2c9a68);
  border-color: #1b6a47;
  box-shadow:
    0 6px 0 #14533a,
    0 10px 16px rgba(0, 0, 0, 0.5);
  animation: end-pulse 1.5s ease-in-out infinite;
}
@keyframes end-pulse {
  50% {
    filter: brightness(1.18);
  }
}
.end.off {
  filter: grayscale(0.9) brightness(0.55);
  cursor: default;
}
</style>
