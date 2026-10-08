<script setup lang="ts">
// 覆盤：遊戲結束後才是正題
import { computed, ref } from 'vue'
import { CARDS, MISSIONS, STAGES, VULNS } from '../game/data'
import { criticalVulns, ctrlCount, node } from '../game/engine'
import { loadPledge, loadResult, savePledge } from '../game/quiz'
import { backToMenu, game, openQuiz, startGame } from '../game/store'
import type { Entry, VulnId } from '../game/types'
import Icon from './Icon.vue'
import VulnCard from './VulnCard.vue'

const s = computed(() => game.s!)
const win = computed(() => s.value.result === 'win')
const m = computed(() => MISSIONS[s.value.mission])

const STAGE_ICON: Record<string, string> = {
  偵查: 'scan-eye',
  入侵: 'door-open',
  擴散: 'network',
  潛伏: 'ghost',
  得手: 'flag',
}
const stages = computed(() => {
  const done = new Set<string>()
  for (const p of s.value.plays) if (p.ok) done.add(CARDS[p.card].stage)
  return STAGES.map((st) => ({ st, icon: STAGE_ICON[st], done: done.has(st) }))
})

// 出牌時間軸（依回合分組）
const timeline = computed(() => {
  const by = new Map<number, typeof s.value.plays>()
  for (const p of s.value.plays) {
    if (!by.has(p.turn)) by.set(p.turn, [])
    by.get(p.turn)!.push(p)
  }
  return [...by.entries()].map(([turn, plays]) => ({ turn, plays }))
})

const nodeName = (e: Entry) => node(s.value, e.node).name

