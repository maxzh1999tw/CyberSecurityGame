<script setup lang="ts">
// 公司模式左欄：資產與本回合營收、完美防禦進度、駭客的任務（看見之前是問號）
import { computed } from 'vue'
import { defenseProgress, knownVulns, productionOf } from '../game/company'
import { COMPANY } from '../game/companyData'
import { MISSIONS } from '../game/data'
import { game, registerAnchor } from '../game/store'
import Icon from './Icon.vue'

const s = computed(() => game.s!)
const co = computed(() => s.value.company!)
const p = computed(() => productionOf(s.value))
const after = computed(() => Math.max(0, co.value.assets + p.value.net))
// 公司回合結束後，帳已經結清，面板改看下一個公司回合的預估
const mine = computed(() => s.value.phase === 'company')
const dp = computed(() => defenseProgress(s.value))
const knownBad = computed(() => s.value.nodes.reduce((a, n) => a + knownVulns(n).length, 0))
const mission = computed(() => MISSIONS[s.value.mission])
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
</script>

<template>
  <div class="cs">
    <div class="brand" :style="{ '--bc': co.brand.color }">
      <span class="logo"><Icon :name="co.brand.logo" :size="24" :stroke="2.2" /></span>
      <b>{{ co.brand.name }}</b>
    </div>
    <section :ref="(el) => registerAnchor('money', el as HTMLElement | null)" class="opanel money">
      <div class="ohead"><span class="oic"><Icon name="piggy-bank" :size="17" :stroke="2.4" /></span>公司資產</div>
      <div class="big"><Icon name="coins" :size="34" :stroke="2" /><b :class="{ neg: co.assets < 0 }">{{ co.assets }}</b><span>K</span></div>
      <ul class="rows">
        <li><span>產值</span><b class="g">+{{ p.gross }}</b></li>
        <li v-if="p.lead" class="sub"><span>主管加成</span><b>+{{ p.lead }}</b></li>
        <li><span>薪水與維護費</span><b class="r">−{{ p.upkeep }}</b></li>
        <li v-if="p.debt"><span>投資還款</span><b class="r">−{{ p.debt }}</b></li>
        <li v-if="p.spent"><span>這回合出牌</span><b class="r">−{{ p.spent }}</b></li>
        <li v-if="p.bonus"><span>額外收入</span><b class="g">+{{ p.bonus }}</b></li>
        <li class="tot"><span>{{ mine ? '本回合營收' : '下回合營收' }}</span><b :class="p.net >= 0 ? 'g' : 'r'">{{ sign(p.net) }}</b></li>
      </ul>
      <div class="after">
        {{ mine ? '回合結束後資產' : '下回合結束後資產' }} <b>{{ after }}</b>K
      </div>
    </section>

    <section class="opanel def">
      <div class="ohead">
        <span class="oic"><Icon name="shield-check" :size="17" :stroke="2.4" /></span>完美防禦
        <span class="pct">{{ Math.round((dp.known / dp.total) * 100) }}%</span>
      </div>
      <div class="bar"><i :style="{ width: (dp.known / dp.total) * 100 + '%' }"></i></div>
      <ul class="rows">
        <li><span><Icon name="eye" :size="16" :stroke="2.4" />已確認的牌</span><b>{{ dp.known }}/{{ dp.total }}</b></li>
        <li><span><Icon name="triangle-alert" :size="16" :stroke="2.4" />已知的弱點</span><b :class="{ r: knownBad }">{{ knownBad }}</b></li>
        <li><span><Icon name="skull" :size="16" :stroke="2.4" />被駭客控制</span><b :class="{ r: dp.controlled }">{{ dp.controlled }}</b></li>
      </ul>
      <p class="hint">所有牌都確認過、沒有弱點、沒有節點被控制，而且當回合有盈餘，就贏了。</p>
    </section>

    <section class="opanel mis" :class="{ known: co.missionKnown }">
      <div class="ohead"><span class="oic"><Icon name="target" :size="17" :stroke="2.4" /></span>駭客的任務</div>
      <template v-if="co.missionKnown">
        <div class="mh"><Icon :name="mission.icon" :size="26" :stroke="2" /><b>{{ mission.name }}</b></div>
        <p>{{ mission.goal }}</p>
      </template>
      <template v-else>
        <div class="mh"><Icon name="circle-question-mark" :size="26" :stroke="2" /><b>？？？</b></div>
        <p>警戒值 {{ COMPANY.intelAlert }} 以上時，打出「威脅情資」才看得見駭客想做什麼。</p>
      </template>
    </section>
  </div>
</template>

<style scoped>
.cs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.logo {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--bc) 65%, #fff), color-mix(in srgb, var(--bc) 85%, #0b1426));
  box-shadow:
    0 0 0 3px #fff,
    0 3px 8px rgba(20, 35, 60, 0.3);
}
.brand b {
  min-width: 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1.2;
  color: var(--o-navy);
  overflow-wrap: anywhere;
}
.money {
  --ac: #c9952a;
}
.def {
  --ac: #2c8f66;
}
.mis {
  --ac: #8494aa;
}
.mis.known {
  --ac: #c2412f;
}
.pct {
  margin-left: auto;
  font-family: var(--font-num);
  font-size: 20px;
  letter-spacing: 0;
}
.big {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  color: #c9952a;
}
.big :deep(svg) {
  align-self: center;
}
.big b {
  font-family: var(--font-num);
  font-size: 58px;
  line-height: 1;
  color: var(--o-navy);
  text-shadow: 0 2px 0 rgba(255, 255, 255, 0.8);
}
.big b.neg {
  color: var(--bad2);
}
.big span {
  font-size: 20px;
  font-weight: 800;
}
.rows {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rows li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 19px;
  font-weight: 700;
  color: var(--text2);
}
.rows li span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.rows li b {
  font-family: var(--font-num);
  font-size: 22px;
  color: var(--text);
}
.rows li.sub {
  padding-left: 14px;
  font-size: 17px;
}
.rows li.warn {
  color: #a5600f;
}
.rows li.tot {
  margin-top: 4px;
  padding-top: 6px;
  border-top: 2px solid var(--edge);
  font-weight: 900;
  color: var(--text);
}
.rows b.g {
  color: var(--good2);
}
.rows b.r {
  color: var(--bad2);
}
.after {
  margin-top: 10px;
  padding: 6px 10px;
  border-radius: 10px;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  color: #6b5426;
  background: linear-gradient(180deg, #f6f1e3, #ece3cb);
  border: 1.5px solid #ddc995;
}
.after b {
  font-family: var(--font-num);
  font-size: 22px;
  color: #7a5310;
}
.bar {
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  background: #dfe5ec;
  box-shadow: inset 0 1px 3px rgba(20, 35, 60, 0.15);
}
.bar i {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, #6fcf9c, #2c8f66);
  transition: width 0.4s ease;
}
.hint {
  margin: 8px 0 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text3);
}
.mis .mh {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 900;
  color: var(--text2);
}
.mis.known .mh {
  color: var(--bad2);
}
.mis p {
  margin: 6px 0 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text2);
}
</style>
