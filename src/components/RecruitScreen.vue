<script setup lang="ts">
// 公司模式：組建公司。左邊是你的公司（三層），右邊是人力市場（分類分頁）；
// 從右邊拖到左邊的某一層就聘用，點一下會放到第一個放得下的層。
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { forecast, layerCount, LAYER_NAMES, openErrors, placeProblem, seatsOf, type Candidate } from '../game/company'
import { BRAND_COLORS, BRAND_LOGOS, BRAND_NAME_MAX, COMPANY, HIRES, INFRA_SEATS, MARKET_ORDER, REQUIRED, TIER_NAME, TIER_VULNS } from '../game/companyData'
import { fireNode, hireCandidate, moveNode, openCompany, recommendBuild, setBrand } from '../game/companyStore'
import { backToMenu, coachSeen, game, registerAnchor, toStage, ui } from '../game/store'
import type { HireKind, Layer } from '../game/types'
import CoachOverlay from './CoachOverlay.vue'
import Icon from './Icon.vue'

const QUICK_BUILD = false
import NodeArt from './NodeArt.vue'

const d = computed(() => game.draft!)
// 換 logo 的小面板
const picking = ref(false)
const onName = (ev: Event) => setBrand({ name: (ev.target as HTMLInputElement).value })
const tab = ref<HireKind>(MARKET_ORDER[0])
const tierName = (c: Candidate) => TIER_NAME[c.kind === 'employee' ? 'person' : 'machine'][c.tier]

const fc = computed(() => forecast(d.value.picks, d.value.placement))
const errors = computed(() => openErrors(d.value))
// 缺的種類直接畫在層級上（紅色佔位），這裡只列其他問題：收益不夠、某層太擠
const otherErrors = computed(() => errors.value.filter((e) => e.includes('每回合收益') || e.includes('最多') || e.includes('不能擺在')))

/** 每一層還缺的必要節點（佔位用）：資料庫、備份在核心；IT、基礎設施在內網；員工、主管、AI 先放外圍 */
const placeholders = (layer: Layer) => {
  const cnt = (h: HireKind, at?: Layer) =>
    d.value.picks.filter((p) => p.hire === h && (at === undefined || d.value.placement[p.uid] === at)).length
  const out: Array<{ h: HireKind; key: string; note: string | null }> = []
  // 一定要在這一層的（flex 是哪一層都算數的）：別層已經有同類的，提示可以直接移過來
  const add = (h: HireKind, n: number, flex = false) => {
    const elsewhere = !flex && cnt(h) > cnt(h, layer)
    const note = flex ? anyLayer(h) : elsewhere ? '可把別層的移過來' : null
    for (let k = 0; k < n; k++) out.push({ h, key: `${h}${k}`, note })
  }
  if (layer === 2) {
    add('db', REQUIRED.db - cnt('db', 2))
    add('backup', REQUIRED.backup - cnt('backup', 2))
  } else if (layer === 1) {
    add('it', REQUIRED.it - cnt('it', 1))
    add('infra', REQUIRED.infra - cnt('infra', 1))
  } else {
    add('staff', COMPANY.minOuterStaff - cnt('staff', 0))
    add('exec', REQUIRED.exec - cnt('exec'), true)
    add('ai', REQUIRED.ai - cnt('ai'), true)
  }
  return out
}
const anyLayer = (h: HireKind) =>
  HIRES[h].layers.length === 3 ? '哪一層都可以' : `${HIRES[h].layers.map((l) => LAYER_NAMES[l]).join('或')}都可以`
const netOk = computed(() => fc.value.net >= COMPANY.minNet)
// 基礎設施的位置：每台能支援幾個有產值的節點（硬上限）
const seats = computed(() => seatsOf(d.value.picks))
const seatsUsed = computed(() => d.value.picks.filter((p) => HIRES[p.hire].productive).length)
// 收益條：門檻放在 40% 的位置，超過門檻的部分也看得出來多了多少
const GOAL_AT = 40
const netPct = computed(() => Math.max(0, Math.min(100, (fc.value.net / COMPANY.minNet) * GOAL_AT)))
const ROWS: Array<{ layer: Layer; icon: string; hint: string }> = [
  { layer: 2, icon: 'database', hint: '資料庫、備份，也可以放基礎設施、AI' },
  { layer: 1, icon: 'network', hint: 'IT、基礎設施，也可以放員工、主管、AI' },
  { layer: 0, icon: 'globe', hint: '一般員工，也可以放主管、AI' },
]
const inLayer = (layer: Layer) => d.value.picks.filter((p) => d.value.placement[p.uid] === layer)
const tabCount = (h: HireKind) => d.value.picks.filter((p) => p.hire === h).length
const unit = (c: Candidate) => (c.kind === 'employee' ? '薪水' : '維護費')
// 安全度：星級決定底下有幾個弱點（一星 3 個、二星 2 個、三星 1 個）
const vulnCount = (c: Candidate) => Math.min(c.slots.length, TIER_VULNS[c.tier])
// 履歷上的長條：產值以 80K、成本以 50K 為滿格
const bar = (v: number, max: number) => Math.max(6, Math.min(100, (v / max) * 100)) + '%'

// ───── 拖曳 ─────
interface Drag {
  uid: number
  from: 'market' | 'company'
  c: Candidate
  sx: number
  sy: number
  x: number
  y: number
  moved: boolean
  over: Layer | 'market' | null
}
const drag = ref<Drag | null>(null)

