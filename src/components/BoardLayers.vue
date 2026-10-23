<script setup lang="ts">
// 三層網路：外圍 → 內網 → 核心（玩家從下面往上打）
import { computed } from 'vue'
import { canRecon, knownHas, reachKnown } from '../game/engine'
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
// 還沒解鎖的層先把節點藏起來；捷徑（例如受控 AI 的萬能鑰匙）已經打開的節點照樣出現
const visible = (n: GameNode) => {
  const s = game.s
  return !s || n.controlled || canRecon(s, n) || reachKnown(s, n) === 'Y'
}
const rows = computed(() => {
  const by = (l: number) => {
    const all = nodes.value.filter((n) => n.layer === l)
    const shown = all.filter(visible)
    return { nodes: shown, hidden: all.length - shown.length }
  }
  return [
    { layer: 2, name: '核心', icon: 'database', ...by(2) },
    { layer: 1, name: '內網', icon: 'network', ...by(1) },
    { layer: 0, name: '外圍', icon: 'globe', ...by(0) },
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
  if (s.nodes.some((n) => n.layer >= layer - 1 && n.controlled)) return `${name}已開放 · 可對目標出牌`
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
    if (s.nodes.some((n) => n.controlled)) message = '已有控制節點 → 開啟一般內網攻擊'
    const infras = s.nodes.filter((n) => n.role === 'infra' && n.layer === 1)
    const held = infras.filter((n) => n.controlled)
    const remote = infras.filter((n) => !n.controlled && hasKnownWeakness(n, 'remote'))
    if (!message && held.length) message = `${held.map((n) => n.name).join('、')}已控制；其他內網目標仍要有可達路徑`
    if (!message && remote.length) message = `「遠端大門」 → 可直攻${remote.map((n) => n.name).join('、')}`
    if (!message) message = '控制任一外圍節點 → 開啟一般內網攻擊；「遠端大門」 可直攻所在的基礎設施'
  }
  else if (layer === 2) {
    if (s.nodes.some((n) => n.layer >= 1 && n.controlled)) message = '已打進內網或核心 → 可攻擊核心'
    const db = s.nodes.find((n) => n.role === 'db')
    const backup = s.nodes.find((n) => n.role === 'backup')
    const outerControlled = s.nodes.some((n) => n.layer === 0 && n.controlled)
    const employeeControlled = s.nodes.some((n) => n.kind === 'employee' && n.controlled)
    // 任一基礎設施有自由海域、任一受控 AI 有萬能鑰匙都算
    const openSea = outerControlled && s.nodes.some((n) => n.role === 'infra' && hasKnownWeakness(n, 'openSea'))
    const allAccess = employeeControlled && hasKnownWeakness(db, 'allaccess')
    const masterKey = s.nodes.some((n) => n.kind === 'ai' && n.controlled && hasKnownWeakness(n, 'masterkey'))
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
  return [message || '可直接攻擊', availability, count, '偵查只限已開啟的層：開局可查外圍；控制外圍後可查內網，控制內網後可查核心；打進較深的層後，外面的層不會再鎖上。還沒解鎖的層，節點會先藏起來。解鎖只代表攻擊可達，不會自動控制；出牌仍須符合牌的條件。'].filter(Boolean).join('。')
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
        <i class="flow"></i>
        <div class="label">
          <Icon :name="r.icon" :size="26" :stroke="2" />
          <span>{{ r.name }}</span>
        </div>
        <TransitionGroup
          tag="div"
          name="reveal"
          class="nodes"
          :class="{ sparse: r.nodes.length + (r.hidden ? 1 : 0) <= 2, crowded: r.nodes.length >= 5 }"
        >
          <NodeCard v-for="n in r.nodes" :key="n.id" :node="n" />
          <div v-if="r.hidden" key="fog" class="fog" :class="{ partial: r.nodes.length > 0 }">
            <Icon name="lock" :size="r.nodes.length ? 26 : 34" :stroke="2.2" />
            <b>{{ r.nodes.length ? '其他節點尚未解鎖' : `${r.name}尚未解鎖` }}</b>
            <span v-if="!r.nodes.length">控制任一{{ r.layer === 2 ? '內網' : '外圍' }}節點後出現</span>
          </div>
        </TransitionGroup>
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
  /* 凹進桌面的托盤：左側帶一點層級色，內側陰影、下緣一道反光 */
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--lc) 15%, transparent), transparent 24%),
    color-mix(in srgb, var(--lc) 6%, rgba(10, 15, 24, 0.66));
  border: 1.5px solid color-mix(in srgb, var(--lc) 24%, #1d2635);
  box-shadow:
    inset 0 5px 16px rgba(0, 0, 0, 0.5),
    inset 0 -1px 0 rgba(255, 255, 255, 0.04),
    0 1px 0 rgba(255, 255, 255, 0.05);
}
/* 資料流：一道很淡的光帶偶爾流過這一層（裁在托盤內，不影響節點的外光暈） */
.flow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}
.flow::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 240px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--lc) 11%, transparent), transparent);
  transform: translateX(-260px);
  animation: row-flow 11s ease-in-out infinite;
}
.layer-1 .flow::before {
  animation-delay: -3.7s;
}
.layer-0 .flow::before {
  animation-delay: -7.4s;
}
@keyframes row-flow {
  0%,
  55% {
    transform: translateX(-260px);
  }
  100% {
    transform: translateX(1400px);
  }
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
  position: relative;
  flex: none;
  width: 70px;
  margin-left: 6px;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
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
/* 尚未解鎖的層：一塊霧面的鎖，不透露裡面有什麼 */
.fog {
  flex: 0 1 460px;
  min-width: 220px;
  height: 170px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 14px;
  color: color-mix(in srgb, var(--lc) 45%, #8b97ad);
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.025) 0 10px, transparent 10px 20px),
    rgba(8, 12, 19, 0.45);
  border: 2px dashed color-mix(in srgb, var(--lc) 30%, #2a3447);
  pointer-events: none;
}
.fog b {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 3px;
}
.fog span {
  font-size: 16px;
  font-weight: 700;
  opacity: 0.8;
}
.fog.partial {
  flex-basis: 240px;
  height: 120px;
}
.fog.partial b {
  font-size: 17px;
  letter-spacing: 1px;
}
/* 解鎖時節點從霧裡浮出來；其他節點平滑讓位 */
.reveal-enter-active {
  transition:
    opacity 0.5s ease,
    transform 0.55s cubic-bezier(0.2, 1.2, 0.35, 1),
    filter 0.5s ease;
}
.reveal-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.92);
  filter: blur(4px);
}
.reveal-leave-active {
  position: absolute;
  transition: opacity 0.3s ease;
}
.reveal-leave-to {
  opacity: 0;
}
.reveal-move {
  transition: transform 0.45s ease;
}
@media (prefers-reduced-motion: reduce) {
  .reveal-enter-active,
  .reveal-leave-active,
  .reveal-move {
    transition: none;
  }
}
/* 節點少的層（例如核心只有資料庫與備份）拉開間距 */
.nodes.sparse {
  gap: 80px;
}
/* 一層五個節點時：縮小間距與名稱字級，讓四個字的名稱放得下 */
.nodes.crowded {
  gap: 16px;
}
.nodes.crowded :deep(.head) {
  gap: 9px;
  padding-inline: 10px;
}
.nodes.crowded :deep(.name) {
  font-size: 19px;
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
  opacity: 0.4;
  /* 已開放的防火牆：虛線往中間的鎖流動，像資料正在通過 */
  animation: gate-flow 1.1s linear infinite;
}
.fw.open .line:last-child {
  animation-direction: reverse;
}
@keyframes gate-flow {
  to {
    background-position: 22px 0;
  }
}
.gate {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 50% 35%, var(--table2), var(--table0));
  border: 3px solid var(--fc);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}
.fw.open .gate {
  animation: gate-glow 2.6s ease-in-out infinite;
}
@keyframes gate-glow {
  50% {
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.5),
      0 0 14px color-mix(in srgb, var(--fc) 55%, transparent);
  }
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
@media (prefers-reduced-motion: reduce) {
  .flow,
  .fw.open .line,
  .fw.open .gate {
    animation: none;
  }
  .flow {
    display: none;
  }
}
</style>
