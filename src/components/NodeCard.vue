<script setup lang="ts">
// 公司裡的一個節點（員工、AI、設備、資料……）
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { VULNS } from '../game/data'
import { etaOf, reachKnown, recaptureBlock, repairBlock, speedOf } from '../game/engine'
import { game, registerNode, ui } from '../game/store'
import type { GameNode, VulnId } from '../game/types'
import Icon from './Icon.vue'
import NodeArt from './NodeArt.vue'

const props = defineProps<{ node: GameNode }>()
const el = ref<HTMLElement | null>(null)

onMounted(() => registerNode(props.node.id, el.value))
onBeforeUnmount(() => registerNode(props.node.id, null))

const KIND_LABEL = { employee: '員工', infra: '設備', ai: 'AI', data: '資料' } as const
const KIND_ICON = { employee: 'user-round', infra: 'server', ai: 'cpu', data: 'database' } as const

const n = computed(() => props.node)

// 命中時疊在節點上的特效種類（capture / infect / pulse / paralyze / fail / recapture / restore）
const fxType = computed(() => ui.nodeFx[props.node.id] ?? '')
const BUGS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + 0.3
  const d = 92 + (i % 3) * 22
  return { dx: Math.round(Math.cos(a) * d * 1.25), dy: Math.round(Math.sin(a) * d * 0.8), delay: i * 28 }
})

const ability = computed(() => {
  const nd = n.value
  if (nd.kind === 'employee' && nd.role !== 'it') return { icon: 'zap', text: '+1' }
  if (nd.role === 'it') return { icon: 'wrench', text: '' }
  if (nd.role === 'infra') return { icon: 'bug', text: '' }
  if (nd.role === 'ai') return { icon: 'sparkles', text: '' }
  return null
})

// 公司的倒數：回合數、是否被 IT 卡住
const speed = computed(() => (game.s ? speedOf(game.s) : 1))
const rFrozen = computed(() => !!game.s && repairBlock(game.s) !== null)
const cFrozen = computed(() => !!game.s && recaptureBlock(game.s) !== null)
const recapEta = computed(() => etaOf(n.value.timer, speed.value))
const restoreEta = computed(() => etaOf(n.value.paralyzed, speed.value))

const locked = computed(() => {
  if (!game.s || n.value.layer === 0 || n.value.controlled) return false
  return reachKnown(game.s, n.value) !== 'Y'
})

interface SlotView {
  idx: number
  state: 'hidden' | 'vuln' | 'struck' | 'shield' | 'fixed'
  name: string
  icon: string
  vis: 0 | 1 | 2
  kind: string
  fx: string
  /** 公開的弱點：公司修復的倒數（回合） */
  eta: number
}

const slots = computed<SlotView[]>(() =>
  n.value.slots.map((sl, idx) => {
    const d = VULNS[sl.vuln]
    const fx = ui.slotFx[n.value.id + ':' + idx] ?? ''
    if (sl.vis === 0) return { idx, state: 'hidden', name: '', icon: '', vis: 0, kind: d.kind, fx, eta: 0 }
    if (sl.shield)
      return { idx, state: 'shield', name: d.shield, icon: 'shield-check', vis: sl.vis, kind: d.kind, fx, eta: 0 }
    if (sl.fixed)
      return { idx, state: 'fixed', name: d.shield, icon: 'wrench', vis: 2, kind: d.kind, fx, eta: 0 }
    const nullified = n.value.slots.some((o) => o.shield && o.vuln === sl.vuln && o.vis > 0)
    return {
      idx,
      state: nullified ? 'struck' : 'vuln',
      name: d.name,
      icon: d.icon,
      vis: sl.vis,
      kind: d.kind,
      fx,
      eta: sl.vis === 2 && sl.timer !== undefined ? etaOf(sl.timer, speed.value) : 0,
    }
  }),
)

const excluded = computed(() => (Object.keys(n.value.excluded) as VulnId[]).filter((v) => !hasSlotFor(v)))
function hasSlotFor(v: VulnId) {
  return n.value.slots.some((s) => s.vuln === v && s.vis > 0)
}