function down(c: Candidate, from: Drag['from'], ev: PointerEvent) {
  if (ev.button !== 0) return
  const p = toStage(ev.clientX, ev.clientY)
  drag.value = { uid: c.uid, from, c, sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false, over: null }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
}
function zoneAt(ev: PointerEvent): Drag['over'] {
  for (const el of document.elementsFromPoint(ev.clientX, ev.clientY)) {
    const z = (el as HTMLElement).dataset?.zone
    if (z === 'market') return 'market'
    if (z !== undefined) return Number(z) as Layer
  }
  return null
}
function move(ev: PointerEvent) {
  const g = drag.value
  if (!g) return
  const p = toStage(ev.clientX, ev.clientY)
  g.x = p.x
  g.y = p.y
  if (!g.moved && Math.hypot(g.x - g.sx, g.y - g.sy) > 8) g.moved = true
  g.over = g.moved ? zoneAt(ev) : null
}
function stop() {
  window.removeEventListener('pointermove', move)
  window.removeEventListener('pointerup', up)
  window.removeEventListener('pointercancel', cancel)
}
function up(ev: PointerEvent) {
  const g = drag.value
  stop()
  drag.value = null
  if (!g) return
  if (!g.moved) {
    // 點一下：市場的人直接聘用
    if (g.from === 'market') hireCandidate(g.uid)
    return
  }
  const z = zoneAt(ev)
  if (z === 'market') {
    if (g.from === 'company') fireNode(g.uid)
  } else if (z !== null) {
    if (g.from === 'market') hireCandidate(g.uid, z)
    else moveNode(g.uid, z)
  }
}
function cancel() {
  stop()
  drag.value = null
}
onBeforeUnmount(stop)

// 第一次進來：一步一步指著畫面介紹怎麼組公司（等錨點都掛好再開始）
onMounted(() => {
  if (!coachSeen('recruit')) void nextTick(() => (ui.coach = 0))
})
onBeforeUnmount(() => (ui.coach = null))
const anchor = (name: string) => (el: unknown) => registerAnchor(name, el as HTMLElement | null)

/** 拖曳中：這一層能不能放 */
const rowState = (layer: Layer) => {
  const g = drag.value
  if (!g?.moved) return ''
  const problem = placeProblem(d.value, g.c, layer)
  return (problem ? 'bad' : 'good') + (g.over === layer ? ' over' : '')
}
const rowProblem = (layer: Layer) => {
  const g = drag.value
  return g?.moved && g.over === layer ? placeProblem(d.value, g.c, layer) : null
}
</script>

