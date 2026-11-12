# @mozert-studio/react

React component for [Mozert Slider](https://mozert-slider.netlify.app/): a dependency-free slider and carousel with touch, responsive layouts, 3D effects, thumbnails, lightbox and scroll-driven mode.

```
npm install @mozert-studio/react @mozert-studio/mozert-slider
```

Import the slider styles once (for example in your root layout):

```js
import '@mozert-studio/mozert-slider/css';
import '@mozert-studio/mozert-slider/theme.css';
```

## Use

```jsx
import MozertSlider from '@mozert-studio/react';

<MozertSlider slidesToShow={3} spaceBetween={16} dots thumbs lightbox onChange={(i) => console.log(i)}>
  {products.map((p) => <div key={p.id}><img src={p.image} alt={p.name} /></div>)}
</MozertSlider>
```

- Every Mozert option can be a prop, or be passed as `options={{ ... }}`.
- Each child renders **one DOM element**. Give children a `key`.
- The slider is rebuilt when slides are added, removed or reordered, or when an option changes. Changing the content of a slide does not rebuild it.
- `onInit(slider)`, `onChange(index, slider)`, `onBeforeChange(from, to, slider)`. A `ref` gives `{ slider, element }`.
- Next.js (App Router): put `'use client'` at the top of the file that uses it. The slider only runs in the browser.
