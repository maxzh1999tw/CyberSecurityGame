<script setup lang="ts">
// 滑過節點時顯示的詳細資訊
import { computed, onBeforeUnmount, onUpdated, ref, watch } from 'vue'
import { NODE_RISK, VULNS, VULN_RISK, recaptureTurnsOf, repairTurnsOf } from '../game/data'
import { etaOf, isImpregnable, reachKnown, recaptureBlock, repairBlock, speedOf } from '../game/engine'
import { game, nodeRect, ui, view } from '../game/store'
import type { VulnId } from '../game/types'
import Icon from './Icon.vue'

const node = computed(() => (ui.hoverNode && !ui.drag ? game.s?.nodes.find((n) => n.id === ui.hoverNode) ?? null : null))

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
  boss: { icon: 'zap', text: '每回合 +1 行動點' },
  it: { icon: 'wrench', text: '公司的「修補」全部失效' },
  infra: { icon: 'bug', text: '可打出賽博病毒，之後每回合偷看 1 張' },
  ai: { icon: 'sparkles', text: '每回合免費打出 1 張費用 1 的牌' },
  db: { icon: 'crown', text: '多數任務的關鍵' },
  backup: { icon: 'crown', text: '多數任務的關鍵' },
}

// 完全沒有弱點、而且已經被偵查牌翻過：其中一格是「無懈可擊」
const wall = computed(() => !!node.value && node.value.sealed && isImpregnable(node.value) && node.value.slots.some((sl) => sl.vis === 0))

const rows = computed(() => {
  const n = node.value
  if (!n) return []
  const list = n.slots
    .filter((sl) => sl.vis > 0)
    .map((sl) => {
      const d = VULNS[sl.vuln]
      const none = { risk: '', eta: '' }
      if (sl.shield)
        return { kind: 'shield' as const, name: d.shield, icon: 'shield-check', text: `本來就有防護：這裡沒有「${d.name}」的問題`, rule: '', vis: sl.vis, ...none }
      if (sl.fixed)
        return { kind: 'fixed' as const, name: d.shield, icon: 'wrench', text: `公司在這一局裡修好了「${d.name}」`, rule: '', vis: 2 as const, ...none }
      const r = VULN_RISK[sl.vuln]
      const risk = `顯眼 ${dots(r.notice)}　嚴重 ${dots(r.severe)}`
      const eta =
        sl.vis === 2 && sl.timer !== undefined
          ? rFrozen.value
            ? '倒數暫停中'
            : `公司約 ${etaOf(sl.timer, speed.value)} 回合後修復`
          : `公開後約 ${repairTurnsOf(sl.vuln)} 回合會被修復`
      return { kind: 'vuln' as const, name: d.name, icon: d.icon, text: d.desc, rule: d.rule ?? '', vis: sl.vis, risk, eta }
    })
  if (wall.value) {
    list.push({ kind: 'shield' as const, name: '無懈可擊', icon: 'shield-check', text: '這個節點沒有任何可利用的弱點', rule: '', vis: 1 as const, risk: '', eta: '' })
  }
  return list
})
const dots = (k: number) => '●'.repeat(k) + '○'.repeat(3 - k)
const speed = computed(() => (game.s ? speedOf(game.s) : 1))
const rFrozen = computed(() => !!game.s && repairBlock(game.s) !== null)
const cFrozen = computed(() => !!game.s && recaptureBlock(game.s) !== null)
const nodeRisk = computed(() => {
  const n = node.value
  if (!n) return null
  const r = NODE_RISK[n.role]
  const base = `顯眼 ${dots(r.notice)}　嚴重 ${dots(r.severe)}`
  if (n.controlled) return { base, text: cFrozen.value ? '奪回倒數暫停中' : `公司約 ${etaOf(n.timer, speed.value)} 回合後奪回` }
  return { base, text: `控制後，公司約 ${recaptureTurnsOf(n.role)} 回合會奪回` }
})
const hidden = computed(() => (node.value?.slots.filter((s) => s.vis === 0).length ?? 0) - (wall.value ? 1 : 0))
const excluded = computed(() => (node.value ? (Object.keys(node.value.excluded) as VulnId[]) : []))
const locked = computed(() => {
  const n = node.value
  if (!n || !game.s || n.layer === 0 || n.controlled) return null
  if (reachKnown(game.s, n) === 'Y') return null
  return n.layer === 1 ? '需要先控制任一外圍節點' : '需要先控制任一內網節點'
})
</script>

<template>
  <div v-if="node && pos" ref="tipEl" class="tip" :style="{ left: pos.x + 'px', top: pos.y + 'px', width: pos.W + 'px' }">
    <div class="h">
      <b>{{ node.name }}</b>
      <span v-if="node.controlled" class="st ctrl">已控制</span>
      <span v-if="node.paralyzed !== 0" class="st para">癱瘓{{ node.paralyzed > 0 ? ` ${node.paralyzed} 回合` : '' }}</span>
      <span v-if="node.virus && node.controlled" class="st virus">病毒運作中</span>
    </div>
    <div class="ab" :class="{ on: node.controlled }">
      <Icon :name="ABILITY[node.role].icon" :size="22" :stroke="2.3" />
      <span>控制後：{{ ABILITY[node.role].text }}</span>
    </div>
    <div v-if="nodeRisk" class="nr">
      <Icon name="timer" :size="20" :stroke="2.4" />
      <span>{{ nodeRisk.text }}<em>{{ nodeRisk.base }}</em></span>
    </div>
    <div v-if="locked" class="lk"><Icon name="lock" :size="20" :stroke="2.4" />{{ locked }}</div>

    <div v-for="(r, i) in rows" :key="i" class="vr" :class="r.kind">
      <Icon :name="r.icon" :size="24" :stroke="2.3" />
      <div class="vt">
        <b>{{ r.name }}</b>
        <span>{{ r.text }}</span>
        <em v-if="r.rule">規則：{{ r.rule }}</em>
        <small v-if="r.risk">{{ r.risk }}　{{ r.eta }}</small>
      </div>
      <span v-if="r.kind === 'vuln'" class="vis" :class="r.vis === 2 ? 'pub' : 'priv'">
        <Icon :name="r.vis === 2 ? 'eye' : 'ghost'" :size="16" :stroke="2.4" />{{ r.vis === 2 ? '公開' : '隱密' }}
      </span>
    </div>
    <div v-if="node.sealed && hidden && !wall" class="hid">已確認：這裡沒有更多可用的弱點</div>
    <div v-else-if="hidden" class="hid">還有 {{ hidden }} 張蓋著的牌</div>
    <div v-if="excluded.length" class="exl">
      <span>已排除</span>
      <i v-for="v in excluded" :key="v">{{ VULNS[v].name }}</i>
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
.nr em {
  font-style: normal;
  font-size: 15px;
  font-weight: 700;
  color: var(--text2);
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
.vis.priv {
  background: #2f9a6c;
}
.hid {
  color: var(--text2);
  font-size: 17px;
}
.exl {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  color: var(--text2);
}
.exl i {
  font-style: normal;
  padding: 0 9px;
  border-radius: 7px;
  background: #1e2738;
  border: 1.5px solid #46587a;
  text-decoration: line-through;
  text-decoration-color: #ff7a68;
}
</style>
