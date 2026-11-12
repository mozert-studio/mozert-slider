import { createElement, forwardRef, useEffect, useRef, useImperativeHandle, Children, useMemo } from 'react';
import Mozert from '@mozert-studio/mozert-slider';

// Props that belong to the component, everything else is passed to Mozert as an option.
const OWN = ['children', 'className', 'style', 'options', 'onInit', 'onChange', 'onBeforeChange', 'on', 'as', 'id'];

function pickOptions(props) {
  const o = Object.assign({}, props.options);
  Object.keys(props).forEach((k) => {
    if (OWN.indexOf(k) === -1 && props[k] !== undefined) o[k] = props[k];
  });
  return o;
}

// A signature that changes only when slides are added, removed or reordered, or an option changes.
function signature(children, options) {
  const keys = Children.toArray(children).map((c) => (c && c.key != null ? c.key : '_'));
  return keys.join('|') + '::' + JSON.stringify(options, (k, v) => (typeof v === 'function' ? '[fn]' : v));
}

const Inner = forwardRef(function Inner(props, ref) {
  const el = useRef(null);
  const inst = useRef(null);
  const latest = useRef(props);
  latest.current = props;
  useImperativeHandle(ref, () => ({ get slider() { return inst.current; }, get element() { return el.current; } }), []);
  useEffect(() => {
    const p = latest.current;
    const options = pickOptions(p);
    const user = Object.assign({}, options.on);
    options.on = Object.assign({}, user, {
      afterChange(s, index) {
        user.afterChange && user.afterChange(s, index);
        latest.current.onChange && latest.current.onChange(index, s);
      },
      beforeChange(s, from, to) {
        user.beforeChange && user.beforeChange(s, from, to);
        latest.current.onBeforeChange && latest.current.onBeforeChange(from, to, s);
      },
    });
    const s = new Mozert(el.current, options);
    inst.current = s;
    p.onInit && p.onInit(s);
    return () => {
      // Put the slides back before React removes the element.
      s.destroy();
      inst.current = null;
    };
  }, []);
  return createElement(latest.current.as || 'div', { ref: el, className: props.className, style: props.style, id: props.id }, props.children);
});

/**
 * <MozertSlider slidesToShow={3} dots onChange={(i) => ...}>{items.map(i => <div key={i.id}>…</div>)}</MozertSlider>
 * Every child must render one DOM element. Give children a `key` so the slider can follow reordering.
 * The ref gives { slider, element }.
 */
export const MozertSlider = forwardRef(function MozertSlider(props, ref) {
  const options = pickOptions(props);
  const sig = useMemo(() => signature(props.children, options), [props.children, JSON.stringify(options, (k, v) => (typeof v === 'function' ? '[fn]' : v))]);
  return createElement(Inner, Object.assign({}, props, { key: sig, ref }));
});

export default MozertSlider;
export { Mozert };