// 拖曳時的目標提示
const drag = computed(() => (ui.drag && ui.drag.moved ? ui.drag : null))
const dragClass = computed(() => {
  const d = drag.value
  if (!d) return ''
  if (d.mode === 'node') {
    const tri = d.pb.targets[n.value.id]
    if (!tri) return 'drag-invalid'
    return (tri === 'Y' ? 'drag-sure' : 'drag-maybe') + (d.overNode === n.value.id ? ' drag-over' : '')
  }
  if (d.pb.hint.includes(n.value.id)) return d.pb.status === 'sure' ? 'drag-sure drag-hint' : 'drag-maybe drag-hint'
  return 'drag-quiet'
})

function enter() {
  if (!ui.drag) ui.hoverNode = n.value.id
}
function leave() {
  if (ui.hoverNode === n.value.id) ui.hoverNode = null
}
</script>

<template>
  <div
    ref="el"
    class="node"
    :class="[
      'kind-' + n.kind,
      dragClass,
      ui.nodeFx[n.id] ? 'fx-' + ui.nodeFx[n.id] : '',
      { ctrl: n.controlled, para: n.paralyzed > 0, locked, infected: n.virus && n.controlled },
    ]"
    @pointerenter="enter"
    @pointerleave="leave"
  >
    <div class="head">
      <div class="avatar">
        <NodeArt :role="n.role" />
        <div v-if="locked" class="lock"><Icon name="lock" :size="16" :stroke="2.6" /></div>
        <div v-if="n.controlled" class="hack"><Icon name="skull" :size="15" :stroke="2.6" /></div>
      </div>
      <div class="info">
        <div class="name">{{ n.name }}</div>
        <div class="sub">
          <span class="kind"><Icon :name="KIND_ICON[n.kind]" :size="16" :stroke="2.4" />{{ KIND_LABEL[n.kind] }}</span>
          <span v-if="n.controlled" class="pill ctrl" title="公司奪回的倒數">
            已控制<span class="eta" :key="recapEta">
              <Icon :name="cFrozen ? 'snowflake' : 'timer'" :size="14" :stroke="2.6" />{{ cFrozen ? '' : recapEta }}
            </span>
          </span>
          <span v-if="n.paralyzed > 0" class="pill para">
            <Icon name="snowflake" :size="14" :stroke="2.6" />癱瘓
            <template v-if="n.role === 'it'"> {{ n.paralyzed }} 回</template>
            <span v-else class="eta" :key="restoreEta">
              <Icon :name="rFrozen ? 'snowflake' : 'timer'" :size="14" :stroke="2.6" />{{ rFrozen ? '' : restoreEta }}
            </span>
          </span>
          <span v-if="n.virus && n.controlled" class="pill virus"><Icon name="bug" :size="14" :stroke="2.6" />病毒</span>
        </div>
      </div>
      <div v-if="ability" class="ability" :class="{ on: n.controlled && (n.role !== 'infra' || n.virus) }">
        <Icon :name="ability.icon" :size="18" :stroke="2.4" />
        <b v-if="ability.text">{{ ability.text }}</b>
        <i v-if="n.role === 'it'" class="slash"></i>
      </div>
      <div v-if="excluded.length" class="excl">
        <span v-for="v in excluded" :key="v" class="ex-ico">
          <Icon :name="VULNS[v].icon" :size="15" :stroke="2.2" /><i></i>
        </span>
      </div>
    </div>

    <div class="slots">
      <div
        v-for="s in slots"
        :key="s.idx"
        class="slot"
        :class="['st-' + s.state, 'k-' + s.kind, s.fx ? 'sfx-' + s.fx : '', { sealed: s.state === 'hidden' && n.sealed }]"
      >
        <template v-if="s.state === 'hidden'">
          <span class="q">{{ n.sealed ? '—' : '?' }}</span>
        </template>
        <template v-else>
          <Icon :name="s.icon" :size="20" :stroke="2.3" class="sic" />
          <span class="sname">{{ s.name }}</span>
          <span
            v-if="s.state === 'vuln' || s.state === 'struck'"
            class="mark"
            :class="s.vis === 2 ? 'pub' : 'priv'"
            :title="s.vis === 2 ? '公司看得到：倒數歸零就會被修復' : '只有你知道'"
          >
            <Icon :name="s.vis === 2 ? 'eye' : 'ghost'" :size="15" :stroke="2.6" />
            <template v-if="s.vis === 2 && s.eta">
              <Icon v-if="rFrozen" name="snowflake" :size="14" :stroke="2.6" />
              <b v-else :key="s.eta">{{ s.eta }}</b>
            </template>
          </span>
          <span v-else-if="s.state === 'fixed'" class="mark fix"><Icon name="wrench" :size="14" :stroke="2.6" /></span>
        </template>
      </div>
    </div>

    <div v-if="n.paralyzed > 0" class="freeze"></div>

    <!-- 被病毒感染：髒綠色的斑點在卡面上飄、小蟲沿著邊框爬 -->
    <template v-if="n.virus && n.controlled">
      <div class="vbg"><i class="spot s1"></i><i class="spot s2"></i><i class="spot s3"></i></div>
      <div class="viral">
        <i class="crawl c1"><Icon name="bug" :size="22" :stroke="2.4" /></i>
        <i class="crawl c2"><Icon name="bug" :size="22" :stroke="2.4" /></i>
        <i class="crawl c3"><Icon name="bug" :size="22" :stroke="2.4" /></i>
      </div>
    </template>

    <!-- 命中的瞬間：節點上的衝擊特效 -->
    <div v-if="fxType" :key="fxType" class="fxo" :class="'o-' + fxType">
      <template v-if="fxType === 'capture'">
        <i class="wave"></i><i class="wave w2"></i>
        <i class="glt g1"></i><i class="glt g2"></i><i class="glt g3"></i>
        <span class="big"><Icon name="skull" :size="78" :stroke="2" /></span>
      </template>
      <template v-else-if="fxType === 'infect'">
        <i class="wave"></i><i class="wave w2"></i>
        <i class="glt g1"></i><i class="glt g2"></i><i class="glt g3"></i>
        <i v-for="(b, i) in BUGS" :key="i" class="scat" :style="{ '--dx': b.dx + 'px', '--dy': b.dy + 'px', animationDelay: b.delay + 'ms' }">
          <Icon name="bug" :size="30" :stroke="2.4" />
        </i>
      </template>
      <template v-else-if="fxType === 'pulse'">
        <i class="wave"></i><i class="wave w2"></i><i class="wave w3"></i>
      </template>
      <template v-else-if="fxType === 'paralyze' || fxType === 'restore'">
        <i class="frost"></i><i class="wave"></i>
        <span class="big"><Icon :name="fxType === 'paralyze' ? 'snowflake' : 'database-backup'" :size="78" :stroke="2" /></span>
      </template>
      <template v-else-if="fxType === 'fail' || fxType === 'recapture'">
        <i class="redflash"></i>
        <span class="big"><Icon :name="fxType === 'fail' ? 'shield-x' : 'shield-alert'" :size="72" :stroke="2" /></span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.node {
  --kc: var(--k-employee);
  --kd: color-mix(in srgb, var(--kc) 55%, #0c1018);
  position: relative;
  flex: 1 1 0;
  min-width: 180px;
  max-width: 292px;
  height: 200px;
  border-radius: 13px;
  border: 3px solid var(--kd);
  background: var(--slate);
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  transition:
    transform 0.18s ease,
    filter 0.2s ease,
    box-shadow 0.2s ease;
}
.kind-employee {
  --kc: var(--k-employee);
}
.kind-infra {
  --kc: var(--k-infra);
}
.kind-ai {
  --kc: var(--k-ai);
}
.kind-data {
  --kc: var(--k-data);
}

.head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 70px;
  padding: 0 12px;
  border-radius: 9px 9px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--kc) 78%, #141a25), var(--kd));
  border-bottom: 3px solid var(--gold3);
}
.avatar {
  position: relative;
  flex: none;
  width: 54px;
  height: 54px;
  border-radius: 12px;
  overflow: visible;
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--kc) 40%, #e8dfc6), color-mix(in srgb, var(--kc) 35%, #1a2030));
  box-shadow:
    0 0 0 2px var(--gold),
    0 3px 6px rgba(0, 0, 0, 0.45);
}
.avatar :deep(.art) {
  border-radius: 12px;
}
.lock {
  position: absolute;
  right: -8px;
  bottom: -8px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: #a66a14;
  border: 2px solid var(--gold2);
}
.info {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 22px;
  font-weight: 900;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
}
.sub {
  margin-top: 5px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}
