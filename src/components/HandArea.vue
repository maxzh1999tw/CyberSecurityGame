<script setup lang="ts">
// 手牌：扇形排列，滑過放大，按住拖曳出牌
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { sfx } from '../audio/sfx'
import { CARDS } from '../game/data'
import { knownHas, node, playability } from '../game/engine'
import type { Playability } from '../game/engine'
import { anchorRect, boardCenter, cancelPointerDrag, game, handOrigin, playLine, pointerDownCard, ui, view } from '../game/store'
import type { CardInst } from '../game/types'
import CardFace from './CardFace.vue'
import CardTip from './CardTip.vue'

const s = computed(() => game.s!)
const hand = computed<CardInst[]>(() => game.s?.hand ?? [])

const REST_SCALE = 0.8
const HOVER_SCALE = 1.22
const HOLD_TO_PREVIEW_MS = 440
const TOUCH_DRAG_THRESHOLD = 12

interface Slot {
  c: CardInst
  pb: Playability
  style: Record<string, string>
  cls: Record<string, boolean>
}

const dragUid = computed(() => ui.drag?.uid ?? null)
const playingUid = computed(() => ui.playing?.uid ?? null)
const previewUid = ref<number | null>(null)

interface TouchGesture {
  uid: number
  pointerId: number
  startX: number
  startY: number
  startEvent: PointerEvent
  phase: 'pending' | 'preview' | 'drag'
}

let touchGesture: TouchGesture | null = null
let holdTimer = 0
const activeTouchPointers = new Set<number>()
let blockUntilTouchesEnd = false

function clearHoldTimer() {
  if (holdTimer) window.clearTimeout(holdTimer)
  holdTimer = 0
}

function clearTouchGesture(cancelDrag = false) {
  clearHoldTimer()
  const uid = touchGesture?.uid
  touchGesture = null
  previewUid.value = null
  if (uid !== undefined && ui.hoverCard === uid) ui.hoverCard = null
  if (cancelDrag && uid !== undefined && ui.drag?.uid === uid) cancelPointerDrag()
}

function onGlobalTouchDown(ev: PointerEvent) {
  if (ev.pointerType !== 'touch') return
  activeTouchPointers.add(ev.pointerId)
  if (touchGesture && ev.pointerId !== touchGesture.pointerId) {
    clearTouchGesture(true)
    blockUntilTouchesEnd = true
  }
}

function onGlobalTouchEnd(ev: PointerEvent) {
  if (ev.pointerType !== 'touch') return
  activeTouchPointers.delete(ev.pointerId)
  if (activeTouchPointers.size === 0) blockUntilTouchesEnd = false
}

function onTouchMove(ev: PointerEvent) {
  const active = touchGesture
  if (!active || ev.pointerId !== active.pointerId) return
  const distance = Math.hypot(ev.clientX - active.startX, ev.clientY - active.startY)
  if (distance < TOUCH_DRAG_THRESHOLD) return

  clearHoldTimer()
  if (active.phase !== 'drag') {
    previewUid.value = null
    if (ui.hoverCard === active.uid) ui.hoverCard = null
    active.phase = 'drag'
    pointerDownCard(active.uid, active.startEvent, ev)
  }
}

function onTouchEnd(ev: PointerEvent) {
  if (!touchGesture || ev.pointerId !== touchGesture.pointerId) return
  // 出牌由 store 的 pointerup 處理；這裡只回收長按預覽狀態。
  clearTouchGesture(false)
}

function onTouchCancel(ev: PointerEvent) {
  if (!touchGesture || ev.pointerId !== touchGesture.pointerId) return
  clearTouchGesture(true)
}

function onViewportLeave(ev: PointerEvent) {
  if (ev.relatedTarget !== null || touchGesture?.pointerId !== ev.pointerId) return
  clearTouchGesture(true)
  activeTouchPointers.delete(ev.pointerId)
  if (activeTouchPointers.size === 0) blockUntilTouchesEnd = false
}

