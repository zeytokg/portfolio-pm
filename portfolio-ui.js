(function(){
  'use strict';
  document.documentElement.classList.add('js-ui-motion');

  function addLanguageSwitcher(){
    var topbar=document.querySelector('.topbar');
    if(!topbar || topbar.querySelector('.portfolio-lang-wrap')) return;

    /* All portfolio pages should use the same compact responsive nav. */
    var nav=topbar.querySelector('.desktop-inline-nav') || topbar.querySelector(':scope > div');
    if(nav) nav.classList.add('portfolio-main-nav');
    if(document.querySelector('.back-home-btn')) topbar.classList.add('topbar-has-floating-back');

    var wrap=document.createElement('div');
    wrap.className='portfolio-lang-wrap';

    var icon=document.createElement('span');
    icon.className='portfolio-lang-icon';
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15.3 15.3 0 0 1 0 18M12 3a15.3 15.3 0 0 0 0 18"/></svg>';

    var flag=document.createElement('span');
    flag.className='portfolio-lang-flag';
    flag.setAttribute('aria-hidden','true');
    flag.textContent='🇬🇧';

    var label=document.createElement('label');
    label.className='portfolio-lang-label';
    label.setAttribute('for','portfolioLangSelect');
    label.textContent='Language';

    var select=document.createElement('select');
    select.id='portfolioLangSelect';
    select.className='portfolio-lang-select';
    select.setAttribute('data-portfolio-lang','');
    select.setAttribute('aria-label','Language');
    select.innerHTML='<option value="en">EN</option><option value="it">IT</option><option value="tr">TR</option>';

    function syncFlag(){
      var flags={en:'🇬🇧',it:'🇮🇹',tr:'🇹🇷'};
      var code=(select.value || document.documentElement.lang || 'en').toLowerCase().split('-')[0];
      flag.textContent=flags[code] || flags.en;
    }
    select.addEventListener('change',syncFlag);

    wrap.appendChild(icon);
    wrap.appendChild(flag);
    wrap.appendChild(label);
    wrap.appendChild(select);
    topbar.appendChild(wrap);
    syncFlag();

    if(typeof MutationObserver!=='undefined'){
      new MutationObserver(syncFlag).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    }
  }

  function markActiveNavigation(){
    var path=(window.location.pathname.split('/').pop()||'index.html').toLowerCase();
    document.querySelectorAll('.topbar a[href]').forEach(function(a){
      var href=(a.getAttribute('href')||'').split('#')[0].split('?')[0];
      if(!href || /^https?:|^mailto:|^tel:/.test(href)) return;
      var target=(href.split('/').pop()||'index.html').toLowerCase();
      if((path==='index.html' && (target===''||target==='index.html')) || target===path){
        a.setAttribute('aria-current','page');
      }
    });
  }

  function makeCasesClickable(){
    var links={
      'case-love-eden-delivery':'casual-games.html#love-eden',
      'case-content-roadmap':'casual-games.html#love-eden',
      'case-six-cube':'casual-games.html#six-cube',
      'case-royale':'casual-games.html#royale-online',
      'case-wrestling-retention':'mobile-gaming.html#wrestling-trivia-run',
      'case-meme-challenge':'mobile-gaming.html#meme-challenge',
      'case-ar':'instagram-filters.html',
      'case-organic-growth':'work-with-me.html'
    };
    Object.keys(links).forEach(function(id){
      var el=document.getElementById(id);
      if(!el) return;
      el.setAttribute('role','link');
      el.setAttribute('tabindex','0');
      el.setAttribute('aria-label',(el.querySelector('h3')?.textContent||'View case')+' — view details');
      el.addEventListener('click',function(e){
        if(e.target.closest('a,button')) return;
        window.location.href=links[id];
      });
      el.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){e.preventDefault();window.location.href=links[id];}
      });
    });
  }

  function addSectionAnchors(){
    var ids={
      'Love Eden: Interactive Stories':'love-eden',
      'Royale Online (MMORPG)':'royale-online',
      '6 Cube Mystery':'six-cube',
      'Meme Challenge: Dank Memes':'meme-challenge',
      'Wrestling Trivia Run!':'wrestling-trivia-run'
    };
    document.querySelectorAll('h2,h3,.game-name').forEach(function(el){
      var t=el.textContent.trim();
      if(ids[t] && !document.getElementById(ids[t])){
        var host=el.closest('.game-block,.game,.highlight')||el;
        host.id=ids[t];
      }
    });
  }

  function addReveal(){
    var els=document.querySelectorAll('.section, .game-block, .highlight-grid, .game-grid, .filter-grid, .snap-grid, .tool-category, .cv-download-grid');
    els.forEach(function(el){el.classList.add('ui-reveal');});
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)){
      els.forEach(function(el){el.classList.add('ui-visible');}); return;
    }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('ui-visible');io.unobserve(entry.target);}});
    },{threshold:.08,rootMargin:'0px 0px -6% 0px'});
    els.forEach(function(el){io.observe(el);});
    setTimeout(function(){els.forEach(function(el){el.classList.add('ui-visible');});},2200);
  }

  function init(){
    addLanguageSwitcher();
    markActiveNavigation();
    makeCasesClickable();
    addSectionAnchors();
    addReveal();
    document.dispatchEvent(new CustomEvent('portfolio:ui-ready'));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
