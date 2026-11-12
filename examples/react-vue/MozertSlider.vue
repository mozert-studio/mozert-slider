<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import Mozert from '@mozert-studio/mozert-slider';
import '@mozert-studio/mozert-slider/css';
import '@mozert-studio/mozert-slider/theme.css';

const props = defineProps({ options: { type: Object, default: () => ({}) }, count: { type: Number, default: 0 } });
const emit = defineEmits(['init']);
const key = ref(0);        // changing the key re-creates the wrapper node
const el = ref(null);
let inst = null;

function start() { inst = new Mozert(el.value, props.options); emit('init', inst); }
function stop() { if (inst) { inst.destroy(); inst = null; } }

onMounted(start);
onBeforeUnmount(stop);
// pass :count="slides.length" so the slider is rebuilt when slides are added/removed
watch(() => [props.count, JSON.stringify(props.options)], async () => {
  stop(); key.value++; await nextTick(); start();
});
</script>

<template>
  <div :key="key" ref="el"><slot /></div>
</template>
