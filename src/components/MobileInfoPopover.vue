<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { game, ui } from '../game/store'
import CompanyPanel from './CompanyPanel.vue'
import ControlledList from './ControlledList.vue'
import MissionPanel from './MissionPanel.vue'
import NodeTip from './NodeTip.vue'
import StageTrack from './StageTrack.vue'

type InfoKind = 'mission' | 'company' | 'track' | 'mine' | 'node' | 'fw'
interface InfoTarget {
  kind: InfoKind
  nodeId?: string
  slotIndex?: number
  text?: string
  title: string
}
interface Gesture {
  pointerId: number
  x: number
  y: number
  target: InfoTarget
  timer: number | null
  opened: boolean
}

const active = ref<InfoTarget | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null
let gesture: Gesture | null = null
const HOLD_MS = 430
const MOVE_LIMIT = 12
const TARGETS = '.mission, .company, .track, .mine, .node, .fw'

function isCoarse() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

function close() {
  active.value = null
  ui.hoverNode = null
  ui.hoverSlot = null
  previousFocus?.focus({ preventScroll: true })
  previousFocus = null
}

function resetGesture() {
  if (gesture?.timer !== null && gesture?.timer !== undefined) window.clearTimeout(gesture.timer)
  gesture = null
}

function nodeName(id: string | undefined) {
  return game.s?.nodes.find((n) => n.id === id)?.name ?? '節點資訊'
}

function pickTarget(el: Element): InfoTarget | null {
  const hit = el.closest(TARGETS)
  if (!hit || !hit.closest('.game') || hit.closest('.mobile-info-popover')) return null
  if (hit.classList.contains('mission')) return { kind: 'mission', title: '本局任務' }
  if (hit.classList.contains('company')) return { kind: 'company', title: '公司狀態與動向' }
  if (hit.classList.contains('track')) return { kind: 'track', title: '攻擊流程' }
  if (hit.classList.contains('mine')) return { kind: 'mine', title: '我控制的節點' }
  if (hit.classList.contains('node')) {
    const nodeId = (hit as HTMLElement).dataset.nodeId
    const slot = el.closest<HTMLElement>('[data-slot-index]')
    if (slot) {
      if (!nodeId || slot.classList.contains('st-hidden')) return null
      const slotIndex = Number(slot.dataset.slotIndex)
      return { kind: 'node', nodeId, slotIndex, title: slot.querySelector('.sname')?.textContent ?? '弱點資訊' }
    }
    return nodeId ? { kind: 'node', nodeId, title: nodeName(nodeId) } : null
  }
  if (hit.classList.contains('fw')) {
    const gate = hit as HTMLElement
    return {
      kind: 'fw',
      title: '分層攻擊規則',
      text: gate.dataset.infoText || gate.title || '攻擊可達只代表能對目標出牌；仍須符合卡牌條件。',
    }
  }
  return null
}

function show(target: InfoTarget) {
  if (!isCoarse() || ui.drag) return
  ui.hoverNode = null
  ui.hoverSlot = null
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  active.value = target
  void nextTick(() => closeButton.value?.focus({ preventScroll: true }))
}

function onPointerDown(ev: PointerEvent) {
  if (!isCoarse()) return
  if (ev.target instanceof Element && ev.target.closest('.mobile-info-popover')) return
  if (!ev.isPrimary || ev.button !== 0 || ui.drag) {
    resetGesture()
    return
  }
  if (gesture) {
    resetGesture()
    return
  }
  if (!(ev.target instanceof Element)) return
  const target = pickTarget(ev.target)
  if (!target) return

  const next: Gesture = { pointerId: ev.pointerId, x: ev.clientX, y: ev.clientY, target, timer: null, opened: false }
  gesture = next
  next.timer = window.setTimeout(() => {
    if (gesture !== next) return
    next.timer = null
    if (!ui.drag) {
      show(next.target)
      next.opened = true
    }
  }, HOLD_MS)
}