.kind {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.82);
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 8px 0 6px;
  border-radius: 6px;
  font-size: 14.5px;
  font-weight: 900;
  line-height: 1.5;
  color: #fff;
}
.pill.ctrl {
  background: #1d8a5c;
  border: 1.5px solid var(--good2);
}
.pill.para {
  background: #3f86bd;
  border: 1.5px solid #bfe4f8;
}
.pill.virus {
  background: #2f6e55;
  border: 1.5px solid var(--good2);
}
.ability {
  position: absolute;
  right: -8px;
  top: -10px;
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border-radius: 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #aab6cc;
  background: #1a2231;
  border: 2px dashed #5a6b8c;
  font-family: var(--font-num);
  font-size: 17px;
  z-index: 2;
}
.ability b {
  font-weight: 700;
}
.ability.on {
  color: #fff;
  background: var(--good);
  border: 2px solid var(--good2);
}
.slash {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 28px;
  height: 3px;
  margin: -1.5px 0 0 -14px;
  background: currentColor;
  transform: rotate(-45deg);
  box-shadow: 0 0 0 2px #1a2231;
}
.excl {
  position: absolute;
  right: 8px;
  bottom: 6px;
  display: flex;
  gap: 4px;
}
.ex-ico {
  position: relative;
  display: grid;
  place-items: center;
  width: 24px;
  height: 22px;
  border-radius: 5px;
  color: #cfd8e8;
  background: rgba(10, 14, 22, 0.6);
}
.ex-ico i {
  position: absolute;
  left: 2px;
  right: 2px;
  top: 50%;
  height: 2.5px;
  background: #ff7a68;
  transform: rotate(-35deg);
}

