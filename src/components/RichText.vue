<script setup lang="ts">
// 把文字裡的 {v:弱點id} 換成帶圖示的標籤
import { computed } from 'vue'
import { VULNS } from '../game/data'
import type { VulnId } from '../game/types'
import Icon from './Icon.vue'

const props = withDefaults(defineProps<{ text: string; dark?: boolean; size?: number }>(), { size: 15 })

interface Seg {
  t: 'text' | 'vuln'
  v: string
}

const segs = computed<Seg[]>(() => {
  const out: Seg[] = []
  const re = /\{v:(\w+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(props.text))) {
    if (m.index > last) out.push({ t: 'text', v: props.text.slice(last, m.index) })
    out.push({ t: 'vuln', v: m[1] })
    last = m.index + m[0].length
  }
  if (last < props.text.length) out.push({ t: 'text', v: props.text.slice(last) })
  return out
})
</script>

<template>
  <span class="rt">
    <template v-for="(g, i) in segs" :key="i">
      <span v-if="g.t === 'text'">{{ g.v }}</span>
      <span v-else class="vchip" :class="['k-' + VULNS[g.v as VulnId].kind, { dark }]">
        <Icon :name="VULNS[g.v as VulnId].icon" :size="size" :stroke="2.4" />{{ VULNS[g.v as VulnId].name }}
      </span>
    </template>
  </span>
</template>

<style scoped>
.vchip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 7px 0 5px;
  margin: 0 1px;
  border-radius: 6px;
  font-weight: 900;
  line-height: 1.35;
  white-space: nowrap;
  color: color-mix(in srgb, var(--kc) 55%, #000);
  background: color-mix(in srgb, var(--kc) 24%, var(--paper));
  border: 1.5px solid color-mix(in srgb, var(--kc) 70%, #fff 0%);
}
.vchip.dark {
  color: color-mix(in srgb, var(--kc) 30%, #fff);
  background: color-mix(in srgb, var(--kc) 35%, #141a25);
  border-color: color-mix(in srgb, var(--kc) 75%, #141a25);
}
.k-employee {
  --kc: var(--k-employee);
}
.k-infra {
  --kc: var(--k-infra);
}
.k-ai {
  --kc: var(--k-ai);
}
.k-data {
  --kc: var(--k-data);
}
</style>