const uniq = (list: Entry[]) => {
  const seen = new Set<string>()
  return list.filter((e) => {
    const k = e.node + ':' + e.vuln
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const used = computed(() => uniq(s.value.exploited))
const critical = computed(() => criticalVulns(s.value))
// 你翻開過、但沒用到的弱點
const seen = computed(() => {
  const out: Entry[] = []
  for (const n of s.value.nodes)
    for (const sl of n.slots) if (!sl.shield && sl.vis > 0) out.push({ node: n.id, vuln: sl.vuln })
  return uniq(out)
})

interface CardItem {
  e: Entry
  tags: Array<{ text: string; tone: 'used' | 'key' | 'seen' }>
}
const cards = computed<CardItem[]>(() => {
  const map = new Map<string, CardItem>()
  const add = (e: Entry, tag: { text: string; tone: 'used' | 'key' | 'seen' }) => {
    const k = e.node + ':' + e.vuln
    if (!map.has(k)) map.set(k, { e, tags: [] })
    map.get(k)!.tags.push(tag)
  }
  for (const e of used.value) add(e, { text: '你利用過', tone: 'used' })
  for (const e of critical.value) add(e, { text: '關鍵', tone: 'key' })
  for (const e of seen.value) if (!map.has(e.node + ':' + e.vuln)) add(e, { text: '你看過', tone: 'seen' })
  return [...map.values()].slice(0, 8)
})

// 明天的一件事
const pledge = ref<VulnId | null>(loadPledge())
const tips = computed(() => {
  const order: VulnId[] = []
  for (const c of cards.value) if (!order.includes(c.e.vuln)) order.push(c.e.vuln)
  return order.slice(0, 4)
})
function choose(v: VulnId) {
  pledge.value = v
  savePledge(v)
}

const pre = computed(() => loadResult('pre'))
const post = computed(() => loadResult('post'))
const stats = computed(() => [
  { icon: 'history', label: '回合', v: s.value.turn },
  { icon: 'volume-2', label: '累計噪音', v: s.value.noiseTotal },
  { icon: 'skull', label: '控制節點', v: ctrlCount(s.value) },
  { icon: 'wrench', label: '被修補', v: s.value.patched },
])
</script>

<template>
  <div class="rv felt">
    <div class="page">
      <header :class="win ? 'win' : 'lose'">
        <div class="badge"><Icon :name="win ? 'trophy' : 'skull'" :size="54" :stroke="1.8" /></div>
        <div class="ttl">
          <b>{{ win ? '任務完成' : '行動失敗' }}</b>
          <span>{{ m.name }}<template v-if="!win">・{{ s.loseReason }}</template></span>
        </div>
        <div class="stats">
          <div v-for="st in stats" :key="st.label">
            <b>{{ st.v }}</b>
            <span>{{ st.label }}</span>
          </div>
        </div>
        <div v-if="pre" class="quiz">
          <span>測驗</span>
          <b>{{ pre.score }}/{{ pre.total }}</b>
          <template v-if="post"><Icon name="arrow-right" :size="22" :stroke="2.6" /><b class="up">{{ post.score }}/{{ post.total }}</b></template>
        </div>
      </header>

      <!-- 攻擊流程 -->
      <section class="flow">
        <h2><i>1</i>你走過的攻擊流程</h2>
        <div class="chain">
          <template v-for="(st, i) in stages" :key="st.st">
            <div class="step" :class="{ done: st.done }">
              <span class="dot"><Icon :name="st.done ? 'check' : st.icon" :size="26" :stroke="2.4" /></span>
              <b>{{ st.st }}</b>
            </div>
            <i v-if="i < stages.length - 1" class="link" :class="{ on: st.done && stages[i + 1].done }"></i>
          </template>
        </div>
        <div class="tl">
          <div v-for="t in timeline" :key="t.turn" class="turn">
            <span class="tn">第 {{ t.turn }} 回合</span>
            <span
              v-for="(p, i) in t.plays"
              :key="i"
              class="pl"
              :class="['cat-' + CARDS[p.card].cat, p.ok ? 'ok' : 'no']"
            >
              <Icon :name="CARDS[p.card].icon" :size="18" :stroke="2.2" />{{ CARDS[p.card].name }}
              <Icon :name="p.ok ? 'check' : 'x'" :size="16" :stroke="3" class="res" />
            </span>
          </div>
          <div v-if="!timeline.length" class="turn"><span class="tn none-tn">這局你沒出任何牌</span></div>
        </div>
      </section>

      <!-- 弱點牌 -->
      <section class="cards">
        <h2><i>2</i>我是從哪個弱點進來的？我身邊有沒有這種情況？</h2>
        <p v-if="!used.length" class="none">這局你還沒有成功利用任何弱點。</p>
        <div class="grid">
          <VulnCard
            v-for="c in cards"
            :key="c.e.node + c.e.vuln"
            :vuln="c.e.vuln"
            :where="nodeName(c.e)"
            :tags="c.tags"
          />
        </div>
      </section>

      <section class="crit">
        <h2><i>3</i>如果公司只能修<u>一個</u>弱點，修哪一個這局我就會輸？</h2>
        <div v-if="critical.length" class="list">
          <div v-for="e in critical" :key="e.node + e.vuln" class="it">
            <Icon :name="VULNS[e.vuln].icon" :size="30" :stroke="2" />
            <div>
              <b>{{ VULNS[e.vuln].name }}</b>
              <span>{{ nodeName(e) }}｜修好它，這局的攻擊路線就走不通</span>
            </div>
          </div>
        </div>
        <p v-else class="none">這局沒有單一的致命弱點：公司得同時修好好幾個，才擋得住你。</p>
      </section>

      <section class="pledge">
        <h2><i>4</i>我明天上班可以做的一件事</h2>
        <div class="opts">
          <button v-for="v in tips" :key="v" :class="{ on: pledge === v }" @click="choose(v)">
            <span class="ck"><Icon :name="pledge === v ? 'check' : VULNS[v].icon" :size="22" :stroke="2.6" /></span>
            <span class="tx">
              <small>{{ VULNS[v].name }}</small>
              {{ VULNS[v].tomorrow }}
            </span>
          </button>
        </div>
      </section>

      <footer>
        <button class="primary" @click="startGame()"><Icon name="rotate-ccw" :size="26" :stroke="2.4" />再玩一局</button>
        <button v-if="pre && !post" @click="openQuiz('post')"><Icon name="list-checks" :size="26" :stroke="2.4" />做後測</button>
        <button @click="backToMenu"><Icon name="menu" :size="26" :stroke="2.4" />回主選單</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.rv {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.page {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 36px 0 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 34px;
}
.page > * {
  width: min(1560px, calc(100% - 120px));
  flex: none;
}
header {
  --rc: #c99a2c;
  display: flex;
  align-items: center;
  gap: 26px;
  padding: 18px 28px;
  border-radius: 18px;
  background: var(--slate);
  border: 5px solid var(--rc);
}
header.lose {
  --rc: #b83f32;
}
.badge {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--rc);
  box-shadow: 0 0 0 5px rgba(0, 0, 0, 0.3);
}
.ttl {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ttl b {
  font-size: 56px;
  font-weight: 900;
  letter-spacing: 8px;
  line-height: 1.15;
  color: color-mix(in srgb, var(--rc) 50%, #fff);
}
.ttl span {
  font-size: 24px;
  font-weight: 700;
  color: var(--text2);
}
.stats {
  margin-left: auto;
  display: flex;
  gap: 14px;
}
.stats div {
  width: 110px;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 10px;
  background: #1a2231;
  border: 2px solid var(--edge);
}
.stats b {
  font-family: var(--font-num);
  font-size: 40px;
  line-height: 1.1;
}
.stats span {
  font-size: 16px;
  color: var(--text2);
}
.quiz {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  background: #1a2231;
  border: 2px solid var(--gold3);
  font-size: 20px;
  color: var(--text2);
}
.quiz b {
  font-family: var(--font-num);
  font-size: 34px;
  color: #fff;
}
.quiz .up {
  color: var(--good2);
}

h2 {
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 30px;
  font-weight: 900;
}
h2 i {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-style: normal;
  font-family: var(--font-num);
  font-size: 26px;
  color: #2a1e08;
  background: var(--gold);
}
h2 u {
  text-decoration: none;
  color: var(--gold2);
  border-bottom: 4px solid var(--gold);
}
section {
  padding: 22px 28px 26px;
  border-radius: 18px;
  background: rgba(20, 26, 38, 0.8);
  border: 3px solid var(--edge);
}

.chain {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 18px;
}
.step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 900;
  color: var(--text3);
}
.dot {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--text3);
  background: #1a2231;
  border: 3px solid #36445c;
}
.step.done {
  color: #fff;
}
.step.done .dot {
  color: #fff;
  background: var(--good);
  border-color: var(--good2);
}
.link {
  flex: 1;
  height: 5px;
  margin: 0 12px;
  border-radius: 3px;
  background: #2c374c;
}
.link.on {
  background: var(--good);
}
.tl {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.turn {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.tn {
  width: 110px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text2);
}
.tn.none-tn {
  width: auto;
}
.pl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px 0 8px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  background: color-mix(in srgb, var(--cc) 75%, #141a25);
  border: 2px solid var(--cc);
}
.pl.cat-recon {
  --cc: var(--c-recon);
}
.pl.cat-action {
  --cc: var(--c-action);
}
.pl.cat-paralyze {
  --cc: var(--c-paralyze);
}
.pl.cat-finish {
  --cc: var(--c-finish);
}
.pl.no {
  opacity: 0.6;
}
.pl .res {
  margin-left: 2px;
  padding: 1px;
  border-radius: 50%;
  color: #fff;
  background: var(--good);
}
.pl.no .res {
  background: var(--bad);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 26px;
}
.none {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text2);
}

.list {
  display: grid;
  gap: 10px;
}
.it {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  border-radius: 12px;
  color: var(--ink);
  background: var(--paper);
  border-left: 10px solid var(--c-paralyze);
}
.it :deep(svg) {
  color: var(--c-paralyze);
}
.it b {
  display: block;
  font-size: 26px;
}
.it span {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink2);
}

.opts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.opts button {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 12px;
  text-align: left;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.45;
  color: #fff;
  background: #1f293b;
  border: 3px solid #3a4862;
  transition: 0.15s;
}
.opts button:hover {
  border-color: var(--gold);
}
.opts button.on {
  background: #25704f;
  border-color: var(--good2);
}
.ck {
  flex: none;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #36445c;
}
.opts .on .ck {
  background: var(--good);
}
.tx small {
  display: block;
  font-size: 16px;
  color: var(--gold2);
}

footer {
  display: flex;
  gap: 18px;
  justify-content: center;
}
footer button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 70px;
  padding: 0 40px;
  border-radius: 14px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 3px;
  background: #2c3d5c;
  border: 3px solid var(--edge2);
  box-shadow: 0 5px 0 #151b27;
}
footer button:hover {
  filter: brightness(1.15);
}
footer button:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #151b27;
}
footer .primary {
  color: #2a1e08;
  background: linear-gradient(180deg, var(--gold2), var(--gold));
  border-color: var(--gold3);
  box-shadow: 0 5px 0 #6d4f17;
}
</style>
