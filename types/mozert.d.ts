export type Easing = 'linear' | 'swing' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad' | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic' | 'easeInOutQuart' | ((t: number) => number);
type NodeLike = string | Element | ArrayLike<Element>;

export interface MozertOptions {
  /** Slides visible at once; fractional values (2.5) are supported. */
  spaceBetween?: number;
  slideWidth?: number;
  edgePadding?: number | string;
  touchRatio?: number;
  dragThreshold?: number;
  disableOnInteraction?: boolean;
  autoplayReverse?: boolean;
  stopOnLastSlide?: boolean;
  effect?: 'slide' | 'fade' | 'coverflow' | 'cube' | 'flip' | 'cards' | 'creative' | 'expand';
  expandEffect?: { extra?: number };
  coverflowEffect?: { rotate?: number; depth?: number; scale?: number; stretch?: number; modifier?: number; lift?: number; fade?: number };
  cubeEffect?: { perspective?: number };
  flipEffect?: { perspective?: number; limitRotation?: boolean };
  cardsEffect?: { perSlideOffset?: number; perSlideRotate?: number; rotate?: boolean; visible?: number };
  creativeEffect?: { limitProgress?: number; prev?: MozertCreativeStep; next?: MozertCreativeStep };
  freeMode?: boolean | { momentum?: boolean; momentumRatio?: number; sticky?: boolean; minimumVelocity?: number };
  mousewheel?: boolean | { sensitivity?: number; forceToAxis?: boolean; releaseOnEdges?: boolean; thresholdTime?: number };
  globalKeyboard?: boolean | { onlyInViewport?: boolean };
  parallax?: boolean;
  zoom?: boolean | { max?: number; min?: number; toggle?: boolean; step?: number };
  virtual?: { slides: any[]; renderSlide?: (data: any, index: number) => string | Element; addSlidesBefore?: number; addSlidesAfter?: number; cache?: boolean };
  hashNavigation?: boolean | { watchState?: boolean; replaceState?: boolean; prefix?: string };
  scrollbar?: boolean | { el?: string | Element; draggable?: boolean; hide?: boolean };
  pagination?: boolean | MozertPagination;
  marquee?: boolean | { speed?: number; pauseOnHover?: boolean; direction?: 'left' | 'right' };
  videoAutoplay?: boolean | { wait?: boolean; pauseOthers?: boolean; rewind?: boolean };
  fullscreen?: boolean;
  thumbs?: boolean | string | Element | { el?: string | Element; count?: number; position?: 'bottom' | 'top' | 'left' | 'right'; breakpoint?: number; options?: MozertOptions };
  lightbox?: boolean | { zoom?: boolean; loop?: boolean; maxZoom?: number };
  magnifier?: boolean | { zoom?: number; button?: boolean; active?: boolean };
  scrollDriven?: boolean | { step?: number; top?: number | 'center'; offset?: number; speed?: number; fill?: boolean; bottom?: number; maxHeight?: number };
  bleed?: boolean | 'left' | 'right';
  accessibility: boolean;
  adaptiveHeight: boolean;
  appendArrows: NodeLike | null;
  appendDots: NodeLike | null;
  arrows: boolean;
  asNavFor: string | Element | Mozert | null;
  autoplay: boolean;
  autoplaySpeed: number;
  centerMode: boolean;
  centerPadding: string;
  cssEase: string;
  customPaging: ((slider: Mozert, index: number) => string | Element) | null;
  dots: boolean;
  dotsClass: string;
  draggable: boolean;
  easing: Easing;
  edgeFriction: number;
  fade: boolean;
  focusOnSelect: boolean;
  infinite: boolean;
  initialSlide: number;
  lazyLoad: 'ondemand' | 'progressive';
  mobileFirst: boolean;
  nextArrow: string | Element | null;
  pauseOnDotsHover: boolean;
  pauseOnFocus: boolean;
  pauseOnHover: boolean;
  prevArrow: string | Element | null;
  respectReducedMotion: boolean;
  respondTo: 'window' | 'slider' | 'min';
  responsive: MozertBreakpoint[] | null;
  rows: number;
  rtl: boolean;
  slide: string;
  slidesPerRow: number;
  slidesToScroll: number;
  slidesToShow: number;
  speed: number;
  swipe: boolean;
  swipeToSlide: boolean;
  touchMove: boolean;
  touchThreshold: number;
  useCSS: boolean;
  useTransform: boolean;
  variableWidth: boolean;
  vertical: boolean;
  verticalSwiping: boolean;
  waitForAnimate: boolean;
  zIndex: number;
  on: Partial<{ [K in keyof MozertEvents]: (slider: Mozert, ...args: MozertEvents[K]) => void }> | null;
}

