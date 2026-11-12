import { DefineComponent } from 'vue';
import Mozert from '@mozert-studio/mozert-slider';

/** Props: `options` (object) and `tag`. Any other attribute (slidesToShow, dots, effect, thumbs, lightbox...) is passed to Mozert as an option. Events: init, change, before-change. */
export const MozertSlider: DefineComponent<{ options?: Record<string, any>; tag?: string } & Record<string, any>>;
export default MozertSlider;
export { Mozert };