function onPointerMove(ev: PointerEvent) {
  const pending = gesture
  if (!pending) return
  if (!ev.isPrimary || ev.pointerId !== pending.pointerId || ui.drag || Math.hypot(ev.clientX - pending.x, ev.clientY - pending.y) >= MOVE_LIMIT) {
    resetGesture()
  }
}

function onPointerUp(ev: PointerEvent) {
  const pending = gesture
  if (!pending || ev.pointerId !== pending.pointerId) return
  if (pending.timer !== null) window.clearTimeout(pending.timer)
  if (!pending.opened && !ui.drag && Math.hypot(ev.clientX - pending.x, ev.clientY - pending.y) < MOVE_LIMIT) show(pending.target)
  gesture = null
}

function onPointerCancel(ev: PointerEvent) {
  if (!gesture || ev.pointerId === gesture.pointerId) resetGesture()
}

function onBlur() {
  resetGesture()
}

function onVisibilityChange() {
  if (document.hidden) resetGesture()
}

function onKeyDown(ev: KeyboardEvent) {
  if (!active.value) return
  // Keep the game's Space shortcut from ending a turn behind the dialog.
  ev.stopPropagation()
  if (ev.key === 'Tab') {
    ev.preventDefault()
    closeButton.value?.focus()
  }
  if (ev.key === 'Escape') {
    ev.preventDefault()
    resetGesture()
    close()
  }
}

function onContextMenu(ev: MouseEvent) {
  if (isCoarse() && ev.target instanceof Element && ev.target.closest(TARGETS)) ev.preventDefault()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('pointermove', onPointerMove, true)
  document.addEventListener('pointerup', onPointerUp, true)
  document.addEventListener('pointercancel', onPointerCancel, true)
  document.addEventListener('visibilitychange', onVisibilityChange)
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('blur', onBlur)
})