<template>
  <div class="recruit office felt" :class="{ dragging: drag?.moved }">
    <header>
      <button class="back" @click="backToMenu"><Icon name="menu" :size="22" :stroke="2.4" />主選單</button>
      <div class="brandbox">
        <button class="crest" :class="{ on: picking }" :style="{ '--bc': d.brand.color }" title="換 logo" @click="picking = !picking">
          <Icon :name="d.brand.logo" :size="36" :stroke="2" />
          <span class="pen"><Icon name="pencil" :size="13" :stroke="2.6" /></span>
        </button>
        <template v-if="picking">
          <div class="pickveil" @pointerdown="picking = false"></div>
          <div class="picker" role="dialog" aria-label="公司 logo">
            <div class="pkhead">公司 logo</div>
            <div class="logos">
              <button
                v-for="l in BRAND_LOGOS"
                :key="l"
                :class="{ on: d.brand.logo === l }"
                :style="{ '--bc': d.brand.color }"
                :aria-label="l"
                @click="setBrand({ logo: l })"
              >
                <Icon :name="l" :size="26" :stroke="2" />
              </button>
            </div>
            <div class="pkhead">底色</div>
            <div class="colors">
              <button
                v-for="c in BRAND_COLORS"
                :key="c"
                :class="{ on: d.brand.color === c }"
                :style="{ background: c }"
                :aria-label="c"
                @click="setBrand({ color: c })"
              >
                <Icon v-if="d.brand.color === c" name="check" :size="18" :stroke="3" />
              </button>
            </div>
            <button class="done" @click="picking = false">完成</button>
          </div>
        </template>
      </div>
      <div class="title">
        <div class="eyebrow">組建你的公司</div>
        <label class="namebox" title="幫公司取個名字">
          <!-- 隱形的同字型文字量出名稱的真實寬度，輸入框跟著變寬，鉛筆就貼在名字後面 -->
          <span class="namefit">
            <span class="sizer" aria-hidden="true">{{ d.brand.name || '幫公司取個名字' }}</span>
            <input :value="d.brand.name" size="1" :maxlength="BRAND_NAME_MAX" placeholder="幫公司取個名字" spellcheck="false" @input="onName" />
          </span>
          <Icon name="pencil" :size="22" :stroke="2.4" />
        </label>
      </div>
      <!-- 教學提示：怎麼聘、等級代表什麼 -->
      <ul class="tips">
        <li>
          <span class="tic"><Icon name="hand" :size="18" :stroke="2.4" /></span>
          <span>從右邊的人力市場把人才與設備<b>拖進公司</b>，點一下也能直接聘用。</span>
        </li>
        <li>
          <span class="tic"><Icon name="shield-check" :size="18" :stroke="2.4" /></span>
          <span><b>星級越高的人與機器弱點越少</b>（一星 3 個、二星 2 個、三星 1 個），但越花錢，賺錢的人淨賺也越少。</span>
        </li>
      </ul>
    </header>

    <main>
      <!-- 左：你的公司 -->
      <section class="company">
        <div class="phead">
          <span class="ptitle"><Icon name="building-2" :size="24" :stroke="2.2" />你的公司</span>
          <span class="pcount">{{ d.picks.length }} 個節點</span>
        </div>
        <div :ref="anchor('layers')" class="layers">
          <div v-for="row in ROWS" :key="row.layer" class="lrow" :class="['layer-' + row.layer, rowState(row.layer)]" :data-zone="row.layer">
            <div class="lname">
              <span class="lic"><Icon :name="row.icon" :size="22" :stroke="2.2" /></span>
              <b>{{ LAYER_NAMES[row.layer] }}</b>
              <span class="pips" :title="`${layerCount(d, row.layer)}/${COMPANY.layerMax}`">
                <i v-for="k in COMPANY.layerMax" :key="k" :class="{ on: k <= layerCount(d, row.layer) }"></i>
              </span>
            </div>
            <div class="chips">
              <TransitionGroup name="chip">
                <div
                  v-for="c in inLayer(row.layer)"
                  :key="c.uid"
                  class="chip"
                  :class="['h-' + c.hire, 'tier-' + c.tier, { lifted: drag?.moved && drag.uid === c.uid }]"
                  :title="`${c.name}・${HIRES[c.hire].label}（${tierName(c)}）`"
                  @pointerdown.prevent="down(c, 'company', $event)"
                >
                  <span class="tg">{{ tierName(c) }}</span>
                  <div class="av"><NodeArt :art="c.art" /></div>
                  <div class="ct">
                    <b>{{ c.name }}</b>
                    <span class="meta">
                      <Icon :name="HIRES[c.hire].icon" :size="14" :stroke="2.4" />
                      <em v-if="c.value" class="pv">+{{ c.value }}K</em>
                      <em v-if="c.hire === 'infra'" class="ps" title="能支援幾個有產值的節點">支援 {{ INFRA_SEATS[c.tier] }}</em>
                      <em class="pc">−{{ c.cost }}K</em>
                    </span>
                  </div>
                  <button class="x" title="移回人力市場" @pointerdown.stop @click="fireNode(c.uid)"><Icon name="x" :size="14" :stroke="3" /></button>
                </div>
                <button v-for="ph in placeholders(row.layer)" :key="'ph' + ph.key" class="ph" :title="`從人力市場的「${HIRES[ph.h].label}」分頁拖進來`" @click="tab = ph.h">
                  <span class="phic"><Icon :name="HIRES[ph.h].icon" :size="22" :stroke="2.2" /></span>
                  <span><b>還缺{{ HIRES[ph.h].label }}</b><small v-if="ph.note">{{ ph.note }}</small></span>
                </button>
              </TransitionGroup>
              <span v-if="!inLayer(row.layer).length && !placeholders(row.layer).length" class="empty">{{ row.hint }}</span>
            </div>
            <div v-if="rowProblem(row.layer)" class="rowwarn"><Icon name="circle-alert" :size="18" :stroke="2.4" />{{ rowProblem(row.layer) }}</div>
          </div>
        </div>

        <div class="summary">
          <div :ref="anchor('ledger')" class="ledger">
            <div class="lhead"><Icon name="receipt-text" :size="18" :stroke="2.4" />每回合損益（預估）</div>
            <div class="line"><span>產值</span><b class="g">+{{ fc.gross }}K</b></div>
            <div class="line sub" :class="{ full: seatsUsed >= seats }" title="基礎設施依等級能支援 3～6 個有產值的節點；滿了要先多聘或換一台更好的基礎設施">
              <span>有產值的節點（基礎設施支援）</span><b>{{ seatsUsed }}/{{ seats }}</b>
            </div>
            <div v-if="fc.lead" class="line sub"><span>主管帶人加成</span><b class="g">+{{ fc.lead }}K</b></div>
            <div class="line"><span>薪水與維護費</span><b class="r">−{{ fc.upkeep }}K</b></div>
            <div class="line tot" :class="{ ok: netOk }">
              <span>每回合收益</span>
              <b>{{ fc.net >= 0 ? '+' : '' }}{{ fc.net }}<small>K</small></b>
            </div>
            <div class="goal" :class="{ ok: netOk }">
              <div class="track"><i :style="{ width: netPct + '%' }"></i></div>
              <span class="flag" :style="{ left: GOAL_AT + '%' }"><Icon name="flag" :size="14" :stroke="2.6" />開業門檻 +{{ COMPANY.minNet }}K</span>
            </div>
          </div>
          <div class="side">
            <ul v-if="otherErrors.length" class="errs">
              <li v-for="e in otherErrors" :key="e"><Icon name="circle-alert" :size="16" :stroke="2.4" />{{ e }}</li>
            </ul>
            <p v-else-if="errors.length" class="hint"><Icon name="info" :size="16" :stroke="2.4" />把紅色的空位補齊，就能開始營運</p>
            <p v-else class="hint ok"><Icon name="check" :size="16" :stroke="2.8" />配置完成，可以開始營運了</p>
            <!-- 快速配置暫時隱藏（用它開局賺得太少，太難）；要恢復就把 QUICK_BUILD 改成 true -->
            <button v-if="QUICK_BUILD" class="rec" title="用最少的節點排出一個能開業的配置" @click="recommendBuild">
              <Icon name="sparkles" :size="22" :stroke="2.4" />快速配置
            </button>
            <button :ref="anchor('open')" class="go" :disabled="errors.length > 0" @click="openCompany"><Icon name="play" :size="28" :stroke="2.6" />開始營運</button>
          </div>
        </div>
      </section>

      <!-- 右：人力市場 -->
      <section :ref="anchor('market')" class="market" data-zone="market" :class="{ drop: drag?.moved && drag.from === 'company', over: drag?.over === 'market' }">
        <div class="phead">
          <span class="ptitle"><Icon name="briefcase-business" :size="24" :stroke="2.2" />人力市場</span>
          <span class="pcount">點一下直接聘用，或拖到指定的層</span>
        </div>
        <div :ref="anchor('marketTabs')" class="tabs">
          <button
            v-for="h in MARKET_ORDER"
            :key="h"
            :class="['h-' + h, { on: tab === h, need: tabCount(h) < REQUIRED[h] }]"
            @click="tab = h"
          >
            <Icon :name="HIRES[h].icon" :size="17" :stroke="2.4" />
            {{ HIRES[h].label }}
            <i v-if="tabCount(h) < REQUIRED[h]" class="need-dot" title="公司還缺這一類"></i>
          </button>
        </div>
        <p class="effect" :class="'h-' + tab">
          <span class="eic"><Icon :name="HIRES[tab].icon" :size="20" :stroke="2.3" /></span>
          <span>
            <b>{{ HIRES[tab].label }}</b>
            {{ HIRES[tab].guide }}
          </span>
        </p>
        <div class="grid">
          <div
            v-for="(c, i) in d.market[tab]"
            :key="c.uid"
            :ref="i === 0 ? anchor('firstCand') : undefined"
            class="cand"
            :class="['h-' + c.hire, 'tier-' + c.tier, { lifted: drag?.moved && drag.uid === c.uid }]"
            @pointerdown.prevent="down(c, 'market', $event)"
          >
            <div class="band">
              <span class="stars" :title="`${c.tier} 星：底下有 ${vulnCount(c)} 個弱點，星級越高弱點越少`">
                <Icon v-for="k in 3" :key="k" name="star" :size="14" :stroke="2.4" :class="{ on: k <= c.tier }" />
              </span>
              <span v-if="c.value" class="net" :class="{ neg: c.value - c.cost < 0 }" title="產值扣掉薪水，每回合淨賺">
                淨 {{ c.value - c.cost >= 0 ? '+' : '' }}{{ c.value - c.cost }}K
              </span>
              <span class="tier">{{ tierName(c) }}</span>
            </div>
            <div class="body">
              <div class="av"><NodeArt :art="c.art" /></div>
              <div class="info">
                <b>{{ c.name }}</b>
                <div v-if="c.hire === 'infra'" class="seat"><Icon name="users" :size="15" :stroke="2.4" />能支援 {{ INFRA_SEATS[c.tier] }} 個有產值的節點</div>
                <div v-if="c.value" class="stat v">
                  <span>產值</span><i><u :style="{ width: bar(c.value, 50) }"></u></i><em>+{{ c.value }}K</em>
                </div>
                <div class="stat c">
                  <span>{{ unit(c) }}</span><i><u :style="{ width: bar(c.cost, 50) }"></u></i><em>−{{ c.cost }}K</em>
                </div>
                <div class="stat s" :title="`${tierName(c)}：底下有 ${vulnCount(c)} 個弱點，其餘是防護`">
                  <span>安全</span><i><u :style="{ width: (c.tier / 3) * 100 + '%' }"></u></i><em>{{ vulnCount(c) }} 個弱點</em>
                </div>
              </div>
            </div>
          </div>
          <p v-if="!d.market[tab].length" class="none">這一類已經沒有候選人了</p>
        </div>
        <div v-if="drag?.moved && drag.from === 'company'" class="dropmsg"><Icon name="x" :size="22" :stroke="2.6" />放到這裡：移回人力市場</div>
      </section>
    </main>

    <Transition name="toast">
      <div v-if="ui.toast" :key="ui.toast.id" class="toast" :class="ui.toast.tone">
        <Icon :name="ui.toast.tone === 'info' ? 'sparkles' : 'circle-alert'" :size="20" :stroke="2.4" />{{ ui.toast.text }}
      </div>
    </Transition>

    <CoachOverlay />

    <!-- 拖曳中的節點 -->
    <div v-if="drag?.moved" class="ghost" :class="'h-' + drag.c.hire" :style="{ left: drag.x + 'px', top: drag.y + 'px' }">
      <div class="av"><NodeArt :art="drag.c.art" /></div>
      <span>
        <b>{{ drag.c.name }}</b>
        <small>{{ HIRES[drag.c.hire].label }}・{{ tierName(drag.c) }}</small>
      </span>
    </div>
  </div>
