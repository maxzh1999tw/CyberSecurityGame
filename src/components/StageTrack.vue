<script setup lang="ts">
// 左欄：攻擊流程進度（偵查 → 入侵 → 擴散 → 潛伏 → 得手）
import { computed } from 'vue'
import { CARDS, STAGES } from '../game/data'
import { game } from '../game/store'
import Icon from './Icon.vue'

const ICON: Record<string, string> = {
  偵查: 'scan-eye',
  入侵: 'door-open',
  擴散: 'network',
  潛伏: 'ghost',
  得手: 'flag',
}

const steps = computed(() => {
  const done = new Set<string>()
  for (const p of game.s?.plays ?? []) {
    if (p.ok) done.add(CARDS[p.card].stage)
  }
  return STAGES.map((st) => ({ st, icon: ICON[st], done: done.has(st) }))
})
</script>

<template>
  <div class="track">
    <div class="tag">攻擊流程</div>
    <ol>
      <li v-for="s in steps" :key="s.st" :class="{ done: s.done }">
        <span class="dot"><Icon :name="s.done ? 'check' : s.icon" :size="20" :stroke="2.6" /></span>
        <span class="lbl">{{ s.st }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.track {
  border-radius: 14px;
  background: var(--slate);
  border: 3px solid var(--edge);
  padding-bottom: 14px;
}
.tag {
  padding: 5px 0;
  text-align: center;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 6px;
  text-indent: 6px;
  color: var(--text2);
  background: #1a2231;
  border-radius: 10px 10px 0 0;
}
ol {
  margin: 14px 8px 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 2px;
}
li {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text3);
}
li:not(:last-child)::after {
  content: '';
  position: absolute;
  left: calc(50% + 21px);
  top: 18px;
  width: calc(100% - 42px);
  height: 3px;
  background: #36445c;
}
li.done:not(:last-child)::after {
  background: var(--good);
}
.dot {
  position: relative;
  z-index: 1;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--text3);
  background: #1a2231;
  border: 2px solid #36445c;
}
li.done {
  color: #fff;
}
li.done .dot {
  color: #fff;
  background: var(--good);
  border-color: var(--good2);
}
</style>
