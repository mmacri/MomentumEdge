// Nav loader: fetches includes/nav.html and wires up links
(function(){
  // small util: find focusable elements
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  async function loadNav(){
    try{
      // Build a list of candidate URLs to fetch the nav from by walking up
      // the current path segments. This handles sites served at domain root
      // and project pages hosted under a subpath (e.g. /RepoName/...).
      const candidates = [];
      try{
        const pathSegs = location.pathname.split('/').filter(Boolean);
        // try from deepest prefix to root: /a/b -> /a/b/includes/nav.html, /a/includes/nav.html, /includes/nav.html
        for(let n = pathSegs.length; n >= 0; n--){
          const prefix = n === 0 ? '' : '/' + pathSegs.slice(0,n).join('/');
          const candidate = location.origin + prefix + '/includes/nav.html';
          candidates.push(candidate);
        }
      }catch(e){ /* ignore */ }
      // Also try script-relative path if available (covers some hosting setups)
      try{
        const cs = document.currentScript && document.currentScript.src;
        if(cs){
          const sUrl = new URL(cs, location.href);
          const base = sUrl.origin + sUrl.pathname.replace(/\/[^\/]*$/, '');
          candidates.unshift(base + '/includes/nav.html');
        }
      }catch(e){ /* ignore */ }
      // Last-resort relative fetches (may be relative to current folder)
      candidates.push('includes/nav.html');
      candidates.push('./includes/nav.html');
      let resp = null;
      let html = null;
      for(const p of candidates){
        try{
          resp = await fetch(p);
          if(resp && resp.ok){
            html = await resp.text();
            console.info && console.info('nav-loader: loaded nav from', p);
            break;
          }
        }catch(e){ /* ignore and try next */ }
      }
      if(!html) return;
      const container = document.createElement('div');
      container.innerHTML = html;

      // Compute site root from the fetched nav URL so links become absolute and work
      // whether the site is served from domain root or a project subpath (GitHub Pages).
      const navUrlObj = new URL(resp.url, location.href);
      let siteRoot = navUrlObj.origin + navUrlObj.pathname.replace(/\/includes\/nav\.html$/, '');
      siteRoot = siteRoot.replace(/\/$/, '');

      // Resolve data-href -> absolute href using siteRoot
      container.querySelectorAll('[data-href]').forEach(el=>{
        const target = el.getAttribute('data-href') || '';
        let resolved = '';
        // if target is already absolute URL, keep it
        if (/^https?:\/\//i.test(target)) {
          resolved = target;
        } else if (target.startsWith('/')) {
          // domain-root absolute path -> append to siteRoot
          resolved = siteRoot + target;
        } else {
          // path relative to site root
          resolved = siteRoot + '/' + target.replace(/^\/+/, '');
        }

        if (el.tagName.toLowerCase() === 'a') el.setAttribute('href', resolved);
        else el.setAttribute('data-resolved-href', resolved);
      });

  // append nav to top of body
      const header = container.firstElementChild;
      if(header) document.body.insertBefore(header, document.body.firstChild);

      // wire up click-on-non-anchor elements that used data-href
      header.querySelectorAll('[data-resolved-href]').forEach(el=>{
        const href = el.getAttribute('data-resolved-href');
        el.addEventListener('click', ()=> { location.href = href; });
        el.style.cursor = 'pointer';
      });

      // get toggle and menu elements
      const toggle = document.getElementById('nav-toggle');
      const menu = document.getElementById('nav-menu');
      let lastFocused = null;

      function openMenu(){
        if(!menu || !toggle) return;
        menu.classList.remove('hidden');
        menu.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded','true');
        // save last focused element so we can restore
        lastFocused = document.activeElement;
        // focus first focusable element in menu
        const first = menu.querySelector(FOCUSABLE);
        if(first) first.focus();
        // add document key handlers
        document.addEventListener('keydown', onKeyDown);
      }

      function closeMenu(){
        if(!menu || !toggle) return;
        menu.classList.add('hidden');
        menu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded','false');
        // remove key handler
        document.removeEventListener('keydown', onKeyDown);
        // restore focus
        if(lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
      }

      function onKeyDown(e){
        if(!menu) return;
        // close on Escape
        if(e.key === 'Escape' || e.key === 'Esc'){
          e.preventDefault();
          closeMenu();
          return;
        }
        // trap Tab inside menu
        if(e.key === 'Tab'){
          const focusables = Array.from(menu.querySelectorAll(FOCUSABLE)).filter(n=>n.offsetParent !== null);
          if(focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length -1];
          if(e.shiftKey){
            if(document.activeElement === first){
              e.preventDefault();
              last.focus();
            }
          }else{
            if(document.activeElement === last){
              e.preventDefault();
              first.focus();
            }
          }
        }
      }

      if(toggle && menu){
        // ensure menu has aria-hidden by default
        if(!menu.hasAttribute('aria-hidden')) menu.setAttribute('aria-hidden', 'true');
        toggle.addEventListener('click', ()=>{
          const expanded = toggle.getAttribute('aria-expanded') === 'true';
          if(expanded) closeMenu(); else openMenu();
        });

        // clicking outside the menu should close it
        document.addEventListener('click', (ev)=>{
          if(!menu || !toggle) return;
          if(menu.classList.contains('hidden')) return;
          const target = ev.target;
          if(!menu.contains(target) && target !== toggle && !toggle.contains(target)){
            closeMenu();
          }
        });
      }

      // wire CTA buttons and nav-link active state (same as before)
      header.querySelectorAll('.cta-btn').forEach(b=>{
        b.addEventListener('click', ()=>{
          const href = b.getAttribute('data-resolved-href') || b.getAttribute('data-href') || b.getAttribute('href');
          if(href) location.href = href;
        });
      });

      // Highlight current nav link by comparing normalized pathnames
      header.querySelectorAll('.nav-link').forEach(a=>{
        try {
          const href = a.getAttribute('href') || a.getAttribute('data-href') || '';
          if (!href) return;
          const hrefPath = new URL(href, location.href).pathname.replace(/\/index\.html$/, '');
          const locPath = location.pathname.replace(/\/index\.html$/, '');
          if (hrefPath === locPath || locPath.endsWith(hrefPath)) {
            a.classList.add('text-primary','font-bold');
          }
        } catch(e) { /* ignore malformed URLs */ }
      });

      // mobile links navigate and close menu after navigation
      header.querySelectorAll('.mobile-link').forEach(a=>{
        a.addEventListener('click', (ev)=>{
          const dh = a.getAttribute('data-resolved-href') || a.getAttribute('data-href') || a.getAttribute('href') || '';
          if(dh){
            // small timeout to allow click visual before navigation
            setTimeout(()=>{ location.href = dh; }, 30);
          }
        });
      });

    }catch(e){ console.error('nav loader error', e); }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadNav);
  else loadNav();
})();
