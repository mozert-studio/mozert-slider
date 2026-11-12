import { defineComponent, h, Fragment, Comment, Text } from 'vue';
import Mozert from '@mozert-studio/mozert-slider';

// Flatten v-for / template fragments into the real slide vnodes.
function slidesOf(vnodes) {
  const out = [];
  (vnodes || []).forEach((v) => {
    if (v.type === Comment) return;
    if (v.type === Fragment) out.push.apply(out, slidesOf(v.children));
    else if (v.type === Text && !String(v.children).trim()) return;
    else out.push(v);
  });
  return out;
}
const sig = (opts) => JSON.stringify(opts, (k, v) => (typeof v === 'function' ? '[fn]' : v));

/**
 * <MozertSlider :options="{ slidesToShow: 3 }" @change="i => ..."><div v-for="i in items" :key="i.id">…</div></MozertSlider>
 * Every slide must render one element. Give v-for items a :key so the slider can follow reordering.
 * Extra attributes (slidesToShow, dots...) are also passed as options. Methods: slider() returns the instance.
 */
export const MozertSlider = defineComponent({
  name: 'MozertSlider',
  inheritAttrs: false,
  props: { options: { type: Object, default: () => ({}) }, tag: { type: String, default: 'div' } },
  emits: ['init', 'change', 'before-change'],
  setup(props, { slots, attrs, emit, expose }) {
    let inst = null;
    let host = null;
    const merged = () => {
      const o = Object.assign({}, props.options);
      Object.keys(attrs).forEach((k) => {
        if (k === 'class' || k === 'style' || k === 'id' || /^on[A-Z]/.test(k) || /^data-|^aria-/.test(k)) return;
        o[k] = attrs[k];
      });
      const user = Object.assign({}, o.on);
      o.on = Object.assign({}, user, {
        afterChange(s, i) { user.afterChange && user.afterChange(s, i); emit('change', i, s); },
        beforeChange(s, a, b) { user.beforeChange && user.beforeChange(s, a, b); emit('before-change', a, b, s); },
      });
      return o;
    };
    const start = (el) => {
      host = el;
      inst = new Mozert(el, merged());
      emit('init', inst);
    };
    const stop = () => {
      if (inst) { inst.destroy(); inst = null; }
      host = null;
    };
    expose({ slider: () => inst, element: () => host });
    return () => {
      const kids = slidesOf(slots.default ? slots.default() : []);
      const key = kids.map((k, i) => (k.key != null ? String(k.key) : '_' + i)).join('|') + '::' + sig(Object.assign({}, props.options, pickPlain(attrs)));
      const passAttrs = {};
      ['class', 'style', 'id'].forEach((k) => { if (attrs[k] !== undefined) passAttrs[k] = attrs[k]; });
      return h(props.tag, Object.assign({ key, onVnodeMounted: (vn) => start(vn.el), onVnodeBeforeUnmount: stop }, passAttrs), kids);
    };
  },
});

function pickPlain(attrs) {
  const o = {};
  Object.keys(attrs).forEach((k) => {
    if (k === 'class' || k === 'style' || k === 'id' || /^on[A-Z]/.test(k) || /^data-|^aria-/.test(k)) return;
    o[k] = attrs[k];
  });
  return o;
}

export default MozertSlider;
export { Mozert };