function onWindowBlur() {
  clearTouchGesture(true)
  activeTouchPointers.clear()
  blockUntilTouchesEnd = false
}

function onVisibilityChange() {
  if (document.visibilityState !== 'visible') onWindowBlur()
}

function onEscape(ev: KeyboardEvent) {
  if (ev.key === 'Escape' && touchGesture) clearTouchGesture(true)
}

function onCardPointerDown(uid: number, ev: PointerEvent) {
  if (ev.pointerType !== 'touch') {
    pointerDownCard(uid, ev)
    return
  }
  if (blockUntilTouchesEnd || activeTouchPointers.size > 1 || ui.busy || !game.s || game.s.phase !== 'hacker') return

  ui.hoverNode = null
  ui.hoverSlot = null
  clearTouchGesture(true)
  const startEvent = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    pointerId: ev.pointerId,
    pointerType: 'touch',
    isPrimary: ev.isPrimary,
    button: 0,
    clientX: ev.clientX,
    clientY: ev.clientY,
  })
  touchGesture = {
    uid,
    pointerId: ev.pointerId,
    startX: ev.clientX,
    startY: ev.clientY,
    startEvent,
    phase: 'pending',
  }
  holdTimer = window.setTimeout(() => {
    if (!touchGesture || touchGesture.uid !== uid || touchGesture.phase !== 'pending') return
    touchGesture.phase = 'preview'
    previewUid.value = uid
    ui.hoverCard = uid
    sfx.hover()
  }, HOLD_TO_PREVIEW_MS)
  try {
    ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  } catch {
    // 舊瀏覽器可能沒有 pointer capture；window listener 仍會追蹤手勢。
  }
}

const slots = computed<Slot[]>(() => {
  const st = s.value
  if (!st) return []
  const O = handOrigin()
  const list = hand.value
  const rest = list.filter((c) => c.uid !== dragUid.value && c.uid !== playingUid.value)
  const n = rest.length
  const mid = (n - 1) / 2
  const spread = n <= 1 ? 0 : Math.min(172, 860 / (n - 1))
  const deck = anchorRect('deck')
  return list.map((c) => {
    const pb = playability(st, c.id)
    const idx = rest.findIndex((o) => o.uid === c.uid)
    const off = idx - mid
    let x = off * spread
    let y = 36 + Math.pow(Math.abs(off), 1.7) * 7
    let rot = off * 4
    let scale = REST_SCALE
    let z = 10 + idx
    let tr = 'transform .28s cubic-bezier(.2,.9,.3,1.1), opacity .25s'
    let opacity = 1
    const cls: Record<string, boolean> = {}

    const isDrag = ui.drag && ui.drag.uid === c.uid && ui.drag.moved
    const isFresh = ui.freshCards.includes(c.uid)
    const isPlaying = ui.playing?.uid === c.uid
    const isRecycling = ui.recycling === c.uid

    if (isFresh && deck) {
      // 從牌堆飛進來
      x = deck.cx - O.x
      y = deck.cy - O.y + 170
      rot = 20
      scale = 0.25
      opacity = 0
    } else if (isPlaying) {
      // 這張牌已經交給「出牌演出」接手：手牌裡先藏起來
      y = 400
      rot = 0
      opacity = 0
      z = 1
      tr = 'none'
    } else if (isRecycling) {
      const pile = anchorRect('pile')
      if (pile) {
        x = pile.cx - O.x
        y = pile.cy - O.y + 170 * 0.3
      }
      rot = 12
      scale = 0.3
      z = 300
      opacity = 0.2
      tr = 'transform .28s cubic-bezier(.5,0,.3,1), opacity .28s .05s'
    } else if (isDrag) {
      const d = ui.drag!
      z = 400
      tr = 'none'
      rot = 0
      if (d.mode === 'node') {
        // 要選目標的牌：停在場中，用箭頭指向目標
        x = 0
        y = view.h - 250 - O.y + 170 * 0.8
        scale = 0.8
        cls.staged = true
      } else {
        scale = d.y < playLine() ? 0.82 : 0.9
        x = d.x - O.x
        y = d.y - O.y + 170 * scale
      }
      cls.dragging = true
    } else if (ui.hoverCard === c.uid && !ui.drag && !ui.busy) {
      x = Math.max(-420, Math.min(420, x))
      y = -10
      rot = 0
      scale = HOVER_SCALE
      z = 200
    }

    const style: Record<string, string> = {
      transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
      zIndex: String(z),
      transition: tr,
      opacity: String(opacity),
    }
    if (isFresh) style.transitionDelay = `${Math.max(0, ui.freshCards.indexOf(c.uid)) * 0.08}s`

    cls.dead = pb.status === 'dead'
    cls.nope = !pb.affordable && pb.status !== 'dead'
    cls.sure = pb.affordable && pb.status === 'sure' && !isDrag
    cls.maybe = pb.affordable && pb.status === 'maybe' && !isDrag
    return { c, pb, style, cls }
  })
})

