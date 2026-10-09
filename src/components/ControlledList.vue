<script setup lang="ts">
// 左欄：我控制了哪些節點（以及公司還要幾回合奪回）
import { computed } from 'vue'
import { etaOf, recaptureBlock, recaptureSpeedOf } from '../game/engine'
import { game, ui } from '../game/store'
import Icon from './Icon.vue'
import NodeArt from './NodeArt.vue'

const s = computed(() => game.s!)
const mine = computed(() =>
  s.value.nodes
    .filter((n) => n.controlled)
    .sort((a, b) => a.controlSeq - b.controlSeq)
    .map((n) => ({
      n,
      eta: etaOf(n.timer, recaptureSpeedOf(s.value, n)),
    })),
)
const frozen = computed(() => recaptureBlock(s.value) !== null)

const ABILITY: Record<string, { icon: string; text: string }> = {
  sales: { icon: 'zap', text: '+1 行動點' },
  engineer: { icon: 'zap', text: '+1 行動點' },
  boss: { icon: 'crown', text: '擴散 −1 行動點' },
  it: { icon: 'wrench', text: '修復暫停' },
  infra: { icon: 'bug', text: '病毒' },
  ai: { icon: 'sparkles', text: '每回合免費 1 張' },
  db: { icon: 'crown', text: '' },
  backup: { icon: 'database-backup', text: '+1 抽牌' },
}

function look(id: string) {
  if (ui.drag) return
  ui.hoverSlot = null
  ui.hoverNode = id
}
</script>

<template>
  <div class="mine">
    <div class="tag">我控制的節點<b>{{ mine.length }}</b></div>
    <div class="list">
      <div v-for="m in mine" :key="m.n.id" class="row" @pointerenter="look(m.n.id)" @pointerleave="ui.hoverNode === m.n.id && (ui.hoverNode = null)">
        <div class="av"><NodeArt :role="m.n.role" /></div>
        <div class="tx">
          <b>{{ m.n.name }}</b>
          <span v-if="ABILITY[m.n.role].text || m.n.role === 'backup'"><Icon :name="ABILITY[m.n.role].icon" :size="14" :stroke="2.4" /><template v-if="m.n.role !== 'backup' || m.n.paralyzed <= 0">{{ ABILITY[m.n.role].text }}</template></span>
        </div>
        <div class="eta" :class="{ frozen, soon: !frozen && m.eta <= 1 }" :key="m.eta">
          <Icon :name="frozen ? 'snowflake' : 'timer'" :size="16" :stroke="2.6" />{{ frozen ? '' : m.eta }}
        </div>
      </div>
      <div v-if="!mine.length" class="empty">還沒有控制任何節點</div>
    </div>
  </div>
</template>

<style scoped>
.mine {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: var(--slate);
  border: 3px solid var(--good);
}
.tag {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 4px;
  text-indent: 4px;
  color: #fff;
  background: #25704f;
  border-radius: 9px 9px 0 0;
}
.tag b {
  min-width: 26px;
  padding: 0 6px;
  border-radius: 13px;
  font-family: var(--font-num);
  font-size: 18px;
  letter-spacing: 0;
  text-indent: 0;
  text-align: center;
  color: #123;
  background: #bfffe0;
}
.list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 10px;
  background: #1f3b31;
  border: 2px solid #3a8a68;
}
.av {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 30%, #5ea58a, #1a3a30);
  box-shadow: 0 0 0 2px var(--good2);
}
.tx {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.tx b {
  font-size: 16px;
  font-weight: 900;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tx span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--good2);
}
.eta {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 34px;
  height: 28px;
  padding: 0 8px;
  justify-content: center;
  border-radius: 14px;
  font-family: var(--font-num);
  font-size: 20px;
  font-weight: 700;
  color: #2a1e08;
  background: var(--gold);
  animation: tick 0.5s ease-out;
}
.eta.soon {
  color: #fff;
  background: var(--bad);
}
.eta.frozen {
  color: #123;
  background: #9fd2f2;
}
@keyframes tick {
  from {
    transform: scale(1.4);
  }
  to {
    transform: none;
  }
}
.empty {
  padding: 10px 4px;
  font-size: 16px;
  color: var(--text3);
}
</style>
