// ============================================
// DERATISATION.FR — Main JavaScript v2
// Navigation, Animations, Utilitaires
// ============================================
(function() {
  'use strict';

  const doc = document;
  const $ = (sel, ctx) => (ctx || doc).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || doc).querySelectorAll(sel));

  doc.addEventListener('DOMContentLoaded', function() {

    // --- Mobile Nav Toggle ---
    const navToggle = $('.nav-toggle');
    const nav = $('.nav');

    if (navToggle && nav) {
      navToggle.addEventListener('click', function() {
        const isOpen = nav.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      // Close on link click
      $$('a', nav).forEach(function(link) {
        link.addEventListener('click', function() {
          nav.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        });
      });

      // Close on outside click
      doc.addEventListener('click', function(e) {
        if (!e.target.closest('.header')) {
          nav.classList.remove('open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }





    // --- FAQ Accordion ---
    $$('.faq-item').forEach(function(item) {
      var question = $('.faq-question', item);
      if (question) {
        question.addEventListener('click', function() {
          // Close others
          $$('.faq-item.open').forEach(function(other) {
            if (other !== item) other.classList.remove('open');
          });
          item.classList.toggle('open');
        });
      }
    });

    // --- Pricing tabs ---
    $$('.pricing-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var target = tab.getAttribute('data-target');
        $$('.pricing-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        $$('.pricing-table').forEach(function(t) { t.classList.remove('active'); });
        var targetTable = doc.getElementById(target);
        if (targetTable) targetTable.classList.add('active');
      });
    });

    // --- Urgence bar ---
    var urgenceClose = $('.urgence-close');
    var urgenceBar = $('.urgence-floating');
    if (urgenceClose && urgenceBar) {
      urgenceClose.addEventListener('click', function() {
        urgenceBar.classList.remove('show');
        try { localStorage.setItem('urgence_dismissed', Date.now()); } catch(e) {}
      });

      // Show after 30s if not dismissed in last 24h
      try {
        var dismissed = localStorage.getItem('urgence_dismissed');
        if (!dismissed || (Date.now() - parseInt(dismissed) > 86400000)) {
          setTimeout(function() { urgenceBar.classList.add('show'); }, 30000);
        }
      } catch(e) {
        setTimeout(function() { urgenceBar.classList.add('show'); }, 30000);
      }
    }



  });
})();
