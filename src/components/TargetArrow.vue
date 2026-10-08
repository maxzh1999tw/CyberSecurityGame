<script setup lang="ts">
// 需要選目標的牌：從牌拉出一條箭頭指向目標
import { computed } from 'vue'
import { nodeRect, ui, view } from '../game/store'

const d = computed(() => (ui.drag && ui.drag.moved && ui.drag.mode === 'node' ? ui.drag : null))

const geom = computed(() => {
  const dr = d.value
  if (!dr) return null
  const sx = view.w / 2
  const sy = view.h - 250 - 136
  let ex = dr.x
  let ey = dr.y
  if (dr.tri && dr.overNode) {
    const r = nodeRect(dr.overNode)
    if (r) {
      ex = r.cx
      ey = r.cy
    }
  }
  const cx = (sx + ex) / 2
  const cy = Math.min(sy, ey) - 90
  const ang = (Math.atan2(ey - cy, ex - cx) * 180) / Math.PI
  return {
    sx,
    sy,
    path: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
    ex,
    ey,
    ang,
    snap: !!dr.tri && !!dr.overNode,
    tone: dr.tri === 'Y' ? 'sure' : dr.tri === 'M' ? 'maybe' : 'none',
  }
})
</script>

<template>
  <svg v-if="geom" class="arrow" :class="geom.tone" :viewBox="`0 0 ${view.w} ${view.h}`" :width="view.w" :height="view.h">
    <path :d="geom.path" class="shadow" />
    <path :d="geom.path" class="dots" />
    <g :transform="`translate(${geom.ex} ${geom.ey}) rotate(${geom.ang})`">
      <path d="M 8 0 L -32 -26 L -22 0 L -32 26 Z" class="head" />
    </g>
    <circle v-if="geom.snap" :cx="geom.ex" :cy="geom.ey" r="50" class="reticle" />
    <circle :cx="geom.sx" :cy="geom.sy" r="9" class="origin" />
  </svg>
</template>

<style scoped>
.arrow {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: 60;
  --ac: #e8eef8;
  overflow: visible;
}
.arrow.sure {
  --ac: #5fd99a;
}
.arrow.maybe {
  --ac: #f0b440;
}
.arrow.none {
  --ac: #a8b6cc;
}
.shadow {
  fill: none;
  stroke: rgba(0, 0, 0, 0.55);
  stroke-width: 20;
  stroke-linecap: round;
  stroke-dasharray: 0.1 24;
}
.dots {
  fill: none;
  stroke: var(--ac);
  stroke-width: 14;
  stroke-linecap: round;
  stroke-dasharray: 0.1 24;
  animation: flow 0.8s linear infinite;
}
.head {
  fill: var(--ac);
  stroke: rgba(0, 0, 0, 0.55);
  stroke-width: 3;
  stroke-linejoin: round;
}
.reticle {
  fill: none;
  stroke: var(--ac);
  stroke-width: 5;
  stroke-dasharray: 16 11;
  transform-box: fill-box;
  transform-origin: center;
  animation: spin 3.5s linear infinite;
}
.origin {
  fill: var(--ac);
  stroke: rgba(0, 0, 0, 0.55);
  stroke-width: 3;
}
@keyframes flow {
  to {
    stroke-dashoffset: -24;
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
