/* Responsive homepage ordering.
   Keeps the intended portfolio-first mobile order without depending on a
   particular <script> element already being present in the page. */
(function(){
  'use strict';

  var MOBILE_ORDER = [
    'hero',
    'selected-work',
    'ways-i-can-help',
    'stats',
    'feedback',
    'testimonials',
    'talks',
    'education',
    'contact'
  ];

  var DESKTOP_ORDER = [
    'hero',
    'stats',
    'selected-work',
    'ways-i-can-help',
    'feedback',
    'testimonials',
    'talks',
    'education',
    'contact'
  ];

  var currentMode = null;
  var anchor = null;

  function getSection(id){
    var el = document.getElementById(id);
    return el && el.parentNode === document.body ? el : null;
  }

  function ensureAnchor(){
    if (anchor && anchor.parentNode) return anchor;

    anchor = document.createComment('portfolio-section-order-anchor');

    var contact = document.getElementById('contact');
    if (contact && contact.parentNode === document.body) {
      contact.parentNode.insertBefore(anchor, contact.nextSibling);
    } else {
      document.body.appendChild(anchor);
    }

    return anchor;
  }

  function applyOrder(order){
    var marker = ensureAnchor();

    order.forEach(function(id){
      var el = getSection(id);
      if (el) {
        marker.parentNode.insertBefore(el, marker);
      }
    });
  }

  function sync(){
    var isMobile = window.matchMedia('(max-width: 860px)').matches;
    var nextMode = isMobile ? 'mobile' : 'desktop';

    if (nextMode === currentMode) return;
    currentMode = nextMode;

    applyOrder(isMobile ? MOBILE_ORDER : DESKTOP_ORDER);
  }

  function init(){
    sync();

    var media = window.matchMedia('(max-width: 860px)');
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync);
    } else if (typeof media.addListener === 'function') {
      media.addListener(sync);
    }

    window.addEventListener('orientationchange', function(){
      window.setTimeout(sync, 80);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
