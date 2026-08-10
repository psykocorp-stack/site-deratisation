// ============================================
// DERATISATION — Cinematique.js
// Motion scroll-driven (GSAP + ScrollTrigger + Lenis)
// Design system : bleu marine #0a1628 + ambre #f59e0b
// Ne modifie PAS formulaire.js / main.js (compat totale)
// ============================================
(function() {
  'use strict';

  // Raccourci si GSAP absent (évite de casser la page)
  if (typeof gsap === 'undefined') return;

  function isReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var REDUCED = isReducedMotion();

  document.addEventListener('DOMContentLoaded', function() {
    // Copie des variables marque en CSS (pour counters/texte animés)
    gsap.registerPlugin(ScrollTrigger);

    // ── 1. Lenis smooth scroll + sync ScrollTrigger ──
    var lenis = null;
    if (window.Lenis && !REDUCED) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function(time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
      // Ancres (href="#...") -> scroll Lenis fluide
      document.querySelectorAll('a[href^="#"]').forEach(function(a) {
        a.addEventListener('click', function(e) {
          var id = a.getAttribute('href').substring(1);
          var target = document.getElementById(id);
          if (!target) return;
          e.preventDefault();
          lenis.scrollTo(target, { offset: -70 });
        });
      });
    }

    // ── 2. Hero split-letter reveal (au chargement, respecte les spans) ──
    var heroTitle = document.querySelector('.hero-title');
    if (heroTitle && !REDUCED) {
      // Ne fend que les nœuds texte bruts, laisse les spans (highlight) intacts
      function splitNode(node) {
        var frag = document.createDocumentFragment();
        var text = node.textContent;
        for (var i = 0; i < text.length; i++) {
          var c = text[i];
          var s = document.createElement('span');
          s.className = 'hl';
          s.style.display = 'inline-block';
          s.style.whiteSpace = 'pre';
          s.textContent = c === ' ' ? '\u00A0' : c;
          frag.appendChild(s);
        }
        node.replaceWith(frag);
      }
      var nodes = [];
      heroTitle.querySelectorAll('*').forEach(function(el) {
        el.childNodes.forEach(function(ch) {
          if (ch.nodeType === 3 && ch.textContent.trim().length > 0) { nodes.push(ch); }
        });
      });
      heroTitle.childNodes.forEach(function(ch) {
        if (ch.nodeType === 3 && ch.textContent.trim().length > 0) { nodes.push(ch); }
      });
      if (heroTitle.dataset) { heroTitle.setAttribute('aria-label', heroTitle.textContent.trim()); }
      nodes.forEach(splitNode);
      var allHl = heroTitle.querySelectorAll('.hl');
      gsap.fromTo(allHl, { yPercent: 110, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: 0.7,
        stagger: 0.03, ease: 'power3.out'
      });
      var high = heroTitle.querySelector('.highlight');
      if (high) gsap.fromTo(high.querySelectorAll('.hl'), { yPercent: 110, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.03, ease: 'power3.out', delay: 0.25
      });
    }

    // ── 3. Reveal générique [data-reveal] ──
    if (!REDUCED) {
      gsap.utils.toArray('[data-reveal]').forEach(function(el) {
        gsap.fromTo(el, { y: 40, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%' }
        });
      });
    } else {
      document.querySelectorAll('[data-reveal]').forEach(function(el) { el.style.opacity = 1; });
    }

    // ── 4. Counters animés (stats-bar) ──
    var counters = document.querySelectorAll('[data-count]');
    if (counters.length && !REDUCED) {
      counters.forEach(function(el) {
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
        var obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.8, ease: 'power1.out',
          scrollTrigger: { trigger: el, start: 'top 90%' },
          onUpdate: function() { el.textContent = obj.v.toFixed(decimals) + suffix; }
        });
      });
    }

    // ── 5. Marquée infinie (bandeau "nuisibles" répétitif) ──
    var track = document.getElementById('marqueeTrack');
    if (track && !REDUCED) {
      gsap.to(track, { xPercent: -50, ease: 'none', duration: 24, repeat: -1 });
    }

    // ── 6. Parallaxe multi-couches + barre de progression ──
    var progressBar = document.getElementById('scrollProgress');
    if (progressBar && !REDUCED) {
      gsap.set(progressBar, { scaleX: 0 });
      gsap.to(progressBar, {
        scaleX: 1, ease: 'none',
        scrollTrigger: { start: 0, end: function() { return document.body.scrollHeight - window.innerHeight; }, scrub: 0.4 }
      });
    }
    if (!REDUCED) {
      gsap.utils.toArray('[data-parallax]').forEach(function(layer) {
        var speed = parseFloat(layer.getAttribute('data-parallax')) || 0.2;
        gsap.to(layer, {
          yPercent: speed * 100, ease: 'none',
          scrollTrigger: { trigger: layer, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    }

    // ── 7. Cards batch reveal (services / solutions) ──
    if (!REDUCED) {
      ScrollTrigger.batch('[data-batch]', {
        start: 'top 88%',
        onEnter: function(els) {
          gsap.fromTo(els, { y: 46, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: 'power2.out' });
        }
      });
    } else {
      document.querySelectorAll('[data-batch]').forEach(function(el) { el.style.opacity = 1; });
    }

    // ── 8. Horizontal scroll (galerie bandeaux métier) ──
    var hTrack = document.getElementById('horizTrack');
    if (hTrack && !REDUCED) {
      var getDist = function() { return -(hTrack.scrollWidth - window.innerWidth); };
      gsap.to(hTrack, {
        x: getDist, ease: 'none',
        scrollTrigger: {
          trigger: '#horizWrap', start: 'top top', end: function() { return '+=' + (hTrack.scrollWidth - window.innerWidth); },
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
        }
      });
    }

    // Refresh ScrollTrigger apres chargement images
    window.addEventListener('load', function() { ScrollTrigger.refresh(); });
  });
})();
