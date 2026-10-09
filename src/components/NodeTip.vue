<script setup lang="ts">
// 節點狀態與單格弱點分開顯示，避免滑過單格時帶出其他情報。
import { computed, onBeforeUnmount, onUpdated, ref, watch } from 'vue'
import { VULNS, repairTurnsOf } from '../game/data'
import { canRecon, etaOf, isImpregnable, reachKnown, recaptureBlock, recaptureSpeedOf, repairBlock, speedOf } from '../game/engine'
import { game, nodeRect, ui, view } from '../game/store'
import Icon from './Icon.vue'

const props = defineProps<{ nodeId?: string; slotIndex?: number }>()
const selectedSlotIndex = computed(() => {
  if (props.slotIndex !== undefined) return props.slotIndex
  if (props.nodeId || ui.drag) return undefined
  return ui.hoverSlot?.idx
})
const selectedNodeId = computed(() => {
  if (ui.drag) return null
  if (props.nodeId) return props.nodeId
  return ui.hoverSlot?.nodeId ?? ui.hoverNode
})
const node = computed(() => selectedNodeId.value ? game.s?.nodes.find((n) => n.id === selectedNodeId.value) ?? null : null)
const tipKind = computed(() => selectedSlotIndex.value === undefined ? 'node' : 'weakness')

// 實際高度由畫面量測，確保整張提示卡都留在視窗內
const tipEl = ref<HTMLElement | null>(null)
const tipH = ref(520)
let ro: ResizeObserver | null = null
watch(tipEl, (el) => {
  ro?.disconnect()
  ro = null
  if (!el) return
  tipH.value = el.offsetHeight
  ro = new ResizeObserver(() => {
    if (tipEl.value) tipH.value = tipEl.value.offsetHeight
  })
  ro.observe(el)
})
// 內容一更新就立刻重量，不等觀察器
onUpdated(() => {
  if (tipEl.value && tipEl.value.offsetHeight !== tipH.value) tipH.value = tipEl.value.offsetHeight
})
onBeforeUnmount(() => ro?.disconnect())

const pos = computed(() => {
  const n = node.value
  if (!n) return null
  const r = nodeRect(n.id)
  if (!r) return null
  const W = 400
  const right = r.cx < view.w / 2
  const x = right ? r.x + r.w + 16 : r.x - W - 16
  const lowest = view.h - tipH.value - 16
  const y = Math.max(16, Math.min(Math.max(100, r.y - 8), lowest))
  return { x, y, W }
})

const ABILITY: Record<string, { icon: string; text: string }> = {
  sales: { icon: 'zap', text: '每回合 +1 行動點' },
  engineer: { icon: 'zap', text: '每回合 +1 行動點' },
  boss: { icon: 'crown', text: '擴散牌費用 −1（最低 1）' },
  it: { icon: 'wrench', text: '公司的「修補」全部失效' },
  infra: { icon: 'bug', text: '再控制員工即可植入賽博病毒，每回合偷看 1 張' },
  ai: { icon: 'sparkles', text: '每回合免費打出 1 張費用 1 的牌' },
  db: { icon: 'crown', text: '多數任務的關鍵' },
  backup: { icon: 'database-backup', text: '阻礙系統奪回；未癱瘓時每回合多抽 1 張' },
}
const abilityText = computed(() => {
  const n = node.value
  if (!n) return ''
  return n.role === 'infra' && n.paralyzed > 0
    ? '網路中斷：公司修復與奪回暫停'
    : ABILITY[n.role].text
})