</template>

<style scoped>
.recruit {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 32px 24px;
  overflow: hidden;
  overflow: clip;
}
.recruit.dragging {
  cursor: grabbing;
}

/* ───── 招募種類色（和遊戲中的節點同一套色相） ───── */
.h-staff {
  --hc: #c9772b;
}
.h-exec {
  --hc: #b0862a;
}
.h-ai {
  --hc: #7b5cc4;
}
.h-it {
  --hc: #23876a;
}
.h-infra {
  --hc: #3a6fb5;
}
.h-db {
  --hc: #1f8f86;
}
.h-backup {
  --hc: #3b86a4;
}

/* ───── 頁首 ───── */
header {
  display: flex;
  align-items: center;
  gap: 20px;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 50px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 19px;
  font-weight: 800;
  color: var(--text2);
  background: var(--slate);
  border: 2px solid var(--edge);
  box-shadow: var(--o-shadow);
}
.back:hover {
  color: var(--o-navy);
  border-color: var(--edge2);
}
/* 公司 logo：點一下換圖示與底色 */
.brandbox {
  position: relative;
  flex: none;
}
.crest {
  --bc: var(--o-blue);
  position: relative;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--bc) 65%, #fff), color-mix(in srgb, var(--bc) 85%, #0b1426));
  box-shadow:
    0 0 0 4px var(--slate),
    0 0 0 6px color-mix(in srgb, var(--bc) 40%, var(--slate)),
    var(--o-shadow);
  transition:
    transform 0.15s,
    background 0.2s;
}
.crest:hover,
.crest.on {
  transform: scale(1.05);
}
.pen {
  position: absolute;
  right: -4px;
  bottom: -2px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--o-navy);
  background: #fff;
  box-shadow: 0 2px 5px rgba(20, 35, 60, 0.3);
}
.pickveil {
  position: fixed;
  inset: 0;
  z-index: 69;
}
.picker {
  position: absolute;
  left: 0;
  top: 92px;
  z-index: 70;
  width: 448px;
  padding: 14px 16px 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, #f9fafc, #eef2f6);
  border: 2px solid #c9d2de;
  box-shadow: 0 18px 40px rgba(20, 35, 60, 0.3);
  animation: picker-in 0.18s ease-out;
}
@keyframes picker-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}
.pkhead {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 2px;
  color: var(--o-navy);
}
.logos {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 14px;
}
.logos button {
  height: 52px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: var(--text2);
  background: #fff;
  border: 2px solid #d6dde7;
  transition:
    background 0.12s,
    color 0.12s;
}
.logos button:hover {
  color: var(--o-navy);
  border-color: #a3b0c2;
}
.logos button.on {
  color: #fff;
  background: var(--bc);
  border-color: color-mix(in srgb, var(--bc) 70%, #000);
}
.colors {
  display: flex;
  gap: 8px;
}
.colors button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: 0 0 0 2px #fff, 0 2px 5px rgba(20, 35, 60, 0.3);
  transition: transform 0.12s;
}
.colors button:hover {
  transform: scale(1.08);
}
.colors button.on {
  box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--o-navy);
}
.done {
  display: block;
  width: 100%;
  height: 44px;
  margin-top: 14px;
  border-radius: 12px;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 4px;
  color: #fff;
  background: linear-gradient(180deg, #3d70bf, var(--o-blue));
  border: 2px solid #1b4ea3;
}
.title {
  flex: 0 1 auto;
  min-width: 0;
}
.eyebrow {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 3px;
  color: var(--o-blue);
}
/* 公司名稱：看起來像標題，滑過或點進去才顯示可以編輯 */
.namebox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 0 10px 0 4px;
  margin-left: -4px;
  border-radius: 10px;
  color: var(--text3);
  border: 2px dashed transparent;
  cursor: text;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.namebox:hover {
  border-color: var(--edge2);
}
.namebox:focus-within {
  color: var(--o-blue);
  background: #fff;
  border: 2px solid var(--o-blue2);
}
.namefit {
  display: inline-grid;
  min-width: 0;
  max-width: 13.5em;
  font-size: 40px;
}
.namefit > * {
  grid-area: 1 / 1;
  min-width: 0;
  padding: 0 2px 0 0;
  font: inherit;
  font-weight: 900;
  /* 行高留出英文字母下緣（g、y、p）的空間，才不會被輸入框切掉 */
  line-height: 1.55;
  letter-spacing: 4px;
}
.sizer {
  visibility: hidden;
  white-space: pre;
  overflow: hidden;
}
.namebox input {
  width: 100%;
  height: 100%;
  color: var(--o-navy);
  background: transparent;
  border: 0;
  outline: none;
}
.namebox input::placeholder {
  color: #a3b0c2;
}
/* 頁首的教學提示 */
.tips {
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* 整個靠右 */
  margin: 0 0 0 auto;
  padding: 10px 14px;
  list-style: none;
  border-radius: 14px;
  background: #e3ecf8;
  border: 1.5px solid #c3d4ec;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
.tips li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--o-navy);
}
.tic {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--o-blue);
}
.tips b {
  font-weight: 900;
  color: #2a5fb0;
}
/* ───── 兩大區塊 ───── */
main {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 24px;
}
section {
  min-height: 0;
  border-radius: 18px;
  background: var(--slate);
  border: 2px solid var(--edge);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    var(--o-shadow);
}
.phead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--edge);
}
.ptitle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 2px;
  color: var(--o-navy);
}
.pcount {
  font-size: 17px;
  font-weight: 700;
  color: var(--text3);
}

