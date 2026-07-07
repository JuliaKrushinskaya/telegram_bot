(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- word-level text reveal (preserves <br> line breaks) ---------------- */
  function wrapWords(el) {
    var wordIndex = 0;
    function wrapText(text) {
      var frag = document.createDocumentFragment();
      text.split(/(\s+)/).forEach(function (token) {
        if (!token.length) return;
        if (/^\s+$/.test(token)) {
          frag.appendChild(document.createTextNode(token));
        } else {
          var mask = document.createElement('span');
          mask.className = 'word-mask';
          var word = document.createElement('span');
          word.className = 'word';
          word.style.setProperty('--w', wordIndex++);
          word.textContent = token;
          mask.appendChild(word);
          frag.appendChild(mask);
        }
      });
      return frag;
    }
    var newFrag = document.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        newFrag.appendChild(wrapText(node.textContent));
      } else {
        newFrag.appendChild(node.cloneNode(true));
      }
    });
    el.innerHTML = '';
    el.appendChild(newFrag);
  }

  var textRevealEls = document.querySelectorAll('.text-reveal');
  if (!reduceMotion) {
    textRevealEls.forEach(wrapWords);
  }

  /* ---------------- scroll reveal ---------------- */
  var revealEls = document.querySelectorAll('.reveal, .text-reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- month tabs ---------------- */
  var tabs = document.querySelectorAll('.tab');
  var panels = {
    'tab-august': document.getElementById('panel-august'),
    'tab-september': document.getElementById('panel-september'),
    'tab-october': document.getElementById('panel-october')
  };

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        t.setAttribute('aria-selected', 'false');
        t.tabIndex = -1;
      });
      tab.setAttribute('aria-selected', 'true');
      tab.tabIndex = 0;

      Object.keys(panels).forEach(function (id) {
        panels[id].hidden = id !== tab.id;
      });

      if (!reduceMotion) {
        var newlyRevealed = panels[tab.id].querySelectorAll('.reveal:not(.is-visible)');
        newlyRevealed.forEach(function (el) { el.classList.add('is-visible'); });
      }
    });

    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var list = Array.prototype.slice.call(tabs);
      var i = list.indexOf(tab);
      var next = e.key === 'ArrowRight' ? list[(i + 1) % list.length] : list[(i - 1 + list.length) % list.length];
      next.focus();
      next.click();
    });
  });

  /* ---------------- class card accordion ---------------- */
  document.querySelectorAll('.card__toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.card');
      var more = card.querySelector('.card__more');
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      more.hidden = open;
      btn.firstChild.textContent = open ? 'Подробнее ' : 'Свернуть ';
    });
  });

  /* ---------------- facilitator "read more" ---------------- */
  var facToggle = document.querySelector('.fac-toggle');
  if (facToggle) {
    facToggle.addEventListener('click', function () {
      var more = document.getElementById('fac-more');
      var open = facToggle.getAttribute('aria-expanded') === 'true';
      facToggle.setAttribute('aria-expanded', String(!open));
      more.hidden = open;
      facToggle.firstChild.textContent = open ? 'Узнать больше обо мне ' : 'Свернуть ';
    });
  }

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var answer = btn.nextElementSibling;
      var open = btn.getAttribute('aria-expanded') === 'true';

      document.querySelectorAll('.faq-q').forEach(function (other) {
        if (other !== btn) {
          other.setAttribute('aria-expanded', 'false');
          other.nextElementSibling.removeAttribute('data-open');
        }
      });

      btn.setAttribute('aria-expanded', String(!open));
      if (open) {
        answer.removeAttribute('data-open');
      } else {
        answer.setAttribute('data-open', 'true');
      }
    });
  });

  /* ---------------- sticky mobile CTA ---------------- */
  var stickyCta = document.getElementById('sticky-cta');
  var hero = document.querySelector('.hero');
  var finalCta = document.getElementById('final-cta');

  if (stickyCta && hero && 'IntersectionObserver' in window) {
    var heroInView = true;
    var finalInView = false;

    var visibilityIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === hero) heroInView = entry.isIntersecting;
        if (entry.target === finalCta) finalInView = entry.isIntersecting;
      });
      stickyCta.classList.toggle('is-visible', !heroInView && !finalInView);
    }, { threshold: 0.15 });

    visibilityIO.observe(hero);
    if (finalCta) visibilityIO.observe(finalCta);
  }

  /* ---------------- registration modal ---------------- */
  var overlay = document.getElementById('registration-overlay');
  var closeBtn = document.getElementById('registration-close');
  var form = document.getElementById('registration-form');
  var classCheckboxes = document.querySelectorAll('input[name="classes"]');
  var classError = document.getElementById('reg-class-error');
  var selectAllBtn = document.getElementById('reg-select-all');
  var statusEl = document.getElementById('reg-form-status');
  var lastFocused = null;

  function openModal(className) {
    if (!overlay) return;
    lastFocused = document.activeElement;
    classCheckboxes.forEach(function (cb) {
      cb.checked = !!(className && cb.value === className);
    });
    if (classError) classError.hidden = true;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    var firstField = className ? form.querySelector('input[name="name"]') : classCheckboxes[0];
    if (firstField) firstField.focus();
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', function () {
      classCheckboxes.forEach(function (cb) { cb.checked = true; });
      if (classError) classError.hidden = true;
    });
  }

  function closeModal() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('.js-book').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openModal(btn.getAttribute('data-class'));
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) closeModal();
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var checkedClasses = Array.prototype.filter.call(classCheckboxes, function (cb) { return cb.checked; })
        .map(function (cb) { return cb.value; });

      if (checkedClasses.length === 0) {
        if (classError) classError.hidden = false;
        document.getElementById('reg-classes').scrollIntoView({ block: 'center' });
        return;
      }
      if (classError) classError.hidden = true;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var submitBtn = form.querySelector('.reg-form__submit');
      var fd = new FormData(form);
      var payload = {
        class: checkedClasses.join('; '),
        name: fd.get('name') || '',
        email: fd.get('email') || '',
        phone: fd.get('phone') || '',
        messenger: fd.get('messenger') || '',
        contact: fd.get('contact') || '',
        consent: fd.get('consent') ? 'yes' : '',
        company: fd.get('company') || ''
      };

      statusEl.textContent = '';
      statusEl.removeAttribute('data-state');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправляем…';

      fetch('/.netlify/functions/submit-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('request failed');
          return res.json();
        })
        .then(function () {
          statusEl.textContent = 'Спасибо! Мы свяжемся с вами, чтобы согласовать оплату и время.';
          statusEl.setAttribute('data-state', 'success');
          form.reset();
          setTimeout(closeModal, 2200);
        })
        .catch(function () {
          statusEl.textContent = 'Не удалось отправить форму. Попробуйте ещё раз или напишите в Telegram напрямую.';
          statusEl.setAttribute('data-state', 'error');
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Отправить заявку';
        });
    });
  }
})();
