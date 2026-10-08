<script setup lang="ts">
// 第一次遊玩時的 4 步導覽：直接指著畫面上的東西
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { anchorRect, nodeRect, ui, view } from '../game/store'
import type { Rect } from '../game/store'
import Icon from './Icon.vue'

interface Step {
  target: () => Rect | null
  text: string
  /** 說明框放在目標的哪一側 */
  side: 'above' | 'below' | 'left' | 'right'
}

const STEPS: Step[] = [
  {
    target: () => nodeRect('sales'),
    text: '每個節點底下都蓋著牌，其中有些是可以利用的弱點。先偵查，再下手。',
    side: 'above',
  },
  {
    target: () => ({ x: view.w / 2 - 400, y: view.h - 250, w: 800, h: 250, cx: view.w / 2, cy: view.h - 125 }),
    text: '把手牌拖到目標身上就能出牌。實線綠框一定成功，虛線黃框要賭一把。',
    side: 'above',
  },
  {
    target: () => anchorRect('alert'),
    text: '每張牌都會製造噪音。警戒值到 10 就被抓到，而且越高，公司的反應越快。',
    side: 'below',
  },
  {
    target: () => anchorRect('end'),
    text: '出完牌，按這裡結束回合。公開的弱點和被控制的節點，倒數會往前走。',
    side: 'left',
  },
]

const step = computed(() => (ui.coach === null ? null : STEPS[ui.coach]))
const rect = computed(() => step.value?.target() ?? null)

const box = computed(() => {
  const r = rect.value
  if (!r) return null
  const pad = 10
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }
})

// 說明框的實際高度（量出來才能確保整個框都在視窗內，按得到按鈕）
const bubbleEl = ref<HTMLElement | null>(null)
const bubbleH = ref(220)
let ro: ResizeObserver | null = null
watch(bubbleEl, (el) => {
  ro?.disconnect()
  if (!el) return
  bubbleH.value = el.offsetHeight
  ro = new ResizeObserver(() => (bubbleH.value = el.offsetHeight))
  ro.observe(el)
})
onBeforeUnmount(() => ro?.disconnect())

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

const bubble = computed(() => {
  const r = rect.value
  const s = step.value
  if (!r || !s) return null
  const W = 520
  const H = bubbleH.value
  const M = 20
  let x = r.cx - W / 2
  let y = 0
  if (s.side === 'above') y = r.y - 20 - H
  else if (s.side === 'below') y = r.y + r.h + 20
  else {
    x = r.x - W - 28
    y = r.cy - H / 2
  }
  x = clamp(x, M, view.w - W - M)
  y = clamp(y, M, view.h - H - M)
  return { x, y, W }
})

function next() {
  if (ui.coach === null) return
  if (ui.coach < STEPS.length - 1) ui.coach++
  else finish()
}
function finish() {
  ui.coach = null
  try {
    localStorage.setItem('csg-coach', '1')
  } catch {
    /* 沒有儲存空間也沒關係 */
  }
}
</script>

<template>
  <div v-if="step && box && bubble" class="coach">
    <div class="hole" :style="{ left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' }"></div>
    <div ref="bubbleEl" class="bubble" :style="{ left: bubble.x + 'px', top: bubble.y + 'px', width: bubble.W + 'px' }">
      <p>{{ step.text }}</p>
      <div class="row">
        <span class="dots"><i v-for="(_, i) in STEPS" :key="i" :class="{ on: i === ui.coach }"></i></span>
        <button class="skip" @click="finish">略過</button>
        <button class="next" @click="next">
          {{ ui.coach === STEPS.length - 1 ? '開始' : '下一步' }}<Icon name="chevron-right" :size="24" :stroke="3" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coach {
  position: absolute;
  inset: 0;
  z-index: 110;
}
.hole {
  position: absolute;
  border-radius: 16px;
  border: 4px solid var(--gold);
  box-shadow: 0 0 0 4000px rgba(6, 9, 14, 0.78);
  pointer-events: none;
  transition: all 0.3s ease;
}
.bubble {
  position: absolute;
  padding: 22px 26px 20px;
  border-radius: 16px;
  background: var(--slate);
  border: 4px solid var(--gold);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
}
.bubble p {
  margin: 0 0 16px;
  font-size: 27px;
  font-weight: 700;
  line-height: 1.6;
  color: #fff;
}
.row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.dots {
  display: flex;
  gap: 8px;
  margin-right: auto;
}
.dots i {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3a4862;
}
.dots i.on {
  background: var(--gold);
}
.skip {
  height: 52px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text2);
}
.skip:hover {
  color: #fff;
}
.next {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 56px;
  padding: 0 24px 0 28px;
  border-radius: 12px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border: 3px solid var(--gold3);
  box-shadow: 0 4px 0 #6d4f17;
}
.next:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #6d4f17;
}
</style>