const speed = computed(() => (game.s ? speedOf(game.s) : 1))
const repairFrozen = computed(() => !!game.s && repairBlock(game.s) !== null)
const slotTip = computed(() => {
  const n = node.value
  const idx = selectedSlotIndex.value
  if (!n || idx === undefined || idx < 0 || idx >= n.slots.length) return null

  // NodeCard 只在這一格已顯示「無懈可擊」時才提供通用提示，不讀取其暗牌內容。
  const wallIdx = n.sealed && isImpregnable(n) ? n.slots.findIndex((sl) => sl.vis === 0) : -1
  if (idx === wallIdx) {
    return {
      kind: 'shield',
      name: '無懈可擊',
      icon: 'shield-check',
      text: '這個節點沒有任何可利用的弱點。',
      rule: '',
      status: '無懈可擊',
      repair: '',
    }
  }

  const sl = n.slots[idx]
  if (sl.vis === 0) return null
  const d = VULNS[sl.vuln]
  if (sl.shield) {
    return {
      kind: 'shield',
      name: d.shield,
      icon: 'shield-check',
      text: `本來就有防護：這裡沒有「${d.name}」的問題。`,
      rule: '',
      status: '已有防護',
      repair: '',
    }
  }
  if (sl.fixed) {
    return {
      kind: 'fixed',
      name: d.shield,
      icon: 'wrench',
      text: `公司在這一局裡修好了「${d.name}」。`,
      rule: '',
      status: '已修補',
      repair: '',
    }
  }

  const nullified = n.slots.some((other, otherIdx) => otherIdx !== idx && other.shield && other.vuln === sl.vuln && other.vis > 0)
  const repair = sl.timer !== undefined
    ? repairFrozen.value
      ? '修補倒數暫停中'
      : `公司約 ${etaOf(sl.timer, speed.value)} 回合後修補`
    : `公司約 ${repairTurnsOf(sl.vuln)} 回合後修補`
  return {
    kind: 'vuln',
    name: d.name,
    icon: d.icon,
    text: nullified ? `${d.desc}（已被防護牌抵銷，不能利用）` : d.desc,
    rule: d.rule ?? '',
    status: nullified ? '已抵銷' : '已揭露',
    repair,
  }
})
const controlTimer = computed(() => {
  const n = node.value
  if (!n?.controlled || !game.s) return null
  return recaptureBlock(game.s) !== null
    ? '奪回倒數暫停中'
    : `公司約 ${etaOf(n.timer, recaptureSpeedOf(game.s, n))} 回合後奪回`
})
const routeHint = computed(() => {
  const n = node.value
  if (tipKind.value !== 'node') return null
  if (!n || !game.s || n.layer === 0 || n.controlled) return null
  const route = reachKnown(game.s, n)
  if (route === 'Y') return null
  if (route === 'M') return {
    uncertain: false,
    text: canRecon(game.s, n)
      ? '攻擊入口尚未確認；此層可偵查，但目前不能指定目標。'
      : '攻擊入口尚未確認，此層也未開放偵查；目前不能指定目標。',
  }
  return {
    uncertain: false,
    text: `${canRecon(game.s, n) ? '此層可偵查；' : ''}${n.layer === 1 ? '需先控制任一外圍節點，' : '需先控制任一內網節點，'}目前不能指定目標。`,
  }
})
const visible = computed(() => !!node.value && !ui.drag && (tipKind.value === 'node' || slotTip.value !== null))
</script>

<template>
  <div
    v-if="visible && node && (props.nodeId || pos)"
    ref="tipEl"
    class="tip"
    :class="[tipKind === 'weakness' ? 'weakness-tip' : 'node-tip', { 'mobile-modal': !!props.nodeId }]"
    :data-tip-kind="tipKind"
    :style="!props.nodeId && pos ? { left: pos.x + 'px', top: pos.y + 'px', width: pos.W + 'px' } : undefined"
  >
    <template v-if="tipKind === 'node'">
      <div class="h">
        <b>{{ node.name }}</b>
        <span v-if="node.controlled" class="st ctrl">已控制</span>
        <span v-if="node.paralyzed !== 0" class="st para">癱瘓{{ node.paralyzed > 0 ? ` ${node.paralyzed} 回合` : '' }}</span>
        <span v-if="node.virus && node.controlled" class="st virus">病毒運作中</span>
      </div>
      <div class="ab" :class="{ on: node.controlled }">
        <Icon :name="ABILITY[node.role].icon" :size="22" :stroke="2.3" />
        <span>{{ node.role === 'infra' && node.paralyzed > 0 ? abilityText : `控制後：${abilityText}` }}</span>
      </div>
      <div v-if="controlTimer" class="nr">
        <Icon name="timer" :size="20" :stroke="2.4" />
        <span>{{ controlTimer }}</span>
      </div>
      <div v-if="routeHint" class="lk" :class="{ uncertain: routeHint.uncertain }">
        <span v-if="routeHint.uncertain" class="question" aria-hidden="true">?</span>
        <Icon v-else name="lock" :size="20" :stroke="2.4" />
        {{ routeHint.text }}
      </div>
    </template>
    <div v-else-if="slotTip" class="vr" :class="slotTip.kind">
      <Icon :name="slotTip.icon" :size="24" :stroke="2.3" />
      <div class="vt">
        <b>{{ slotTip.name }}</b>
        <span>{{ slotTip.text }}</span>
        <em v-if="slotTip.rule">規則：{{ slotTip.rule }}</em>
        <small v-if="slotTip.repair">{{ slotTip.repair }}</small>
      </div>
      <span v-if="slotTip.status === '已揭露'" class="vis pub" title="公司看得到，會開始修復倒數">
        <Icon name="eye" :size="16" :stroke="2.4" />{{ slotTip.status }}
      </span>
      <span v-else class="vis" :class="slotTip.kind === 'fixed' ? 'fixed-status' : 'protected-status'">{{ slotTip.status }}</span>
    </div>
  </div>
