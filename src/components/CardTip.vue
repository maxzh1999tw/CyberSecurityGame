<script setup lang="ts">
// 滑過手牌時，在牌旁邊顯示的小知識與狀態
import { computed } from 'vue'
import { CARDS } from '../game/data'
import { knownHas, node, playability } from '../game/engine'
import { deadReason, game, ui } from '../game/store'

const info = computed(() => {
  const s = game.s
  if (!s || ui.hoverCard === null || ui.drag) return null
  const inst = s.hand.find((c) => c.uid === ui.hoverCard)
  if (!inst) return null
  const def = CARDS[inst.id]
  const pb = playability(s, inst.id)
  return {
    noise: knownHas(node(s, 'infra'), 'nolog') === 'Y' ? Math.ceil(def.noise / 2) : def.noise,
    trivia: def.trivia,
    dead: pb.status === 'dead' ? deadReason(s, inst.id) : null,
    unaff: pb.status !== 'dead' && !pb.affordable,
    maybe: pb.status === 'maybe',
    targeting: def.targeting,
  }
})
</script>

<template>
  <div v-if="info" class="ctip">
    <div v-if="info.dead" class="state bad">{{ info.dead }}</div>
    <div v-else-if="info.unaff" class="state bad">行動點不足</div>
    <div v-else class="state" :class="info.maybe ? 'maybe' : 'sure'">
      {{ info.targeting === 'node'
        ? (info.maybe ? '拖到目標身上（要賭）' : '有確定目標 · 拖到目標身上')
        : (info.maybe ? '拖到場上（要賭）' : '一定成功 · 拖到場上') }}
    </div>
    <div class="trivia">
      <b>小知識</b>
      <p>{{ info.trivia }}</p>
    </div>
  </div>
</template>

<style scoped>
.ctip {
  position: absolute;
  left: 100%;
  top: 40px;
  margin-left: 18px;
  width: 270px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.state {
  padding: 7px 12px;
  border-radius: 10px;
  font-size: 18px;
  font-weight: 900;
  text-align: center;
  color: #fff;
  border: 3px solid rgba(255, 255, 255, 0.5);
}
.state.sure {
  background: #2c9a68;
}
.state.maybe {
  background: #b87a14;
}
.state.bad {
  background: #8a2a22;
}
.trivia {
  padding: 12px 16px 14px;
  border-radius: 12px;
  background: #151b27;
  border: 3px solid var(--edge2);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6);
}
.trivia b {
  font-size: 15px;
  letter-spacing: 4px;
  color: var(--gold2);
}
.trivia p {
  margin: 6px 0 0;
  font-size: 17px;
  line-height: 1.6;
  font-weight: 500;
  color: #e3ebf8;
}
</style>