export interface MozertBreakpoint {
  breakpoint: number;
  settings: Partial<MozertOptions> | 'destroy';
}

export interface MozertEvents {
  init: [];
  reInit: [];
  beforeChange: [current: number, next: number];
  afterChange: [current: number];
  breakpoint: [breakpoint: number | null];
  edge: [direction: 'left' | 'right' | 'up' | 'down'];
  swipe: [direction: 'left' | 'right' | 'up' | 'down'];
  setPosition: [];
  lazyLoaded: [image: HTMLImageElement, src: string];
  lazyLoadError: [image: HTMLImageElement, src: string];
  destroy: [];
}

export interface MozertState {
  active: boolean;
  current: number;
  count: number;
  total: number;
  inner: number;
  clones: number;
  offset: number;
  animating: boolean;
  canNavigate: boolean;
  playing: boolean;
  breakpoint: number | null;
}

export default class Mozert {
  /** Present when the lightbox option is on. */
  lightbox?: { open(index: number): void; close(): void; readonly isOpen: boolean };
  /** Present when magnifier is on. */
  magnifier?: { enable(): void; disable(): void; toggle(): void; isOn(): boolean };
  /** Present when scrollDriven is on. */
  scrollDriven?: { update(): void };
  static readonly version: string;
  static readonly defaults: MozertOptions;
  static get(el: string | Element): Mozert | null;
  static use(module: { name: string; defaults?: object; create(slider: Mozert): { destroy(): void } | null }): typeof Mozert;
  static initAll(root?: ParentNode, options?: Partial<MozertOptions>): Mozert[];

  constructor(el: string | Element, options?: Partial<MozertOptions>);

  readonly el: Element;
  readonly track: HTMLElement;
  readonly list: HTMLElement;

  next(): this;
  prev(): this;
  goTo(index: number, instant?: boolean): this;
  currentSlide(): number;
  slideCount(): number;
  play(): this;
  pause(): this;
  isPlaying(): boolean;
  add(markup: string | Element, index?: number | boolean, addBefore?: boolean): this | false;
  remove(index?: number | boolean, removeBefore?: boolean): this | false;
  removeAll(): this;
  filter(selectorOrFn: string | ((this: Element, index: number, el: Element) => boolean)): this;
  unfilter(): this;
  getSlides(): Element[];
  getOption<K extends keyof MozertOptions>(name: K): MozertOptions[K];
  setOption<K extends keyof MozertOptions>(name: K, value: MozertOptions[K], refresh?: boolean): this;
  setOption(options: Partial<MozertOptions>, refresh?: boolean): this;
  getState(): MozertState;
  refresh(): this;
  setPosition(): this;
  destroy(): this;

  on<K extends keyof MozertEvents>(name: K, fn: (slider: Mozert, ...args: MozertEvents[K]) => void): this;
  one<K extends keyof MozertEvents>(name: K, fn: (slider: Mozert, ...args: MozertEvents[K]) => void): this;
  once<K extends keyof MozertEvents>(name: K, fn: (slider: Mozert, ...args: MozertEvents[K]) => void): this;
  off(name?: keyof MozertEvents, fn?: (...args: any[]) => void): this;
}

export { Mozert };

export interface MozertCreativeStep { translate?: (string | number)[]; rotate?: number[]; opacity?: number; scale?: number; zIndex?: number }
export interface MozertPagination {
  el?: string | Element;
  type?: 'bullets' | 'dynamic' | 'fraction' | 'progressbar' | 'custom';
  clickable?: boolean;
  dynamicMainBullets?: number;
  progressbarOpposite?: boolean;
  renderBullet?: (index: number, className: string) => string;
  renderFraction?: (currentClass: string, totalClass: string, current: number, total: number) => string;
  renderCustom?: (slider: Mozert, current: number, total: number) => string;
}

