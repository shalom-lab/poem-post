(function () {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const state = {
    templateId: 'moon-letter',
    ratio: '3/4',
    title: '',
    author: '',
    body: '',
    meaning: '',
    watermark: '',
    date: '',
    excerpts: []
  };

  const els = {};

  function getTemplate(id) {
    return window.POEM_TEMPLATES.find((t) => t.id === id) || window.POEM_TEMPLATES[0];
  }

  function loadSample(id) {
    const sample = window.POEM_SAMPLES[id] || {};
    state.title = sample.title || '';
    state.author = sample.author || '';
    state.body = sample.body || '';
    state.meaning = sample.meaning || '';
    state.watermark = sample.watermark || '';
    state.date = sample.date || '';
    state.excerpts = (sample.excerpts || []).map((e) => ({ ...e }));
    syncFormFromState();
    renderCard();
  }

  function syncFormFromState() {
    els.title.value = state.title;
    els.author.value = state.author;
    els.body.value = state.body;
    els.meaning.value = state.meaning;
    els.watermark.value = state.watermark;
    els.date.value = state.date;
    renderExcerptsEditor();
    updateFieldVisibility();
  }

  function syncStateFromForm() {
    state.title = els.title.value;
    state.author = els.author.value;
    state.body = els.body.value;
    state.meaning = els.meaning.value;
    state.watermark = els.watermark.value;
    state.date = els.date.value;
    state.excerpts = $$('.excerpt-row', els.excerptsEditor).map((row) => ({
      verse: $('.excerpt-verse', row).value,
      source: $('.excerpt-source-input', row).value
    }));
  }

  function updateFieldVisibility() {
    const tpl = getTemplate(state.templateId);
    const isExcerpts = tpl.mode === 'excerpts';
    const isHybrid = tpl.mode === 'hybrid';

    els.fieldTitle.classList.toggle('hidden', !tpl.showTitle && !isHybrid);
    els.fieldAuthor.classList.toggle('hidden', !tpl.showAuthor);
    els.fieldBody.classList.toggle('hidden', isExcerpts);
    els.fieldMeaning.classList.toggle('hidden', !tpl.showMeaning);
    els.fieldWatermark.classList.toggle('hidden', !tpl.showWatermark);
    els.fieldDate.classList.toggle('hidden', !tpl.showDate);
    els.fieldExcerpts.classList.toggle('hidden', !(isExcerpts || isHybrid));

    if (isHybrid) {
      els.fieldBody.classList.remove('hidden');
      els.fieldExcerpts.classList.remove('hidden');
    }
  }

  function renderExcerptsEditor() {
    els.excerptsEditor.innerHTML = '';
    if (!state.excerpts.length) {
      state.excerpts.push({ verse: '', source: '' });
    }
    state.excerpts.forEach((ex, i) => {
      const row = document.createElement('div');
      row.className = 'excerpt-row';
      row.innerHTML = `
        <button type="button" class="rm-excerpt" title="删除" aria-label="删除">×</button>
        <input class="excerpt-verse" type="text" placeholder="诗句" value="${escapeAttr(ex.verse)}" />
        <input class="excerpt-source-input excerpt-source" type="text" placeholder="出处（如：雁门太守行）" value="${escapeAttr(ex.source)}" />
      `;
      $('.rm-excerpt', row).addEventListener('click', () => {
        state.excerpts.splice(i, 1);
        if (!state.excerpts.length) state.excerpts.push({ verse: '', source: '' });
        renderExcerptsEditor();
        renderCard();
      });
      $$('input', row).forEach((inp) => {
        inp.addEventListener('input', () => {
          syncStateFromForm();
          renderCard();
        });
      });
      els.excerptsEditor.appendChild(row);
    });
  }

  function escapeAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function nl2brPreserve(s) {
    return escapeHtml(s);
  }

  function renderTemplateButtons() {
    els.templateGrid.innerHTML = '';
    window.POEM_TEMPLATES.forEach((tpl) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tpl-btn' + (tpl.id === state.templateId ? ' active' : '');
      btn.dataset.id = tpl.id;
      btn.innerHTML = `<span class="tpl-name">${tpl.name}</span><span class="tpl-desc">${tpl.desc}</span>`;
      btn.addEventListener('click', () => {
        state.templateId = tpl.id;
        if (tpl.ratio === '3/5') setRatio('3/5');
        else setRatio('3/4');
        $$('.tpl-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === tpl.id));
        loadSample(tpl.id);
      });
      els.templateGrid.appendChild(btn);
    });
  }

  function setRatio(r) {
    state.ratio = r;
    $$('.ratio-row .btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.ratio === r);
    });
    renderCard();
  }

  function ratioClass(r) {
    if (r === '3/5') return 'ratio-3-5';
    if (r === '9/16') return 'ratio-9-16';
    return 'ratio-3-4';
  }

  function renderCard() {
    const tpl = getTemplate(state.templateId);
    const card = els.card;
    card.className = '';
    card.classList.add('tpl-' + tpl.id, ratioClass(state.ratio));

    let html = '';

    switch (tpl.id) {
      case 'moon-letter':
        html = renderMoonLetter();
        break;
      case 'mist-card':
        html = renderMistCard();
        break;
      case 'crimson':
        html = renderCrimson();
        break;
      case 'willow':
        html = renderWillow();
        break;
      case 'ink-mountain':
        html = renderInkMountain();
        break;
      case 'ink-cream':
        html = renderInkCream();
        break;
      case 'snow-indigo':
        html = renderSnowIndigo();
        break;
      case 'dusk-peach':
        html = renderDuskPeach();
        break;
      case 'bamboo-scroll':
        html = renderBambooScroll();
        break;
      case 'lacquer-gold':
        html = renderLacquerGold();
        break;
      default:
        html = renderMoonLetter();
    }

    card.innerHTML = html;
  }

  function meaningBlock(labelStyle) {
    if (!state.meaning.trim()) return '';
    const label = labelStyle === 'bracket' ? '【释义】' : '[ 释义 ]';
    return `
      <div class="pc-meaning-label">${label}</div>
      <div class="pc-meaning">${nl2brPreserve(state.meaning)}</div>
    `;
  }

  function renderMoonLetter() {
    const wm = state.watermark.trim();
    return `
      <img class="pc-deco deco-moon" src="assets/moon.svg" alt="" />
      <img class="pc-deco deco-branches" src="assets/branches.svg" alt="" />
      <div class="pc-inner">
        <div class="pc-body">${nl2brPreserve(state.body)}</div>
        ${state.author ? `<div class="pc-author-right">${escapeHtml(state.author)}</div>` : ''}
        ${meaningBlock('bracket')}
        ${wm ? `<div class="pc-watermark"><span class="wm-cn">【${escapeHtml(wm)}】</span></div>` : ''}
      </div>
    `;
  }

  function renderMistCard() {
    const brand = state.watermark.trim();
    return `
      <div class="pc-inner">
        <div class="pc-topbar">
          <div>
            ${brand ? `<div class="pc-brand-cn">${escapeHtml(brand)}</div>` : '<div class="pc-brand-cn">&nbsp;</div>'}
          </div>
          <div class="pc-date">${escapeHtml(state.date || '')}</div>
        </div>
        ${state.title ? `<div class="pc-title">${escapeHtml(state.title)}</div><div class="pc-title-line"></div>` : ''}
        ${state.author ? `<div class="pc-author">${escapeHtml(state.author)}</div>` : ''}
        <div class="pc-body">${nl2brPreserve(state.body)}</div>
        <div class="pc-footer-marks">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
  }

  function renderCrimson() {
    const items = state.excerpts.filter((e) => e.verse.trim());
    return `
      <div class="pc-inner">
        ${state.title ? `<div class="pc-title">${escapeHtml(state.title)}</div>` : ''}
        <div class="excerpts">
          ${items.map((e) => `
            <div class="excerpt-item">
              <div class="verse">${escapeHtml(e.verse)}</div>
              ${e.source ? `<span class="source">——${escapeHtml(e.source)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderWillow() {
    const brand = state.watermark.trim();
    return `
      <img class="pc-deco deco-willow" src="assets/willow.svg" alt="" />
      <img class="pc-deco deco-bridge" src="assets/bridge.svg" alt="" />
      <img class="pc-deco deco-mist-mtn" src="assets/mountains.svg" alt="" />
      <div class="pc-inner">
        ${brand ? `<div class="pc-brand-top">${escapeHtml(brand)}</div><hr class="pc-brand-line" />` : ''}
        <div class="body-block">
          <div class="pc-body">${nl2brPreserve(state.body)}</div>
          ${state.author ? `<div class="pc-author-right">--${escapeHtml(state.author)}</div>` : ''}
        </div>
        ${meaningBlock('square')}
      </div>
    `;
  }

  function renderInkMountain() {
    return `
      <img class="pc-deco deco-mountains" src="assets/mountains.svg" alt="" />
      <div class="pc-inner">
        ${state.title ? `<div class="pc-title">${escapeHtml(state.title)}</div>` : ''}
        ${state.author ? `<div class="pc-author">${escapeHtml(state.author)}</div>` : ''}
        <div class="pc-body">${nl2brPreserve(state.body)}</div>
        ${state.watermark ? `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>` : ''}
      </div>
    `;
  }

  function renderInkCream() {
    return `
      <div class="pc-inner">
        ${state.title ? `<div class="pc-title">${escapeHtml(state.title)}</div>` : ''}
        ${state.author ? `<div class="pc-author">${escapeHtml(state.author)}</div>` : ''}
        <div class="pc-body">${nl2brPreserve(state.body)}</div>
        ${meaningBlock('bracket')}
        ${state.watermark ? `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>` : ''}
      </div>
    `;
  }

  function renderSnowIndigo() {
    return `
      <div class="pc-inner">
        <div class="pc-topbar">
          <span>${escapeHtml(state.watermark || '')}</span>
          <span>${escapeHtml(state.date || '')}</span>
        </div>
        ${state.title ? `<div class="pc-title">${escapeHtml(state.title)}</div>` : ''}
        ${state.author ? `<div class="pc-author">${escapeHtml(state.author)}</div>` : ''}
        <div class="pc-body">${nl2brPreserve(state.body)}</div>
        ${meaningBlock('bracket')}
      </div>
    `;
  }

  function renderDuskPeach() {
    return `
      <div class="pc-inner">
        ${state.title ? `<div class="pc-title">${escapeHtml(state.title)}</div>` : ''}
        ${state.author ? `<div class="pc-author">${escapeHtml(state.author)}</div>` : ''}
        <div class="pc-body">${nl2brPreserve(state.body)}</div>
        ${meaningBlock('bracket')}
        ${state.watermark ? `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>` : ''}
      </div>
    `;
  }

  function renderBambooScroll() {
    return `
      <img class="pc-deco deco-bamboo" src="assets/bamboo.svg" alt="" />
      <div class="pc-inner">
        ${state.title ? `<div class="pc-title">${escapeHtml(state.title)}</div>` : ''}
        ${state.author ? `<div class="pc-author">${escapeHtml(state.author)}</div>` : ''}
        <div class="pc-body">${nl2brPreserve(state.body)}</div>
        ${state.watermark ? `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>` : ''}
      </div>
    `;
  }

  function renderLacquerGold() {
    const items = state.excerpts.filter((e) => e.verse.trim());
    const hasExcerpts = items.length > 0;
    return `
      <div class="pc-inner">
        ${state.title ? `<div class="pc-title">${escapeHtml(state.title)}</div>` : ''}
        ${state.author ? `<div class="pc-author">${escapeHtml(state.author)}</div>` : ''}
        ${state.body.trim() ? `<div class="pc-body">${nl2brPreserve(state.body)}</div>` : ''}
        ${hasExcerpts ? `
          <div class="excerpts">
            ${items.map((e) => `
              <div class="excerpt-item">
                <div class="verse">${escapeHtml(e.verse)}</div>
                ${e.source ? `<span class="source">——${escapeHtml(e.source)}</span>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${state.watermark ? `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>` : ''}
      </div>
    `;
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  async function waitFonts() {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
        // 再等一下关键字体真正可用
        const faces = ['LXGW WenKai', 'Noto Sans SC'];
        await Promise.all(
          faces.map((f) => document.fonts.load(`400 16px "${f}"`).catch(() => null))
        );
      } catch (_) { /* ignore */ }
    }
  }

  async function exportPng() {
    const card = els.card;
    if (!window.html2canvas) {
      showToast('html2canvas 未加载');
      return;
    }
    els.btnExport.disabled = true;
    els.btnExport.textContent = '导出中…';
    try {
      await waitFonts();
      const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
      const canvas = await html2canvas(card, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      });
      const tpl = getTemplate(state.templateId);
      const name = (state.title || tpl.name || 'poem').replace(/[\\/:*?"<>|]/g, '_');
      const link = document.createElement('a');
      link.download = `${name}-${tpl.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('已下载高清 PNG');
    } catch (err) {
      console.error(err);
      showToast('导出失败，请重试');
    } finally {
      els.btnExport.disabled = false;
      els.btnExport.textContent = '下载 PNG';
    }
  }

  function init() {
    els.templateGrid = $('#template-grid');
    els.title = $('#field-title');
    els.author = $('#field-author');
    els.body = $('#field-body');
    els.meaning = $('#field-meaning');
    els.watermark = $('#field-watermark');
    els.date = $('#field-date');
    els.excerptsEditor = $('#excerpts-editor');
    els.fieldTitle = $('#wrap-title');
    els.fieldAuthor = $('#wrap-author');
    els.fieldBody = $('#wrap-body');
    els.fieldMeaning = $('#wrap-meaning');
    els.fieldWatermark = $('#wrap-watermark');
    els.fieldDate = $('#wrap-date');
    els.fieldExcerpts = $('#wrap-excerpts');
    els.card = $('#poem-card');
    els.btnExport = $('#btn-export');
    els.btnReset = $('#btn-reset');
    els.toast = $('#toast');
    els.addExcerpt = $('#btn-add-excerpt');

    renderTemplateButtons();

    ['title', 'author', 'body', 'meaning', 'watermark', 'date'].forEach((key) => {
      els[key].addEventListener('input', () => {
        syncStateFromForm();
        renderCard();
      });
    });

    $$('.ratio-row .btn').forEach((b) => {
      b.addEventListener('click', () => setRatio(b.dataset.ratio));
    });

    els.btnExport.addEventListener('click', exportPng);
    els.btnReset.addEventListener('click', () => loadSample(state.templateId));
    els.addExcerpt.addEventListener('click', () => {
      syncStateFromForm();
      state.excerpts.push({ verse: '', source: '' });
      renderExcerptsEditor();
    });

    // 字体就绪前先禁用导出，避免缺字 PNG
    els.btnExport.disabled = true;
    els.btnExport.textContent = '字体加载中…';
    waitFonts().then(() => {
      els.btnExport.disabled = false;
      els.btnExport.textContent = '下载 PNG';
    });

    loadSample(state.templateId);
    setRatio('3/4');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
