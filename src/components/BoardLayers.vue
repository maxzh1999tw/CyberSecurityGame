<script setup lang="ts">
// 三層網路：外圍 → 內網 → 核心（玩家從下面往上打）
import { computed } from 'vue'
import { knownHas, reachKnown } from '../game/engine'
import { game } from '../game/store'
import type { GameNode, VulnId } from '../game/types'
import Icon from './Icon.vue'
import NodeCard from './NodeCard.vue'

const nodes = computed(() => game.s?.nodes ?? [])
const access = computed(() => {
  const s = game.s
  const result: Record<number, { known: number; controlled: number }> = {}
  for (const layer of [0, 1, 2]) {
    const targets = nodes.value.filter((n) => n.layer === layer)
    result[layer] = {
      known: s ? targets.filter((n) => !n.controlled && reachKnown(s, n) === 'Y').length : 0,
      controlled: targets.filter((n) => n.controlled).length,
    }
  }
  return result
})
const rows = computed(() => {
  const by = (l: number): GameNode[] => nodes.value.filter((n) => n.layer === l)
  return [
    { layer: 2, name: '核心', icon: 'database', nodes: by(2) },
    { layer: 1, name: '內網', icon: 'network', nodes: by(1) },
    { layer: 0, name: '外圍', icon: 'globe', nodes: by(0) },
  ]
})

// 只顯示玩家已知的攻擊路徑；未知弱點不會影響這裡的進度提示。
const openAbove = computed(() => {
  return {
    1: access.value[1]?.known > 0 || access.value[1]?.controlled > 0,
    2: access.value[2]?.known > 0 || access.value[2]?.controlled > 0,
  } as Record<number, boolean>
})
const hasKnownWeakness = (n: GameNode | undefined, id: VulnId) => !!n && knownHas(n, id) === 'Y'

const gateLabel = (layer: number) => {
  const s = game.s
  if (!s) return ''
  const name = layer === 2 ? '核心' : '內網'
  const targets = s.nodes.filter((n) => n.layer === layer)
  if (targets.every((n) => n.controlled)) return `${name}已控制`
  if (s.nodes.some((n) => n.layer === layer - 1 && n.controlled)) return `${name}已開放 · 可對目標出牌`
  const reachable = targets.filter((n) => !n.controlled && reachKnown(s, n) === 'Y')
  if (reachable.length) return `捷徑已開放：${reachable.map((n) => n.name).join('、')}`
  return `控制任一${layer === 2 ? '內網' : '外圍'}節點 → 解鎖${name}`
}

const gateText = (layer: number) => {
  const s = game.s
  if (!s) return '等待開局'
  let message = ''
  const targets = s.nodes.filter((n) => n.layer === layer)
  const available = targets.filter((n) => !n.controlled && reachKnown(s, n) === 'Y')
  const controlled = targets.filter((n) => n.controlled)

  if (layer === 1) {
    if (s.nodes.some((n) => n.layer === 0 && n.controlled)) message = '已控制外圍 → 開啟一般內網攻擊'
    const infra = s.nodes.find((n) => n.role === 'infra')
    if (!message && infra?.controlled) message = '基礎設施已控制；其他內網目標仍要有可達路徑'
    if (!message && infra && !infra.controlled && hasKnownWeakness(infra, 'remote')) message = '「遠端大門」 → 可直攻基礎設施'
    if (!message) message = '控制任一外圍節點 → 開啟一般內網攻擊；「遠端大門」 可直攻基礎設施'
  }
  else if (layer === 2) {
    if (s.nodes.some((n) => n.layer === 1 && n.controlled)) message = '已控制內網 → 可攻擊核心'
    const db = s.nodes.find((n) => n.role === 'db')
    const backup = s.nodes.find((n) => n.role === 'backup')
    const infra = s.nodes.find((n) => n.role === 'infra')
    const ai = s.nodes.find((n) => n.role === 'ai')
    const outerControlled = s.nodes.some((n) => n.layer === 0 && n.controlled)
    const employeeControlled = s.nodes.some((n) => n.kind === 'employee' && n.controlled)
    const aiControlled = !!ai?.controlled
    const openSea = outerControlled && hasKnownWeakness(infra, 'openSea')
    const allAccess = employeeControlled && hasKnownWeakness(db, 'allaccess')
    const masterKey = aiControlled && hasKnownWeakness(ai, 'masterkey')
    if (!message && (openSea || allAccess || masterKey)) {
      const paths: string[] = []
      if (openSea) paths.push('外圍＋「自由海域」 → 資料庫與備份')
      if (allAccess) paths.push('員工＋「權限大開」 → 資料庫')
      if (masterKey) paths.push('已控制 AI＋「萬能鑰匙」 → 資料庫')
      message = paths.join('；')
    }
    if (!message && controlled.length) message = `核心已有控制節點：${controlled.map((n) => n.name).join('、')}`
    if (!message) message = '控制任一內網節點 → 開啟一般核心攻擊'
    if (db?.controlled && backup?.controlled) message = '資料庫與備份皆已控制'
  }
  const progress = access.value[layer]
  const targetNames = available.map((n) => n.name)
  const availability = targetNames.length ? `已確認可達：${targetNames.join('、')}` : '目前沒有已確認可達的未控制目標'
  const count = progress ? `目前可達 ${progress.known} 個、已控制 ${progress.controlled} 個` : ''
  return [message || '可直接攻擊', availability, count, '偵查只限已開啟的層：開局可查外圍；控制外圍後可查內網，控制內網後可查核心；已控制節點也能查同層。解鎖只代表攻擊可達，不會自動控制；出牌仍須符合牌的條件。控制中的節點不會顯示鎖定；若公司奪回，會依當下路徑重新判定。'].filter(Boolean).join('。')
}
</script>

<template>
  <div class="board">
    <template v-for="(r, i) in rows" :key="r.layer">
      <div
        v-if="i > 0"
        class="fw"
        :class="{ open: openAbove[r.layer + 1] }"
        :aria-label="`${r.layer + 1 === 2 ? '核心' : '內網'}層：${gateText(r.layer + 1)}`"
        :title="gateText(r.layer + 1)"
        :data-info-text="gateText(r.layer + 1)"
      >
        <i class="line"></i>
        <span class="gate"><Icon :name="openAbove[r.layer + 1] ? 'lock-open' : 'lock'" :size="20" :stroke="2.6" /></span>
        <span class="gate-label">{{ gateLabel(r.layer + 1) }}</span>
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
  pointer-events: auto;
  cursor: help;
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
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--table1);
  border: 3px solid var(--fc);
}
.gate-label {
  flex: none;
  max-width: 70%;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  color: var(--fc);
}
@media (pointer: coarse) {
  .gate-label {
    display: none;
  }
}
</style>