function onEnter(uid: number, ev: PointerEvent) {
  if (ev.pointerType === 'touch') return
  if (ui.drag || ui.busy) return
  ui.hoverNode = null
  ui.hoverSlot = null
  ui.hoverCard = uid
  sfx.hover()
}
function onLeave(uid: number) {
  if (touchGesture?.uid === uid) return
  if (ui.hoverCard === uid) ui.hoverCard = null
}

// 只有在「沒人看紀錄」已被揭露時，牌面才顯示減半後的噪音（不能洩漏還蓋著的資訊）
const nolog = computed(() => {
  const st = s.value
  return st ? knownHas(node(st, 'infra'), 'nolog') === 'Y' : false
})

const previewSlot = computed(() => slots.value.find((sl) => sl.c.uid === previewUid.value) ?? null)

onMounted(() => {
  window.addEventListener('pointerdown', onGlobalTouchDown, true)
  window.addEventListener('pointerup', onGlobalTouchEnd, true)
  window.addEventListener('pointercancel', onGlobalTouchEnd, true)
  window.addEventListener('pointermove', onTouchMove, { passive: true })
  window.addEventListener('pointerup', onTouchEnd)
  window.addEventListener('pointercancel', onTouchCancel)
  window.addEventListener('pointerleave', onViewportLeave)
  window.addEventListener('blur', onWindowBlur)
  window.addEventListener('keydown', onEscape)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onBeforeUnmount(() => {
  clearTouchGesture(true)
  window.removeEventListener('pointerdown', onGlobalTouchDown, true)
  window.removeEventListener('pointerup', onGlobalTouchEnd, true)
  window.removeEventListener('pointercancel', onGlobalTouchEnd, true)
  window.removeEventListener('pointermove', onTouchMove)
  window.removeEventListener('pointerup', onTouchEnd)
  window.removeEventListener('pointercancel', onTouchCancel)
  window.removeEventListener('pointerleave', onViewportLeave)
  window.removeEventListener('blur', onWindowBlur)
  window.removeEventListener('keydown', onEscape)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div class="hand" :style="{ left: boardCenter() + 'px', top: view.h + 'px' }">
    <div
      v-for="sl in slots"
      :key="sl.c.uid"
      class="hc"
      :class="sl.cls"
      :style="sl.style"
      @pointerenter="onEnter(sl.c.uid, $event)"
      @pointerleave="onLeave(sl.c.uid)"
      @pointerdown.prevent="onCardPointerDown(sl.c.uid, $event)"
    >
      <div class="aura"></div>
      <CardFace
        :id="sl.c.id"
        :cost="sl.pb.cost"
        :free="sl.pb.free"
        :unaffordable="!sl.pb.affordable"
        :dead="sl.pb.status === 'dead'"
        :noise="nolog ? Math.ceil(CARDS[sl.c.id].noise / 2) : undefined"
        :noise-halved="nolog"
      />
      <CardTip v-if="ui.hoverCard === sl.c.uid && !ui.drag && !previewUid" />
    </div>
  </div>
  <Teleport to="body">
    <Transition name="card-preview">
      <div v-if="previewSlot" class="card-preview-scrim" aria-live="polite" aria-label="卡牌詳細資料">
        <div class="card-preview-shell">
          <div class="preview-card-frame">
            <CardFace
              :id="previewSlot.c.id"
              :cost="previewSlot.pb.cost"
              :free="previewSlot.pb.free"
              :unaffordable="!previewSlot.pb.affordable"
              :dead="previewSlot.pb.status === 'dead'"
              :noise="nolog ? Math.ceil(CARDS[previewSlot.c.id].noise / 2) : undefined"
              :noise-halved="nolog"
            />
          </div>
          <CardTip preview />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.hand {
  position: absolute;
  width: 0;
  height: 0;
  z-index: 20;
}
.hc {
  position: absolute;
  left: -120px;
  top: -340px;
  width: 240px;
  height: 340px;
  transform-origin: 50% 100%;
  cursor: grab;
  touch-action: none;
  will-change: transform;
}
.hc.dragging {
  cursor: grabbing;
}
.aura {
  position: absolute;
  inset: -9px;
  border-radius: 22px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.hc.sure .aura {
  opacity: 1;
  border: 5px solid #5fd99a;
  box-shadow: 0 0 12px rgba(95, 217, 154, 0.45);
}
.hc.maybe .aura {
  opacity: 1;
  border: 4px dashed #f0b440;
}
.hc.dead {
  filter: saturate(0.35) brightness(0.8);
}
.hc.nope {
  filter: saturate(0.7) brightness(0.88);
}

@media (pointer: coarse) and (orientation: landscape) and (max-width: 1000px) {
  .hc {
    touch-action: none;
    -webkit-touch-callout: none;
  }
}

.card-preview-scrim {
  position: fixed;
  z-index: 10001;
  inset: 0;
  display: grid;
  place-items: center;
  padding: max(10px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  background: rgba(4, 7, 13, 0.68);
  backdrop-filter: blur(3px);
  pointer-events: none;
}
.card-preview-shell {
  position: relative;
  width: min(900px, calc(100vw - 24px));
  max-height: calc(100dvh - 20px);
  padding: 16px 20px;
  border-radius: 18px;
  display: grid;
  grid-template-columns: 202px minmax(260px, 1fr);
  align-items: center;
  gap: 18px;
  border: 2px solid var(--gold3);
  background: linear-gradient(155deg, rgba(37, 48, 67, 0.98), rgba(14, 19, 28, 0.98));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.74), inset 0 0 0 1px rgba(242, 217, 148, 0.16);
}
.preview-card-frame {
  position: relative;
  width: 202px;
  height: 286px;
}
.preview-card-frame :deep(.card) {
  transform: scale(0.84);
  transform-origin: left top;
}
.card-preview-enter-active {
  transition: opacity 180ms ease-out;
}
.card-preview-leave-active {
  pointer-events: none;
  transition: opacity 90ms ease-in;
}
.card-preview-enter-active .card-preview-shell,
.card-preview-leave-active .card-preview-shell {
  transition: transform 230ms cubic-bezier(0.18, 1.2, 0.35, 1);
}
.card-preview-enter-from,
.card-preview-leave-to {
  opacity: 0;
}
.card-preview-enter-from .card-preview-shell,
.card-preview-leave-to .card-preview-shell {
  transform: translateY(16px) scale(0.84);
}
@media (max-width: 700px) and (orientation: landscape) {
  .card-preview-shell {
    width: calc(100vw - 20px);
    grid-template-columns: 172px minmax(0, 1fr);
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
  }
  .preview-card-frame {
    width: 172px;
    height: 243px;
  }
  .preview-card-frame :deep(.card) {
    transform: scale(0.716);
  }
}
@media (prefers-reduced-motion: reduce) {
  .card-preview-enter-active,
  .card-preview-leave-active,
  .card-preview-enter-active .card-preview-shell,
  .card-preview-leave-active .card-preview-shell {
    transition-duration: 1ms;
  }
}
</style>
