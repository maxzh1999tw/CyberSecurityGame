<script setup lang="ts">
// 手牌：扇形排列，滑過放大，按住拖曳出牌
import { computed } from 'vue'
import { sfx } from '../audio/sfx'
import { CARDS } from '../game/data'
import { knownHas, node, playability } from '../game/engine'
import type { Playability } from '../game/engine'
import { anchorRect, game, handOrigin, playLine, pointerDownCard, ui, view } from '../game/store'
import type { CardInst } from '../game/types'
import CardFace from './CardFace.vue'
import CardTip from './CardTip.vue'

const s = computed(() => game.s!)
const hand = computed<CardInst[]>(() => game.s?.hand ?? [])

const REST_SCALE = 0.8
const HOVER_SCALE = 1.22

interface Slot {
  c: CardInst
  pb: Playability
  style: Record<string, string>
  cls: Record<string, boolean>
}

const dragUid = computed(() => ui.drag?.uid ?? null)
const playingUid = computed(() => ui.playing?.uid ?? null)

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

function onEnter(uid: number) {
  if (ui.drag || ui.busy) return
  ui.hoverCard = uid
  sfx.hover()
}
function onLeave(uid: number) {
  if (ui.hoverCard === uid) ui.hoverCard = null
}

// 只有在「沒人看紀錄」已被揭露時，牌面才顯示減半後的噪音（不能洩漏還蓋著的資訊）
const nolog = computed(() => {
  const st = s.value
  return st ? knownHas(node(st, 'infra'), 'nolog') === 'Y' : false
})
</script>

<template>
  <div class="hand" :style="{ left: view.w / 2 + 'px', top: view.h + 'px' }">
    <div
      v-for="sl in slots"
      :key="sl.c.uid"
      class="hc"
      :class="sl.cls"
      :style="sl.style"
      @pointerenter="onEnter(sl.c.uid)"
      @pointerleave="onLeave(sl.c.uid)"
      @pointerdown.prevent="pointerDownCard(sl.c.uid, $event)"
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
      <CardTip v-if="ui.hoverCard === sl.c.uid && !ui.drag" />
    </div>
  </div>
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
</style>
