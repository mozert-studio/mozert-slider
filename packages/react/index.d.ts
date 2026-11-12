import * as React from 'react';
import Mozert from '@mozert-studio/mozert-slider';

export interface MozertSliderProps extends Record<string, any> {
  /** Any Mozert option can be passed as a prop (slidesToShow, dots, effect, thumbs, lightbox...). */
  options?: Record<string, any>;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  /** Element to render, default "div". */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  /** Called with the slider instance once it is created. */
  onInit?: (slider: Mozert) => void;
  /** Called after the slide changes. */
  onChange?: (index: number, slider: Mozert) => void;
  onBeforeChange?: (from: number, to: number, slider: Mozert) => void;
}
export interface MozertSliderHandle {
  readonly slider: Mozert | null;
  readonly element: HTMLElement | null;
}
export const MozertSlider: React.ForwardRefExoticComponent<MozertSliderProps & React.RefAttributes<MozertSliderHandle>>;
export default MozertSlider;
export { Mozert };
