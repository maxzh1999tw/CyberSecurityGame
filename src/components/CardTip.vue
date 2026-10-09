<script setup lang="ts">
// 滑過手牌時，在牌旁邊顯示的小知識與狀態
import { computed } from 'vue'
import { CARDS } from '../game/data'
import { knownHas, node, playability } from '../game/engine'
import { deadReason, game, ui } from '../game/store'
import RichText from './RichText.vue'

const props = withDefaults(defineProps<{ preview?: boolean }>(), { preview: false })

const info = computed(() => {
  const s = game.s
  if (!s || ui.hoverCard === null || ui.drag) return null
  const inst = s.hand.find((c) => c.uid === ui.hoverCard)
  if (!inst) return null
  const def = CARDS[inst.id]
  const pb = playability(s, inst.id)
  return {
    name: def.name,
    stage: def.stage,
    cost: pb.cost,
    noise: knownHas(node(s, 'infra'), 'nolog') === 'Y' ? Math.ceil(def.noise / 2) : def.noise,
    cond: def.cond,
    effect: def.effect,
    trivia: def.trivia,
    dead: pb.status === 'dead' ? deadReason(s, inst.id) : null,
    unaff: pb.status !== 'dead' && !pb.affordable,
    maybe: pb.status === 'maybe',
    targeting: def.targeting,
  }
})
</script>

<template>
  <div v-if="info" class="ctip" :class="{ preview: props.preview }">
    <div v-if="props.preview" class="preview-heading">
      <b>{{ info.stage }} · {{ info.name }}</b>
      <span>行動點 {{ info.cost }} · 噪音 {{ info.noise }}</span>
    </div>
    <div v-if="info.dead" class="state bad">{{ info.dead }}</div>
    <div v-else-if="info.unaff" class="state bad">行動點不足</div>
    <div v-else class="state" :class="info.maybe ? 'maybe' : 'sure'">
      {{ info.targeting === 'node'
        ? (info.maybe ? '拖到目標身上（要賭）' : '有確定目標 · 拖到目標身上')
        : (info.maybe ? '拖到場上（要賭）' : '一定成功 · 拖到場上') }}
    </div>
    <div v-if="props.preview && info.cond" class="detail">
      <b>條件</b>
      <p><RichText :text="info.cond" :size="16" /></p>
    </div>
    <div v-if="props.preview" class="detail effect-detail">
      <b>效果</b>
      <p><RichText :text="info.effect" :size="16" /></p>
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
.ctip.preview {
  position: relative;
  left: auto;
  top: auto;
  width: auto;
  max-height: none;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 7px;
  pointer-events: none;
}
.ctip.preview .preview-heading,
.ctip.preview .state,
.ctip.preview .trivia {
  grid-column: 1 / -1;
}
.preview-heading,
.detail {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(18, 25, 37, 0.92);
  border: 1px solid var(--edge2);
  color: var(--text);
}
.preview-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 14px;
}
.preview-heading b {
  color: var(--gold2);
  font-size: 17px;
  font-weight: 900;
}
.preview-heading span {
  color: var(--text2);
  font-size: 13px;
  font-weight: 700;
}
.detail > b {
  color: var(--gold2);
  font-size: 13px;
  letter-spacing: 0.12em;
}
.detail p {
  margin: 4px 0 0;
  color: #e3ebf8;
  font-size: 15px;
  line-height: 1.55;
  font-weight: 600;
}
.effect-detail {
  border-left: 3px solid var(--gold);
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
@media (max-width: 700px) and (orientation: landscape) {
  .ctip.preview {
    gap: 6px;
  }
  .preview-heading span,
  .detail p,
  .trivia p {
    font-size: 12px;
  }
  .detail p,
  .trivia p {
    line-height: 1.3;
  }
  .preview-heading,
  .detail,
  .trivia {
    padding: 6px 8px;
  }
  .preview-heading b {
    font-size: 14px;
  }
  .detail > b,
  .trivia b {
    font-size: 11px;
    letter-spacing: 1px;
  }
  .state {
    font-size: 15px;
    padding: 5px 8px;
  }
}
</style>
