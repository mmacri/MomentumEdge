// Nav loader: fetches includes/nav.html and wires up links
(function(){
  // small util: find focusable elements
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  async function loadNav(){
    try{
  // Fetch the nav include from the site root. This keeps behavior consistent
  // across pages (the include is located at /includes/nav.html).
  const resp = await fetch('/includes/nav.html');
      if(!resp.ok) return;
      const html = await resp.text();
      const container = document.createElement('div');
      container.innerHTML = html;

      // Resolve data-href -> href using root-relative paths
      container.querySelectorAll('[data-href]').forEach(el=>{
        const target = el.getAttribute('data-href') || '';
        const resolved = target.startsWith('/') ? target : ('/' + target.replace(/^\/+/,''));
        if(el.tagName.toLowerCase() === 'a') el.setAttribute('href', resolved);
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
          const href = b.getAttribute('data-href') || b.getAttribute('href');
          if(href) location.href = href.startsWith('/') ? href : ('/' + href.replace(/^\/+/,''));
        });
      });

      const currentPath = location.pathname.replace(/\/index\.html$|^\//, '');
      header.querySelectorAll('.nav-link').forEach(a=>{
        const dh = a.getAttribute('data-href') || a.getAttribute('href') || '';
        const target = dh.replace(/^\//,'').replace(/index\.html$/,'');
        if(target === currentPath || ('/' + target) === location.pathname){
          a.classList.add('text-primary','font-bold');
        }
      });

      // mobile links navigate and close menu after navigation
      header.querySelectorAll('.mobile-link').forEach(a=>{
        a.addEventListener('click', (ev)=>{
          const dh = a.getAttribute('data-href') || a.getAttribute('href') || '';
          if(dh){
            // small timeout to allow click visual before navigation
            setTimeout(()=>{ location.href = dh.startsWith('/') ? dh : ('/' + dh.replace(/^\/+/,'')); }, 30);
          }
        });
      });

    }catch(e){ console.error('nav loader error', e); }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadNav);
  else loadNav();
})();