/* ───── 你的公司：三層 ───── */
.company {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
.layers {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lrow {
  --lc: #2563c9;
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  border-radius: 14px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--lc) 16%, transparent), transparent 30%),
    linear-gradient(color-mix(in srgb, var(--lc) 6%, transparent) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(90deg, color-mix(in srgb, var(--lc) 6%, transparent) 1px, transparent 1px) 0 0 / 24px 24px,
    var(--slate2);
  border: 2px solid color-mix(in srgb, var(--lc) 28%, var(--slate2));
  box-shadow: inset 0 3px 10px rgba(30, 50, 80, 0.06);
  transition:
    background 0.15s,
    border-color 0.15s,
    opacity 0.15s,
    box-shadow 0.15s;
}
.layer-2 {
  --lc: #1f9b84;
}
.layer-1 {
  --lc: #7c5cc4;
}
.lrow.good {
  border-color: color-mix(in srgb, var(--lc) 60%, #fff);
  box-shadow:
    inset 0 3px 10px rgba(30, 50, 80, 0.06),
    0 0 0 3px color-mix(in srgb, var(--lc) 18%, transparent);
}
.lrow.good.over {
  background: color-mix(in srgb, #2fb36f 12%, var(--slate));
  border-color: #2fb36f;
  box-shadow: 0 0 0 4px rgba(47, 179, 111, 0.22);
}
.lrow.bad {
  opacity: 0.5;
}
.lrow.bad.over {
  opacity: 1;
  background: color-mix(in srgb, #d4503f 9%, var(--slate));
  border-color: #d4503f;
}
.lname {
  flex: none;
  width: 104px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: color-mix(in srgb, var(--lc) 78%, #0b1426);
}
.lic {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(160deg, color-mix(in srgb, var(--lc) 85%, #fff), var(--lc));
  box-shadow: 0 3px 8px color-mix(in srgb, var(--lc) 35%, transparent);
}
.lname b {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 3px;
  text-indent: 3px;
}
.pips {
  display: flex;
  gap: 3px;
}
.pips i {
  width: 11px;
  height: 6px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--lc) 18%, var(--slate));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lc) 30%, transparent);
}
.pips i.on {
  background: var(--lc);
  box-shadow: none;
}
.chips {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  gap: 10px;
  padding: 12px 12px 12px 0;
}
.empty {
  font-size: 18px;
  font-weight: 700;
  color: var(--text3);
}

/* 公司裡的節點：迷你節點卡 */
.chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 222px;
  height: 74px;
  padding: 0 10px 0 8px;
  border-radius: 12px;
  cursor: grab;
  touch-action: none;
  background: linear-gradient(180deg, #fbfcfd, #eef1f5);
  border: 2px solid color-mix(in srgb, var(--hc) 45%, #fff);
  box-shadow:
    inset 4px 0 0 var(--hc),
    0 3px 8px rgba(30, 50, 80, 0.12);
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    opacity 0.15s;
}
.chip:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 4px 0 0 var(--hc),
    0 8px 16px rgba(30, 50, 80, 0.18);
}
.av {
  flex: none;
  overflow: hidden;
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--hc) 28%, #f4ecd8), color-mix(in srgb, var(--hc) 55%, #2a3347));
}
.chip .av {
  width: 54px;
  height: 54px;
  margin-left: 4px;
  border-radius: 11px;
  box-shadow: 0 0 0 2px #fff, 0 2px 5px rgba(20, 35, 60, 0.25);
}
.ct {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ct b {
  font-size: 19px;
  font-weight: 900;
  line-height: 1.35;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meta {
  display: flex;
  align-items: center;
  gap: 4px;
  color: color-mix(in srgb, var(--hc) 85%, #000);
}
em {
  font-style: normal;
  font-family: var(--font-num);
  font-weight: 800;
}
.meta em {
  padding: 0 6px;
  border-radius: 999px;
  font-size: 16px;
  line-height: 1.45;
}
.meta .pv {
  color: #fff;
  background: #2c8f66;
}
.meta .ps {
  color: #1d3557;
  background: #dbe5f3;
}
.meta .pc {
  color: #b42318;
  background: #fde8e5;
}
/* 等級標籤：壓在卡片上緣，頂規、王牌是金色 */
.tg {
  position: absolute;
  top: -10px;
  left: 14px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 900;
  line-height: 18px;
  letter-spacing: 1px;
  color: #fff;
  background: color-mix(in srgb, var(--hc) 85%, #0b1426);
  box-shadow: 0 1px 3px rgba(20, 35, 60, 0.3);
}
.chip.tier-1 .tg {
  color: var(--text2);
  background: #dfe5ec;
}
.chip.tier-3 .tg {
  color: #6b4c0f;
  background: linear-gradient(180deg, #fff1c4, #f2d994);
  box-shadow: 0 0 0 1px #d8b05a;
}
.x {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: #9aa7ba;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(20, 35, 60, 0.25);
  opacity: 0.75;
  transition:
    opacity 0.15s,
    background 0.15s;
}
.chip:hover .x {
  opacity: 1;
}
.x:hover {
  background: #d4503f;
}
.lifted {
  opacity: 0.3;
}

/* 還缺的必要節點：紅色虛線佔位，點一下跳到那個分頁 */
.ph {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 222px;
  height: 74px;
  padding: 0 12px;
  border-radius: 12px;
  text-align: left;
  color: #b42318;
  background: repeating-linear-gradient(135deg, rgba(212, 80, 63, 0.08) 0 8px, rgba(212, 80, 63, 0.02) 8px 16px);
  border: 2px dashed #d4705f;
  transition: background 0.15s;
}
.phic {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(212, 80, 63, 0.12);
  border: 2px dashed rgba(212, 80, 63, 0.5);
}
.ph span:last-child {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.ph b {
  font-size: 22px;
  font-weight: 900;
  line-height: 1.25;
}
.ph small {
  font-size: 16px;
  font-weight: 700;
  opacity: 0.8;
}
.ph:hover {
  background: rgba(212, 80, 63, 0.14);
}
.rowwarn {
  position: absolute;
  right: 10px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 17px;
  font-weight: 800;
  color: #fff;
  background: #d4503f;
  box-shadow: 0 4px 10px rgba(180, 35, 24, 0.3);
}

/* 節點進出公司 */
.chip-enter-active,
.chip-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.chip-enter-from {
  opacity: 0;
  transform: scale(0.85);
}
.chip-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
.chip-leave-active {
  position: absolute;
}

/* ───── 損益表與按鈕 ───── */
.summary {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
}
.ledger {
  padding: 12px 16px 10px;
  border-radius: 14px;
  background:
    repeating-linear-gradient(180deg, transparent 0 27px, rgba(29, 53, 87, 0.05) 27px 28px),
    linear-gradient(180deg, #fbfaf6, #f1ede2);
  border: 2px solid #d8d0bc;
  box-shadow: inset 0 1px 0 #fff;
}
.lhead {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 2px;
  color: #6b5426;
}
.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--ink2);
}
.line span {
  min-width: 0;
}
.line b {
  flex: none;
  font-family: var(--font-num);
  font-size: 21px;
  color: var(--ink);
}
.line.sub {
  padding-left: 12px;
  font-size: 16px;
}
.line.sub b {
  font-size: 19px;
}
.line.full b {
  color: #b7791f;
}
.line.warn {
  color: #a5600f;
}
.line .g {
  color: #1d8a55;
}
.line .r {
  color: #c2412f;
}
.line.tot {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 2px solid #cfc5ab;
  font-size: 20px;
  font-weight: 900;
  color: var(--ink);
}
.line.tot b {
  font-size: 34px;
  line-height: 1.05;
  color: #c2412f;
}
.line.tot b small {
  margin-left: 2px;
  font-size: 20px;
}
.line.tot.ok b {
  color: #1d8a55;
}
.goal {
  position: relative;
  margin: 8px 0 20px;
}
.track {
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  background: #e2dccb;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
}
.track i {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, #e07a5f, #d4503f);
  transition: width 0.35s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.goal.ok .track i {
  background: linear-gradient(90deg, #46b97e, #23935a);
}
.flag {
  position: absolute;
  top: -5px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding-top: 22px;
  transform: translateX(-2px);
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  color: #6b5426;
}
.flag::before {
  content: '';
  position: absolute;
  left: 1px;
  top: 0;
  width: 3px;
  height: 22px;
  border-radius: 2px;
  background: var(--o-navy);
}
.side {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
}
.errs {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 17px;
  font-weight: 700;
  color: #b42318;
}
.errs li,
.hint {
  display: flex;
  align-items: center;
  gap: 6px;
}
.hint {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text2);
}
.hint.ok {
  color: #1d8a55;
}
.rec {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 52px;
  border-radius: 12px;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 2px;
  color: var(--o-blue);
  background: linear-gradient(180deg, #f6f8fb, #e5ebf3);
  border: 2px solid color-mix(in srgb, var(--o-blue) 45%, var(--slate));
  box-shadow: 0 3px 0 color-mix(in srgb, var(--o-blue) 30%, var(--slate));
}
.rec:hover {
  background: color-mix(in srgb, var(--o-blue) 10%, var(--slate));
}
.rec:active,
.go:not(:disabled):active {
  transform: translateY(3px);
  box-shadow: none;
}
.go {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 72px;
  border-radius: 14px;
  font-size: 30px;
  font-weight: 900;
  letter-spacing: 6px;
  text-indent: 6px;
  color: #fff;
  background: linear-gradient(180deg, #3d70bf, var(--o-blue));
  border: 2px solid #1b4ea3;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 5px 0 #173f85,
    0 10px 18px rgba(30, 60, 120, 0.3);
}
.go:not(:disabled):hover {
  filter: brightness(1.06);
}
.go:disabled {
  color: #eef1f5;
  background: #a3b1c6;
  border-color: #8b9ab0;
  box-shadow: 0 5px 0 #7d8ba0;
  cursor: default;
}

/* ───── 人力市場 ───── */
.market {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.market.drop {
  border: 2px dashed #d4503f;
}
.market.over {
  background: #fbe9e6;
}
.tabs {
  display: flex;
  gap: 5px;
}
.tabs button {
  flex: 1 1 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 44px;
  padding: 0 6px 0 8px;
  border-radius: 10px;
  white-space: nowrap;
  font-size: 18px;
  font-weight: 800;
  color: var(--text2);
  background: var(--slate2);
  border: 2px solid var(--edge);
  transition:
    background 0.15s,
    color 0.15s;
}
.tabs button :deep(svg) {
  color: var(--hc);
}
.tabs button:hover {
  color: var(--o-navy);
  background: color-mix(in srgb, var(--hc) 8%, var(--slate));
}
/* 公司還缺這一類：分頁角落一個紅點 */
.tabs button {
  position: relative;
}
.need-dot {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #d4503f;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(180, 35, 24, 0.4);
}
.tabs button.on {
  color: #fff;
  background: linear-gradient(180deg, color-mix(in srgb, var(--hc) 88%, #fff), var(--hc));
  border-color: color-mix(in srgb, var(--hc) 80%, #000);
  box-shadow: 0 3px 8px color-mix(in srgb, var(--hc) 35%, transparent);
}
.tabs button.on :deep(svg) {
  color: #fff;
}
.effect {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text2);
  background: color-mix(in srgb, var(--hc) 7%, var(--slate2));
  border: 1.5px solid color-mix(in srgb, var(--hc) 22%, var(--slate2));
}
.eic {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--hc);
}
.effect b {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 19px;
  font-weight: 900;
  color: var(--o-navy);
}
.grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 12px;
  padding: 4px 6px 8px 2px;
}

/* 候選人：履歷卡 */
.cand {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  cursor: grab;
  touch-action: none;
  background: linear-gradient(180deg, #fbf8f0, #efe6d1);
  border: 2px solid color-mix(in srgb, var(--hc) 45%, #e2d6b8);
  box-shadow: 0 3px 8px rgba(30, 50, 80, 0.12);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.cand:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(30, 50, 80, 0.2);
}
.band {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px 0 10px;
  border-radius: 12px 12px 0 0;
  color: #fff;
  background: linear-gradient(180deg, color-mix(in srgb, var(--hc) 85%, #fff), var(--hc));
}
.stars {
  flex: 1;
  display: inline-flex;
  gap: 1px;
}
.stars :deep(svg) {
  color: rgba(255, 255, 255, 0.35);
}
.stars :deep(svg.on) {
  color: #ffe08a;
  fill: #ffd25e;
}
.tier {
  padding: 0 8px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 1px;
  color: color-mix(in srgb, var(--hc) 80%, #000);
  background: rgba(255, 255, 255, 0.88);
}
/* 頂規、王牌：金色的邊框 */
.cand.tier-3 {
  border-color: #d8b05a;
  box-shadow:
    0 0 0 1px #f2d994,
    0 3px 10px rgba(160, 120, 30, 0.25);
}
.cand.tier-3 .tier {
  color: #6b4c0f;
  background: linear-gradient(180deg, #fff1c4, #f2d994);
}
.body {
  flex: none;
  display: flex;
  gap: 12px;
  padding: 10px 12px 12px;
}
.cand .av {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  box-shadow: 0 0 0 2px #fff, 0 3px 6px rgba(20, 35, 60, 0.22);
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--ink);
}
.info b {
  font-size: 21px;
  font-weight: 900;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.seat {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 800;
  color: #1d3557;
  background: #dbe5f3;
}
.stat {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 800;
  color: var(--ink2);
}
.stat i {
  height: 7px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(28, 35, 50, 0.1);
}
.stat u {
  display: block;
  height: 100%;
  border-radius: 4px;
}
.stat.v u {
  background: linear-gradient(90deg, #6fcf9c, #2c8f66);
}
.stat.c u {
  background: linear-gradient(90deg, #f0a093, #d4503f);
}
.stat em {
  min-width: 46px;
  text-align: right;
  font-size: 17px;
}
.stat.v em {
  color: #1d8a55;
}
.stat.c em {
  color: #c2412f;
}
.stat.s u {
  background: linear-gradient(90deg, #8fb6ea, #2a5fb0);
}
.stat.s em {
  font-family: inherit;
  font-size: 14px;
  color: #2a5fb0;
}
.net {
  padding: 0 8px;
  border-radius: 999px;
  font-family: var(--font-num);
  font-size: 15px;
  font-weight: 800;
  line-height: 20px;
  color: #1d6e47;
  background: #e3f6ec;
}
.net.neg {
  color: #b42318;
  background: #fde8e5;
}
.none {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text3);
}
.dropmsg {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 19px;
  font-weight: 800;
  color: #fff;
  background: #d4503f;
  box-shadow: 0 6px 14px rgba(180, 35, 24, 0.3);
  pointer-events: none;
}

/* 拖曳中的節點 */
.ghost {
  position: absolute;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 16px 7px 7px;
  border-radius: 14px;
  transform: translate(-50%, -50%) rotate(-3deg);
  pointer-events: none;
  background: linear-gradient(180deg, #fbfcfd, #eef1f5);
  border: 3px solid var(--hc);
  box-shadow: 0 16px 30px rgba(30, 50, 80, 0.35);
}
.ghost .av {
  width: 52px;
  height: 52px;
  border-radius: 10px;
}
.ghost span {
  display: flex;
  flex-direction: column;
}
.ghost b {
  font-size: 20px;
  font-weight: 900;
  color: var(--ink);
}
.ghost small {
  font-size: 15px;
  font-weight: 800;
  color: color-mix(in srgb, var(--hc) 85%, #000);
}

/* ───── 提示 ───── */
.toast {
  position: absolute;
  left: 50%;
  top: 104px;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 999px;
  font-size: 20px;
  font-weight: 800;
  white-space: nowrap;
  color: #fff;
  background: #c2412f;
  box-shadow: 0 10px 22px rgba(120, 30, 20, 0.3);
  pointer-events: none;
}
.toast.info {
  background: linear-gradient(180deg, #2f5f9e, var(--o-navy));
  box-shadow: 0 10px 22px rgba(20, 40, 80, 0.3);
}
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
@media (prefers-reduced-motion: reduce) {
  .cand,
  .chip,
  .lrow,
  .track i {
    transition: none;
  }
}
</style>