.slots {
  padding: 9px 10px 0;
  display: grid;
  gap: 5px;
}
.slot {
  position: relative;
  height: 33px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 12px;
  border-radius: 7px;
  font-size: 17px;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
}
.slot.k-employee {
  --sc: var(--k-employee);
}
.slot.k-infra {
  --sc: var(--k-infra);
}
.slot.k-ai {
  --sc: var(--k-ai);
}
.slot.k-data {
  --sc: var(--k-data);
}
.st-hidden {
  justify-content: center;
  background: #18202d;
  box-shadow: inset 0 0 0 1.5px #2f3b52;
}
.st-hidden .q {
  font-size: 20px;
  font-weight: 900;
  color: #566580;
}
.st-vuln {
  color: var(--ink);
  background: var(--paper);
  box-shadow: inset 6px 0 0 var(--sc);
}
.st-vuln .sic {
  color: var(--sc);
}
.st-struck {
  color: #7c7a70;
  background: #cfc8b4;
  box-shadow: inset 6px 0 0 #8e8a7c;
}
.st-struck .sname {
  text-decoration: line-through;
  text-decoration-thickness: 2.5px;
}
.st-shield,
.st-fixed {
  font-size: 16.5px;
  color: #0d4a3a;
  background: #cdeadf;
  box-shadow: inset 6px 0 0 #2b9c78;
}
.st-shield .sic,
.st-fixed .sic {
  color: #1f7f62;
}
.sname {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mark {
  flex: none;
  min-width: 24px;
  height: 24px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 5px;
  color: #fff;
}
.mark b {
  font-family: var(--font-num);
  font-size: 19px;
  font-weight: 700;
  line-height: 1;
  padding-right: 3px;
  animation: tick 0.5s ease-out;
}
@keyframes tick {
  from {
    transform: scale(1.5);
  }
  to {
    transform: none;
  }
}
.mark.pub {
  background: #c8402f;
}
.mark.priv {
  background: #2f9a6c;
}
.mark.fix {
  background: #3d6fa8;
}

/* 已控制 */
.ctrl {
  --kd: #1f6e4d;
  border-color: var(--good);
  background: linear-gradient(180deg, #1d4a3a, #13332b 60%, #0f2923);
  box-shadow:
    0 0 0 3px rgba(134, 226, 182, 0.55),
    0 0 26px rgba(63, 174, 124, 0.38),
    0 8px 16px rgba(0, 0, 0, 0.5);
}
.ctrl .head {
  background: linear-gradient(180deg, #3aa070, #1f6e4d);
}
.ctrl .avatar {
  box-shadow:
    0 0 0 3px var(--good2),
    0 3px 6px rgba(0, 0, 0, 0.45);
}
.hack {
  position: absolute;
  right: -9px;
  bottom: -9px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: #1d8a5c;
  border: 2px solid var(--good2);
}
.pill .eta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 3px;
  padding: 0 6px 0 4px;
  border-radius: 7px;
  font-family: var(--font-num);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.25;
  background: rgba(0, 0, 0, 0.3);
  animation: tick 0.5s ease-out;
}
.st-hidden.sealed {
  background: #141a25;
  box-shadow: inset 0 0 0 1.5px #232d3f;
}
.st-hidden.sealed .q {
  color: #3a4660;
  font-weight: 700;
}

/* 癱瘓 */
.para {
  border-color: #8fc9ea;
}
.freeze {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: rgba(100, 165, 215, 0.28);
  pointer-events: none;
}

.locked:not(.drag-sure):not(.drag-maybe):not(.drag-invalid):not(.drag-quiet) {
  filter: brightness(0.82) saturate(0.85);
}

/* 拖曳牌時的目標提示 */
.drag-invalid,
.drag-quiet {
  filter: brightness(0.5) saturate(0.4);
}
.drag-sure,
.drag-maybe {
  border-color: var(--tg);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--tg) 45%, transparent),
    0 8px 16px rgba(0, 0, 0, 0.5);
}
.drag-sure {
  --tg: #5fd99a;
}
.drag-maybe {
  --tg: #f0b440;
}
.drag-over {
  transform: translateY(-6px) scale(1.04);
  z-index: 5;
  box-shadow:
    0 0 0 6px var(--tg),
    0 14px 24px rgba(0, 0, 0, 0.6);
}

