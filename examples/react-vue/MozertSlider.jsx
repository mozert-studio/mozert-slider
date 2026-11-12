import React, { useEffect, useRef, Children } from 'react';
import Mozert from '@mozert-studio/mozert-slider';
import '@mozert-studio/mozert-slider/css';
import '@mozert-studio/mozert-slider/theme.css';

// Inner component: owns one Mozert instance for one set of slides.
function Inner({ options, onInit, children, className }) {
  const el = useRef(null);
  useEffect(() => {
    const inst = new Mozert(el.current, options);
    onInit && onInit(inst);
    return () => inst.destroy(); // puts slides back before React removes the node
  }, []); // eslint-disable-line
  return <div ref={el} className={className}>{children}</div>;
}

// Re-creates the slider when the number of slides or the options change,
// so React and Mozert never fight over the same DOM nodes.
export default function MozertSlider({ options = {}, onInit, className, children }) {
  const count = Children.count(children);
  return <Inner key={count + JSON.stringify(options)} options={options} onInit={onInit} className={className}>{children}</Inner>;
}
