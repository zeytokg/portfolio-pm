/* Mobile-only homepage reordering.
   On phones the homepage shows a different content sequence (portfolio-first)
   than desktop (recruiter-first). This moves the same DOM nodes into place
   instead of duplicating content. Desktop order is restored if the window
   is resized back above the breakpoint. */
(function(){
  var MOBILE_ORDER = ['hero','selected-work','ways-i-can-help','about-me','stats','feedback','testimonials','education','contact'];
  var DESKTOP_ORDER = ['hero','about-me','stats','selected-work','ways-i-can-help','feedback','testimonials','education','contact'];
  var anchor = document.querySelector('body > script');
  function apply(order){
    if (!anchor) return;
    order.forEach(function(id){
      var el = document.getElementById(id);
      if (el) anchor.parentNode.insertBefore(el, anchor);
    });
  }
  var currentlyMobile = null;
  function sync(){
    var mobile = window.innerWidth <= 860;
    if (mobile === currentlyMobile) return;
    currentlyMobile = mobile;
    apply(mobile ? MOBILE_ORDER : DESKTOP_ORDER);
  }
  sync();
  window.addEventListener('resize', sync);
})();
