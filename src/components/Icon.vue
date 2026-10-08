<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from './icons'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
    stroke?: number
  }>(),
  { size: 24, stroke: 2 },
)

const comp = computed(() => ICONS[props.name] ?? ICONS['circle-question-mark'])
</script>

<template>
  <component :is="comp" :size="size" :stroke-width="stroke" class="icon" />
</template>

<style scoped>
.icon {
  flex: none;
}
</style>