onBeforeUnmount(() => {
  resetGesture()
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('pointermove', onPointerMove, true)
  document.removeEventListener('pointerup', onPointerUp, true)
  document.removeEventListener('pointercancel', onPointerCancel, true)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  document.removeEventListener('keydown', onKeyDown, true)
  document.removeEventListener('contextmenu', onContextMenu)
  window.removeEventListener('blur', onBlur)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="mobile-info">
      <div v-if="active" class="mobile-info-popover" @click.self="close">
        <section class="mobile-info-dialog" role="dialog" aria-modal="true" :aria-label="active.title" @click.stop>
          <header class="mobile-info-header">
            <h2>{{ active.title }}</h2>
            <button ref="closeButton" type="button" aria-label="關閉說明" @click="close">×</button>
          </header>
          <div class="mobile-info-content">
            <MissionPanel v-if="active.kind === 'mission'" detail />
            <CompanyPanel v-else-if="active.kind === 'company'" />
            <StageTrack v-else-if="active.kind === 'track'" />
            <ControlledList v-else-if="active.kind === 'mine'" />
            <NodeTip v-else-if="active.kind === 'node'" :node-id="active.nodeId" :slot-index="active.slotIndex" />
            <p v-else-if="active.kind === 'fw'" class="gate-copy">{{ active.text }}</p>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.mobile-info-popover {
  position: fixed;
  inset: 0;
  height: 100vh;
  height: 100dvh;
  box-sizing: border-box;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  color: #f1e8cf;
  background: rgba(3, 6, 12, 0.78);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  touch-action: pan-y;
}
.mobile-info-dialog {
  box-sizing: border-box;
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 24px);
  max-height: min(calc(100dvh - 24px), 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 2px solid #9d7c3d;
  border-radius: 16px;
  background: linear-gradient(160deg, #202b3c, #111720 70%);
  box-shadow: 0 18px 52px rgba(0, 0, 0, 0.72), inset 0 0 0 1px rgba(255, 226, 158, 0.12);
  font-size: 15px;
}
.mobile-info-header {
  flex: none;
  min-height: 48px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 10px 6px 16px;
  border-bottom: 1px solid rgba(202, 170, 103, 0.35);
  background: linear-gradient(180deg, rgba(231, 194, 115, 0.13), rgba(231, 194, 115, 0.02));
}
.mobile-info-header h2 {
  margin: 0;
  color: #f2d58c;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 1px;
}
.mobile-info-header button {
  flex: none;
  width: 44px;
  height: 44px;
  border: 1px solid #75603c;
  border-radius: 50%;
  color: #fff1ca;
  background: #313b4b;
  font: 700 26px/1 sans-serif;
  cursor: pointer;
}
.mobile-info-content {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 12px;
  font-size: 15px;
  line-height: 1.5;
  -webkit-overflow-scrolling: touch;
}
.mobile-info-content .mission {
  padding-bottom: 10px;
}
.mobile-info-content .mission .tag {
  display: none;
}
.mobile-info-content .mission .head {
  gap: 10px;
  padding: 12px 12px 10px;
}
.mobile-info-content .mission .badge {
  width: 46px;
  height: 46px;
}
.mobile-info-content .mission .badge svg {
  width: 28px;
  height: 28px;
}
.mobile-info-content .mission .title {
  font-size: 17px;
}
.mobile-info-content .mission .goals {
  padding: 0 10px;
  gap: 7px;
}
.mobile-info-content .mission .goals li {
  min-height: 38px;
  height: auto;
  box-sizing: border-box;
  padding: 5px 8px;
  gap: 8px;
  font-size: 15px;
}
.mobile-info-content .mission .chk {
  width: 25px;
  height: 25px;
}
.mobile-info-content .mission .pop {
  position: static;
  width: auto;
  margin: 10px 10px 0;
  padding: 10px 12px;
  opacity: 1;
  transform: none;
  pointer-events: auto;
  font-size: 15px;
  line-height: 1.5;
}
.mobile-info-content .mission .pop b {
  display: none;
}
.mobile-info-content .mission .pop p {
  font-size: 15px;
}
.mobile-info-content .company {
  gap: 10px;
}
.mobile-info-content .company .who {
  padding: 8px 10px;
}
.mobile-info-content .company .logo {
  width: 42px;
  height: 42px;
}
.mobile-info-content .company .names b,
.mobile-info-content .company .rt b,
.mobile-info-content .company .lb b {
  font-size: 16px;
}
.mobile-info-content .company .names span,
.mobile-info-content .company .rt span,
.mobile-info-content .company .lb small,
.mobile-info-content .company .empty {
  font-size: 14px;
}
.mobile-info-content .company .react,
.mobile-info-content .company .it {
  gap: 10px;
  padding: 8px 10px;
}
.mobile-info-content .company .board {
  gap: 7px;
  padding: 10px;
}
.mobile-info-content .company .title {
  font-size: 14px;
  letter-spacing: 2px;
}
.mobile-info-content .company .row {
  min-height: 44px;
  font-size: 15px;
}
.mobile-info-content .company .eta {
  font-size: 16px;
}
.mobile-info-content .mine {
  flex: initial;
  min-height: 0;
}
.mobile-info-content .mine .tag {
  font-size: 14px;
  letter-spacing: 2px;
  text-indent: 2px;
}
.mobile-info-content .mine .tx b {
  font-size: 15px;
}
.mobile-info-content .mine .tx span,
.mobile-info-content .mine .empty {
  font-size: 14px;
}
.mobile-info-content .mine .eta {
  font-size: 16px;
}
.mobile-info-content .track .tag {
  font-size: 14px;
  letter-spacing: 3px;
  text-indent: 3px;
}
.mobile-info-content .track li {
  font-size: 14px;
}
.mobile-info-content .gate-copy {
  margin: 0;
  padding: 14px;
  border: 1px solid rgba(202, 170, 103, 0.42);
  border-radius: 10px;
  color: #e8dfcb;
  background: rgba(10, 14, 22, 0.62);
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-line;
}
.mobile-info-enter-active,
.mobile-info-leave-active {
  transition: opacity 160ms ease;
}
.mobile-info-enter-active .mobile-info-dialog,
.mobile-info-leave-active .mobile-info-dialog {
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 160ms ease;
}
.mobile-info-enter-from,
.mobile-info-leave-to {
  opacity: 0;
}
.mobile-info-enter-from .mobile-info-dialog,
.mobile-info-leave-to .mobile-info-dialog {
  transform: translateY(10px) scale(0.98);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .mobile-info-enter-active,
  .mobile-info-leave-active,
  .mobile-info-enter-active .mobile-info-dialog,
  .mobile-info-leave-active .mobile-info-dialog {
    transition: none;
  }
}

@media (pointer: coarse) {
  .game .rail.left .mission {
    padding-bottom: 7px;
  }
  .game .rail.left .mission .tag,
  .game .rail.left .mission .title,
  .game .rail.left .mission .lbl,
  .game .rail.left .track .tag,
  .game .rail.left .track .lbl {
    display: none !important;
  }
  .game .rail.left .mission .head {
    justify-content: center;
    padding: 8px 6px 6px;
  }
  .game .rail.left .mission .badge {
    width: 42px;
    height: 42px;
  }
  .game .rail.left .mission .goals {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    justify-items: center;
    padding: 0 5px;
    gap: 4px;
  }
  .game .rail.left .mission .goals li {
    width: 36px;
    height: 36px;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
  }
  .game .rail.left .mission .chk {
    width: 28px;
    height: 28px;
  }
  .game .rail.left .mission:hover .pop {
    display: none !important;
  }
  .game .rail.left .track {
    padding-bottom: 5px;
  }
  .game .rail.left .track ol {
    margin: 6px 4px 0;
    gap: 0;
  }
  .game .rail.left .track li {
    gap: 0;
    font-size: 0;
  }
  .game .rail.left .track .dot {
    width: 30px;
    height: 30px;
  }
  .game .rail.left .mine .tag {
    height: 28px;
    padding: 3px 0;
    font-size: 0;
    letter-spacing: 0;
    text-indent: 0;
  }
  .game .rail.left .mine .tag b {
    font-size: 16px;
  }
  .game .rail.left .mine .list {
    padding: 6px;
    gap: 5px;
  }
  .game .rail.left .mine .row {
    justify-content: center;
    gap: 4px;
    padding: 4px;
  }
  .game .rail.left .mine .tx,
  .game .rail.left .mine .empty {
    display: none;
  }
  .game .rail.left .mine .av {
    width: 32px;
    height: 32px;
  }
  .game .rail.left .mine .eta {
    min-width: 28px;
    height: 24px;
    padding: 0 4px;
    font-size: 16px;
  }
  .game .rail.right .company {
    gap: 7px;
  }
  .game .rail.right .company .who,
  .game .rail.right .company .react,
  .game .rail.right .company .it {
    justify-content: center;
    gap: 0;
    padding: 6px;
  }
  .game .rail.right .company .names,
  .game .rail.right .company .rt,
  .game .rail.right .company .board .title,
  .game .rail.right .company .lb,
  .game .rail.right .company .empty {
    display: none;
  }
  .game .rail.right .company .logo {
    width: 38px;
    height: 38px;
  }
  .game .rail.right .company .react > .icon,
  .game .rail.right .company .it > .icon {
    width: 24px;
    height: 24px;
  }
  .game .rail.right .company .board {
    gap: 5px;
    padding: 6px;
  }
  .game .rail.right .company .row {
    min-height: 36px;
    justify-content: center;
    gap: 5px;
    padding: 3px 5px;
  }
  .game .rail.right .company .row > .icon {
    width: 20px;
    height: 20px;
  }
  .game .rail.right .company .eta {
    min-width: 26px;
    height: 24px;
    gap: 1px;
    padding: 0 4px;
    font-size: 16px;
  }
  .game > .tip {
    display: none !important;
  }
  .game .node .kind {
    gap: 0;
    font-size: 0;
  }
  .game .node .sname {
    display: none;
  }
}
</style>
