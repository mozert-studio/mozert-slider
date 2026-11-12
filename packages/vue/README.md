# @mozert-studio/vue

Vue component for [Mozert Slider](https://mozert-slider.netlify.app/): a dependency-free slider and carousel with touch, responsive layouts, 3D effects, thumbnails, lightbox and scroll-driven mode.

```
npm install @mozert-studio/vue @mozert-studio/mozert-slider
```

Import the slider styles once (for example in your root layout):

```js
import '@mozert-studio/mozert-slider/css';
import '@mozert-studio/mozert-slider/theme.css';
```

## Use

```vue
<script setup>
import MozertSlider from '@mozert-studio/vue';
</script>

<template>
  <MozertSlider :slides-to-show="3" :spaceBetween="16" dots thumbs lightbox @change="(i) => console.log(i)">
    <div v-for="p in products" :key="p.id"><img :src="p.image" :alt="p.name" /></div>
  </MozertSlider>
</template>
```

- Every Mozert option can be an attribute, or be passed as `:options="{ ... }"`. Use camelCase names (`:slidesToShow="3"`).
- Each slide is **one element**. Give `v-for` items a `:key`.
- The slider is rebuilt when slides are added, removed or reordered, or when an option changes.
- Events: `init(slider)`, `change(index, slider)`, `before-change(from, to, slider)`. A template ref exposes `slider()` and `element()`.
- Nuxt 3: wrap it in `<ClientOnly>`.
