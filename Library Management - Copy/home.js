/* =========================================================
   home.js — logic for index.html
   - Auto-detects your localStorage keys (no config needed)
   - Renders featured books from LibraryData.catalog
   - Shows reservations preview when signed in
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Auto-detect localStorage keys ---------- */
  // Scans localStorage for keys containing common fragments.
  // So whether libsys.js uses "session", "auth", "user",
  // "reservations", "loans", etc., we'll find it.
  function findKey(fragments) {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i) || '';
        var lk = k.toLowerCase();
        for (var j = 0; j < fragments.length; j++) {
          if (lk.indexOf(fragments[j]) !== -1) return k;
        }
      }
    } catch (e) {
      /* storage may be blocked (private mode / file://) */
    }
    return null;
  }

  var SESSION_KEY = findKey(['session', 'auth', 'login', 'user']);
  var RESERVATIONS_KEY = findKey(['reserv', 'booking', 'loan']);

  /* ---------- Helpers ---------- */
  function isSignedIn() {
    if (!SESSION_KEY) return false;
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      if (raw === 'true') return true;
      var s = JSON.parse(raw);
      if (!s) return false;
      return Boolean(
        s.regNo ||
        s.registrationNumber ||
        s.user ||
        s.email ||
        s.name
      );
    } catch (e) {
      return false;
    }
  }

  function getCatalog() {
    var d = window.LibraryData || {};
    if (Array.isArray(d.catalog)) return d.catalog;
    if (Array.isArray(d.books)) return d.books;
    if (Array.isArray(d)) return d;
    return [];
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) {
      alert(msg);
      return;
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      t.classList.remove('show');
    }, 3000);
  }

  /* ---------- Header: swap Sign in → My account ---------- */
  function syncAuthLink() {
    var link = document.getElementById('auth-link');
    var hero = document.getElementById('hero-cta');
    if (!link || !isSignedIn()) return;
    link.textContent = 'My account';
    link.href = 'Reservation.html';
    if (hero) {
      hero.textContent = 'Go to your reservations';
      hero.href = 'Reservation.html';
    }
  }

  /* ---------- Featured books grid ---------- */
  function renderFeatured() {
    var box = document.getElementById('featured-books');
    if (!box) return;

    var catalog = getCatalog();

    if (!catalog.length) {
      box.innerHTML =
        '<p class="sign-in-prompt">Catalogue is loading. Please refresh the page.</p>';
      box.setAttribute('aria-busy', 'false');
      return;
    }

    // Show first 4 books as "featured".
    // Change the number or use a different filter if you like.
    var featured = catalog.slice(0, 4);

    box.innerHTML = featured
      .map(function (b) {
        var cover = b.cover || b.image || b.img || '18222125.png';
        var title = b.title || b.name || 'Untitled';
        var author = b.author || b.writer || 'Unknown author';
        return (
          '<article class="book-card">' +
          '<img class="book-cover" src="' + escapeHtml(cover) +
          '" alt="Cover of ' + escapeHtml(title) +
          '" loading="lazy" decoding="async" />' +
          '<div class="book-body">' +
          '<h3>' + escapeHtml(title) + '</h3>' +
          '<p>by ' + escapeHtml(author) + '</p>' +
          '<button class="button button-primary" data-reserve="1">Reserve</button>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    box.setAttribute('aria-busy', 'false');

    // Reserve buttons → prompt sign-in if not signed in
    Array.prototype.forEach.call(
      box.querySelectorAll('[data-reserve]'),
      function (btn) {
        btn.addEventListener('click', function () {
          if (!isSignedIn()) {
            showToast('Please sign in to reserve a book.');
            setTimeout(function () {
              window.location.href = 'login-copy.html';
            }, 900);
          } else {
            window.location.href = 'libsys.html';
          }
        });
      }
    );
  }

  /* ---------- Reservations preview ---------- */
  function renderReservations() {
    var box = document.getElementById('reservations-preview');
    if (!box || !isSignedIn()) return;

    var items = [];
    if (RESERVATIONS_KEY) {
      try {
        var parsed = JSON.parse(
          localStorage.getItem(RESERVATIONS_KEY) || '[]'
        );
        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed && Array.isArray(parsed.items)) {
          items = parsed.items;
        }
      } catch (e) {
        items = [];
      }
    }

    if (!items.length) {
      box.innerHTML =
        '<p class="sign-in-prompt">You have no active reservations yet.</p>' +
        '<a href="libsys.html" class="button button-primary">Browse the catalogue</a>';
      return;
    }

    box.innerHTML =
      '<p class="sign-in-prompt">You have ' +
      items.length +
      ' active reservation' +
      (items.length === 1 ? '' : 's') +
      '.</p>' +
      '<a href="Reservation.html" class="button button-primary">Manage reservations</a>';
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    syncAuthLink();
    renderFeatured();
    renderReservations();
  });
})();
