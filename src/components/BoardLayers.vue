<script setup lang="ts">
// 三層網路：外圍 → 內網 → 核心（玩家從下面往上打）
import { computed } from 'vue'
import { game } from '../game/store'
import type { GameNode } from '../game/types'
import Icon from './Icon.vue'
import NodeCard from './NodeCard.vue'

const nodes = computed(() => game.s?.nodes ?? [])
const rows = computed(() => {
  const by = (l: number): GameNode[] => nodes.value.filter((n) => n.layer === l)
  return [
    { layer: 2, name: '核心', sub: '最終目標', icon: 'database', nodes: by(2) },
    { layer: 1, name: '內網', sub: '', icon: 'network', nodes: by(1) },
    { layer: 0, name: '外圍', sub: '', icon: 'globe', nodes: by(0) },
  ]
})

// 防火牆：控制下一層任一節點後，才算打開
const openAbove = computed(() => {
  const s = game.s
  if (!s) return { 1: false, 2: false }
  return {
    1: s.nodes.some((n) => n.layer === 0 && n.controlled),
    2: s.nodes.some((n) => n.layer === 1 && n.controlled),
  } as Record<number, boolean>
})
</script>

<template>
  <div class="board">
    <template v-for="(r, i) in rows" :key="r.layer">
      <div v-if="i > 0" class="fw" :class="{ open: openAbove[r.layer + 1] }">
        <i class="line"></i>
        <span class="gate"><Icon :name="openAbove[r.layer + 1] ? 'lock-open' : 'lock'" :size="20" :stroke="2.6" /></span>
        <i class="line"></i>
      </div>
      <div class="row" :class="'layer-' + r.layer">
        <div class="label">
          <Icon :name="r.icon" :size="26" :stroke="2" />
          <span>{{ r.name }}</span>
        </div>
        <div class="nodes">
          <NodeCard v-for="n in r.nodes" :key="n.id" :node="n" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.board {
  position: absolute;
  left: 360px;
  right: 290px;
  top: 92px;
  bottom: 262px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  pointer-events: none;
}
.row {
  position: relative;
  height: 220px;
  flex: none;
  display: flex;
  align-items: center;
  border-radius: 18px;
  background: color-mix(in srgb, var(--lc) 7%, rgba(15, 21, 32, 0.62));
  border: 1.5px solid color-mix(in srgb, var(--lc) 26%, #1d2635);
}
.layer-2 {
  --lc: #36b59a;
}
.layer-1 {
  --lc: #9a78d8;
}
.layer-0 {
  --lc: #5b92d6;
}
.label {
  flex: none;
  width: 70px;
  margin-left: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 21px;
  font-weight: 900;
  letter-spacing: 2px;
  text-indent: 2px;
  color: color-mix(in srgb, var(--lc) 65%, #fff);
}
.nodes {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 28px;
  padding: 0 24px 0 8px;
  pointer-events: auto;
}
.layer-2 .nodes {
  gap: 80px;
}

.fw {
  flex: none;
  height: 32px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 48px;
  color: #d9604f;
  --fc: #d9604f;
}
.fw.open {
  color: var(--good2);
  --fc: var(--good2);
}
.line {
  flex: 1;
  height: 2px;
  background: repeating-linear-gradient(90deg, var(--fc) 0 12px, transparent 12px 22px);
  opacity: 0.45;
}
.fw.open .line {
  opacity: 0.35;
}
.gate {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--table1);
  border: 3px solid var(--fc);
}
</style>