</template>

<style scoped>
.tip {
  position: absolute;
  z-index: 55;
  padding: 16px 18px;
  border-radius: 14px;
  background: #151b27;
  border: 3px solid var(--edge2);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.65);
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 19px;
  line-height: 1.5;
}
.tip.mobile-modal {
  position: relative;
  z-index: auto;
  width: auto;
  max-height: none;
  overflow: visible;
  padding: 12px;
  gap: 8px;
  box-shadow: none;
  pointer-events: auto;
  font-size: 15px;
}
.tip.mobile-modal .h {
  font-size: 20px;
}
.tip.mobile-modal .vr {
  gap: 8px;
  padding: 8px;
}
.tip.mobile-modal .vt b {
  font-size: 16px;
}
.tip.mobile-modal .vt span,
.tip.mobile-modal .vt em,
.tip.mobile-modal .vt small,
.tip.mobile-modal .nr span {
  font-size: 14px;
}
.tip.mobile-modal .st,
.tip.mobile-modal .vis,
.tip.mobile-modal .lk {
  font-size: 14px;
}
.h {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 26px;
}
.st {
  padding: 1px 12px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 900;
  color: #fff;
}
.st.ctrl {
  background: var(--good);
}
.st.para {
  background: #4a8cc0;
}
.st.virus {
  background: #2f6e55;
}
.ab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 9px;
  color: var(--text2);
  background: #1e2738;
  border: 2px dashed #46587a;
}
.ab.on {
  color: #fff;
  background: #25704f;
  border: 2px solid var(--good);
}
.lk {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f2c25e;
  font-weight: 900;
}
.lk.uncertain {
  color: #f0d28a;
}
.question {
  flex: none;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 2px solid currentColor;
  border-radius: 50%;
  font-size: 14px;
  line-height: 1;
}
.vr {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 9px;
  color: var(--ink);
  background: var(--paper);
  border-left: 7px solid var(--k-employee);
}
.vr.shield {
  background: #cdeadf;
  color: #0d4a3a;
  border-left-color: #2b9c78;
}
.vr.fixed {
  background: #cfe0f5;
  color: #12365f;
  border-left-color: #3d6fa8;
}
.vr.struck {
  opacity: 0.7;
  background: #cfc8b4;
  border-left-color: #8e8a7c;
}
.vr.struck b {
  text-decoration: line-through;
}
.vt {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.vt b {
  font-size: 20px;
}
.vt span {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink2);
}
.vt small {
  margin-top: 2px;
  font-size: 15px;
  font-weight: 700;
  color: #6a4a1c;
}
.nr {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 9px;
  color: #fff;
  background: #3a2e2a;
  border: 2px solid #7a4a3a;
}
.nr span {
  display: flex;
  flex-direction: column;
  font-weight: 900;
}
.vt em {
  font-style: normal;
  font-size: 16px;
  font-weight: 900;
  color: #8a5a1c;
}
.vis {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 9px 1px 6px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 900;
  color: #fff;
}
.vis.pub {
  background: #c8402f;
}
.vis.protected-status {
  background: #2b9c78;
}
.vis.fixed-status {
  background: #3d6fa8;
}
</style>
