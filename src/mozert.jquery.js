/*!
 * Mozert jQuery adapter v1.1.0 | MIT
 * Usage:  $('.slider').mozert({ dots: true });
 *         $('.slider').mozert('next');
 *         $('.slider').on('afterChange', function (event, slider, current) {});
 */
(function (factory) {
  if (typeof define === 'function' && define.amd) { define(['jquery', 'mozert'], factory); }
  else if (typeof module === 'object' && module.exports) { module.exports = function (jq, D) { return factory(jq, D); }; }
  else { factory(window.jQuery, window.Mozert); }
}(function ($, Mozert) {
  'use strict';
  if (!$ || !Mozert) return;

  // Fire jQuery events too, with the signature (event, slider, ...args)
  Mozert._bridge = function (inst, name, args) {
    $(inst.el).trigger(name, [inst].concat(args));
  };

  var GETTERS = { currentSlide: 1, getOption: 1, getInstance: 1, isPlaying: 1, slideCount: 1 };

  $.fn.mozert = function (opt) {
    var rest = Array.prototype.slice.call(arguments, 1), ret = this;
    for (var i = 0; i < this.length; i++) {
      var el = this[i], inst = Mozert.get(el);
      if (typeof opt === 'object' || opt === undefined) {
        if (!inst) { new Mozert(el, opt); }
        else if (opt) { inst.setOption(opt); }
      } else if (typeof opt === 'string') {
        var name = opt;
        if (!inst) continue;
        if (name === 'getInstance') { return inst; }
        if (typeof inst[name] !== 'function') { $.error('mozert: unknown method "' + opt + '"'); }
        var res = inst[name].apply(inst, rest);
        if (GETTERS[name]) { return res; }
        ret = this;
      }
    }
    return ret;
  };
  return $;
}));