/* ───────── 被病毒感染（持續） ───────── */
.infected {
  border-color: #8ad65a;
  box-shadow:
    0 0 0 3px rgba(138, 214, 90, 0.5),
    0 0 30px rgba(138, 214, 90, 0.4),
    0 8px 16px rgba(0, 0, 0, 0.5);
  animation: infect-pulse 2.4s ease-in-out infinite;
}
@keyframes infect-pulse {
  50% {
    box-shadow:
      0 0 0 5px rgba(138, 214, 90, 0.7),
      0 0 44px rgba(138, 214, 90, 0.6),
      0 8px 16px rgba(0, 0, 0, 0.5);
  }
}
.infected .avatar {
  animation: glitch 3.4s infinite;
}
.infected .name {
  animation: glitch-text 3.4s infinite;
}
@keyframes glitch {
  0%,
  88%,
  100% {
    transform: none;
    filter: none;
  }
  90% {
    transform: translate(-3px, 1px);
    filter: hue-rotate(70deg) saturate(1.6);
  }
  93% {
    transform: translate(3px, -1px) skewX(8deg);
  }
  96% {
    transform: translate(-1px, 0);
    filter: hue-rotate(-50deg) saturate(2);
  }
}
@keyframes glitch-text {
  0%,
  88%,
  100% {
    transform: none;
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
  }
  91% {
    transform: translateX(3px);
    text-shadow:
      -3px 0 #ff4f6a,
      3px 0 #4fe0ff;
  }
  95% {
    transform: translateX(-2px);
    text-shadow:
      2px 0 #ff4f6a,
      -2px 0 #4fe0ff;
  }
}
.vbg {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  overflow: hidden;
  pointer-events: none;
}
.spot {
  position: absolute;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(170, 255, 110, 0.38), rgba(170, 255, 110, 0) 70%);
  animation: drift 6s ease-in-out infinite alternate;
}
.spot.s1 {
  left: -30px;
  top: 40px;
}
.spot.s2 {
  right: -34px;
  top: 90px;
  animation-delay: -2s;
  animation-duration: 7.5s;
}
.spot.s3 {
  left: 60px;
  top: 120px;
  animation-delay: -4s;
  animation-duration: 5s;
}
@keyframes drift {
  from {
    transform: translate(0, 0) scale(0.9);
  }
  to {
    transform: translate(34px, -26px) scale(1.25);
  }
}
.viral {
  position: absolute;
  inset: -3px;
  pointer-events: none;
}
.crawl {
  position: absolute;
  left: 0;
  top: 0;
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  display: grid;
  place-items: center;
  color: #b8ff7a;
  filter: drop-shadow(0 0 5px #5fd04a) drop-shadow(0 2px 0 rgba(0, 0, 0, 0.5));
  offset-path: inset(0px round 13px);
  offset-rotate: auto 90deg;
  offset-distance: 0%;
  animation: crawl 7s linear infinite;
}
.crawl.c2 {
  animation-delay: -2.4s;
  animation-duration: 8.5s;
}
.crawl.c3 {
  animation-delay: -4.8s;
  animation-direction: reverse;
}
@keyframes crawl {
  to {
    offset-distance: 100%;
  }
}

/* ───────── 命中時的衝擊特效 ───────── */
.fxo {
  --fc: #5fe0a0;
  position: absolute;
  inset: -3px;
  z-index: 4;
  pointer-events: none;
  border-radius: 13px;
}
.o-infect,
.o-pulse {
  --fc: #7ee06a;
}
.o-paralyze,
.o-restore {
  --fc: #8fd0f5;
}
.o-fail,
.o-recapture {
  --fc: #ff6a55;
}
.wave {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  border-radius: 50%;
  border: 7px solid var(--fc);
  box-shadow:
    0 0 22px var(--fc),
    inset 0 0 22px var(--fc);
  animation: wave-out 0.85s ease-out both;
}
.wave.w2 {
  animation-delay: 0.16s;
}
.wave.w3 {
  animation-delay: 0.32s;
}
@keyframes wave-out {
  from {
    transform: scale(0.15);
    opacity: 1;
  }
  to {
    transform: scale(3.4);
    opacity: 0;
  }
}
.glt {
  position: absolute;
  height: 7px;
  background: var(--fc);
  opacity: 0;
  animation: glt 0.7s steps(1) both;
}
.glt.g1 {
  left: 4%;
  top: 22%;
  width: 62%;
}
.glt.g2 {
  left: 30%;
  top: 52%;
  width: 66%;
  animation-delay: 0.07s;
}
.glt.g3 {
  left: 10%;
  top: 80%;
  width: 46%;
  animation-delay: 0.14s;
}
@keyframes glt {
  0% {
    opacity: 0.95;
    transform: translateX(-16px);
  }
  20% {
    opacity: 0;
  }
  40% {
    opacity: 0.9;
    transform: translateX(14px);
  }
  60% {
    opacity: 0;
  }
  80% {
    opacity: 0.8;
    transform: translateX(-6px);
  }
  100% {
    opacity: 0;
  }
}
.big {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  filter: drop-shadow(0 0 14px var(--fc)) drop-shadow(0 4px 0 rgba(0, 0, 0, 0.45));
  transform: translate(-50%, -50%) scale(0);
  animation: big-pop 1.3s ease-out both;
}
@keyframes big-pop {
  0% {
    transform: translate(-50%, -50%) scale(0) rotate(-25deg);
    opacity: 0;
  }
  16% {
    transform: translate(-50%, -50%) scale(1.3) rotate(4deg);
    opacity: 1;
  }
  26% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
  74% {
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.12);
    opacity: 0;
  }
}
.scat {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  place-items: center;
  color: #b8ff7a;
  filter: drop-shadow(0 0 6px #5fd04a);
  animation: scatter 1.2s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}
@keyframes scatter {
  0% {
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.1) rotate(160deg);
    opacity: 0;
  }
}
.frost {
  position: absolute;
  inset: 3px;
  border-radius: 10px;
  background: radial-gradient(ellipse at center, rgba(205, 238, 255, 0.1) 25%, rgba(205, 238, 255, 0.92) 100%);
  animation: frost-in 1.4s ease-out both;
}
@keyframes frost-in {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  25% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
  }
}
.redflash {
  position: absolute;
  inset: 3px;
  border-radius: 10px;
  background: radial-gradient(ellipse at center, rgba(255, 90, 70, 0.55), rgba(255, 60, 40, 0.15) 70%);
  animation: red-flash 0.8s ease-out both;
}
@keyframes red-flash {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
.fx-infect {
  animation: fx-capture 1.1s ease-out;
}
.fx-pulse {
  animation: fx-pulse 1s ease-out;
}
@keyframes fx-pulse {
  0% {
    filter: brightness(1.6) hue-rotate(40deg) saturate(1.5);
  }
  100% {
    filter: none;
  }
}

/* 特效 */
.fx-capture {
  animation: fx-capture 1s ease-out;
}
.fx-fail {
  animation: fx-fail 0.7s ease-out;
}
.fx-recapture {
  animation: fx-recapture 1s ease-out;
}
.fx-paralyze,
.fx-restore {
  animation: fx-para 1s ease-out;
}
.fx-virus {
  animation: fx-capture 0.9s ease-out;
}
.fx-enter {
  animation: fx-enter 0.8s cubic-bezier(0.2, 1.3, 0.4, 1);
}
@keyframes fx-capture {
  0% {
    filter: brightness(1.9) saturate(1.5);
  }
  15% {
    transform: translateX(-6px);
  }
  30% {
    transform: translateX(6px);
  }
  45% {
    transform: translateX(-3px);
  }
  100% {
    filter: none;
    transform: none;
  }
}
@keyframes fx-fail {
  0% {
    filter: brightness(1.4) sepia(1) hue-rotate(-40deg) saturate(3);
  }
  25% {
    transform: translateX(-7px);
  }
  50% {
    transform: translateX(6px);
  }
  100% {
    filter: none;
    transform: none;
  }
}
@keyframes fx-recapture {
  0% {
    filter: brightness(1.7) sepia(1) hue-rotate(-50deg) saturate(4);
    transform: scale(1.04);
  }
  100% {
    filter: none;
    transform: none;
  }
}
@keyframes fx-para {
  0% {
    filter: brightness(1.8) hue-rotate(160deg);
  }
  100% {
    filter: none;
  }
}
@keyframes fx-enter {
  0% {
    transform: scale(0.5) translateY(-30px);
    opacity: 0;
  }
  100% {
    transform: none;
    opacity: 1;
  }
}

.sfx-reveal {
  animation: slot-reveal 0.9s ease-out;
}
.sfx-patch {
  animation: slot-patch 1.2s ease-out;
}
/* 病毒回報翻開的那一格：亮綠色邊框閃一下 */
.sfx-virus {
  animation:
    slot-reveal 0.9s ease-out,
    slot-virus 1.8s ease-out;
}
@keyframes slot-virus {
  0% {
    box-shadow:
      inset 6px 0 0 var(--sc),
      0 0 0 5px #8ee06a,
      0 0 26px #8ee06a;
  }
  60% {
    box-shadow:
      inset 6px 0 0 var(--sc),
      0 0 0 4px #8ee06a,
      0 0 18px #8ee06a;
  }
}
@keyframes slot-reveal {
  0% {
    transform: scaleY(0.2);
    filter: brightness(2.5);
  }
  50% {
    transform: scaleY(1.15);
  }
  100% {
    transform: none;
    filter: none;
  }
}
@keyframes slot-patch {
  0% {
    transform: scale(1.05);
    filter: brightness(1.6) hue-rotate(-100deg);
  }
  100% {
    transform: none;
    filter: none;
  }
}

/* 公司在遊戲中修好的弱點：用藍色＋扳手，和「開局就有的防護」（綠色）分開 */
.st-fixed {
  color: #12365f;
  background: #cfe0f5;
  box-shadow: inset 6px 0 0 #3d6fa8;
}
.st-fixed .sic {
  color: #2a5c9a;
}
</style>
