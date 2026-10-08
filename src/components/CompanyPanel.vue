<script setup lang="ts">
// 右欄：公司的反應（反應速度、IT 管理員狀態、所有進行中的倒數）
import { computed } from 'vue'
import { SCENARIOS, VULNS } from '../game/data'
import { alertZone, node, speedOf, upcoming } from '../game/engine'
import { game } from '../game/store'
import Icon from './Icon.vue'

const s = computed(() => game.s!)
const sc = computed(() => SCENARIOS[s.value.scenario])

const ZONE = [
  { name: '平靜', icon: 'shield-check' },
  { name: '起疑', icon: 'eye' },
  { name: '全面調查', icon: 'siren' },
] as const
const zone = computed(() => alertZone(s.value.alert))
const speed = computed(() => speedOf(s.value))

const it = computed(() => node(s.value, 'it'))
const itState = computed(() => {
  if (it.value.paralyzed > 0) return { tone: 'ice', icon: 'snowflake', text: `癱瘓中 ${it.value.paralyzed} 回合`, sub: '修復與奪回全部暫停' }
  if (it.value.controlled) return { tone: 'mine', icon: 'skull', text: '被你控制', sub: '公司無法修復弱點' }
  return { tone: 'ok', icon: 'wrench', text: '正常運作', sub: '' }
})

const list = computed(() =>
  upcoming(s.value)
    .slice(0, 5)
    .map((u) => {
      const n = node(s.value, u.node)
      let label = ''
      let sub = ''
      let icon = 'wrench'
      if (u.kind === 'repair') {
        label = VULNS[u.vuln!].name
        sub = n.name
      } else if (u.kind === 'recapture') {
        label = n.name
        sub = '被奪回'
        icon = 'shield-alert'
      } else {
        label = '備份'
        sub = '恢復運作'
        icon = 'database-backup'
      }
      return { ...u, label, sub, icon }
    }),
)
const total = computed(() => upcoming(s.value).length)
</script>

<template>
  <div class="company">
    <div class="who">
      <div class="logo"><Icon :name="sc.icon" :size="30" :stroke="2" /></div>
      <div class="names">
        <b>{{ sc.company }}</b>
        <span>{{ sc.name }}</span>
      </div>
    </div>

    <div class="react" :class="'z' + zone">
      <Icon :name="ZONE[zone].icon" :size="28" :stroke="2.2" />
      <div class="rt">
        <b>{{ ZONE[zone].name }}</b>
        <span>公司反應 ×{{ speed }}</span>
      </div>
    </div>

    <div class="it" :class="itState.tone">
      <Icon :name="itState.icon" :size="26" :stroke="2.2" />
      <div class="rt">
        <b>IT 管理員</b>
        <span>{{ itState.text }}{{ itState.sub ? '・' + itState.sub : '' }}</span>
      </div>
    </div>

    <div class="board">
      <div class="title">公司動向<small v-if="total > list.length">還有 {{ total - list.length }} 項</small></div>
      <div v-for="(u, i) in list" :key="u.kind + u.node + u.idx" class="row" :class="[u.kind, { frozen: u.frozen, soon: u.eta <= 1 && !u.frozen }]">
        <Icon :name="u.icon" :size="22" :stroke="2.2" />
        <span class="lb"><b>{{ u.label }}</b><small>{{ u.sub }}</small></span>
        <span class="eta" :key="u.eta + '-' + i">
          <Icon :name="u.frozen ? 'snowflake' : 'timer'" :size="16" :stroke="2.6" />{{ u.frozen ? '' : u.eta }}
        </span>
      </div>
      <div v-if="!list.length" class="empty">目前沒有任何倒數</div>
    </div>
  </div>
</template>

<style scoped>
.company {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.who {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--slate);
  border: 3px solid #3c5a86;
}
.logo {
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  background: #3c6aa8;
}
.names {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.names b {
  font-size: 22px;
  font-weight: 900;
  line-height: 1.2;
  white-space: nowrap;
}
.names span {
  font-size: 16px;
  color: var(--text2);
}

.react,
.it {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--slate);
  border: 3px solid var(--edge);
  border-left-width: 8px;
}
.rt {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.rt b {
  font-size: 19px;
  font-weight: 900;
  line-height: 1.3;
}
.rt span {
  font-size: 15px;
  font-weight: 700;
  color: var(--text2);
}
.react.z0 {
  border-left-color: var(--good);
  color: var(--good2);
}
.react.z1 {
  border-left-color: var(--warn);
  color: #f2c25e;
}
.react.z2 {
  border-left-color: var(--bad);
  color: var(--bad2);
}
.react .rt b {
  color: inherit;
}
.it.ok {
  color: var(--text2);
}
.it.mine {
  border-left-color: var(--good);
  color: var(--good2);
  background: #1f3b31;
}
.it.ice {
  border-left-color: #6fb4e6;
  color: #bfe2f8;
  background: #20344a;
}
.it .rt b {
  color: #fff;
}

.board {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 14px;
  background: var(--slate);
  border: 3px solid var(--edge);
}
.title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 5px;
  color: var(--text2);
}
.title small {
  font-size: 14px;
  letter-spacing: 0;
  font-weight: 700;
  color: var(--text3);
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 4px 10px;
  border-radius: 9px;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  background: #3a2e2a;
  border: 2px solid #7a4a3a;
}
.row.repair {
  background: #2a3a55;
  border-color: #4f6da0;
}
.row.restore {
  background: #2a3a55;
  border-color: #4f6da0;
}
.row.frozen {
  opacity: 0.7;
  border-style: dashed;
}
.row.soon {
  border-color: var(--gold);
}
.lb {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.lb b {
  font-size: 17px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lb small {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text2);
}
.eta {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 34px;
  height: 28px;
  padding: 0 8px;
  border-radius: 14px;
  justify-content: center;
  font-family: var(--font-num);
  font-size: 20px;
  font-weight: 700;
  color: #2a1e08;
  background: var(--gold);
  animation: tick 0.5s ease-out;
}
.row.frozen .eta {
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
  padding: 8px 4px;
  font-size: 16px;
  color: var(--text3);
}
</style>
