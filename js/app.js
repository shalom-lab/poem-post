(function () {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const BLOCK_IDS = ['title', 'author', 'body', 'meaning', 'watermark', 'date'];
  const BLOCK_LABELS = {
    title: '标题',
    author: '作者 / 出处',
    body: '正文',
    meaning: '释义 / 副文',
    watermark: '水印 / 品牌',
    date: '日期 / 页脚'
  };

  function defaultBlockLayout() {
    return {
      x: null,
      y: null,
      scale: 1,
      w: null,
      align: '',
      lineHeight: null,
      letterSpacing: null
    };
  }

  function emptyLayout() {
    const layout = {};
    BLOCK_IDS.forEach((id) => { layout[id] = defaultBlockLayout(); });
    return layout;
  }

  function cloneLayout(src) {
    const out = emptyLayout();
    if (!src || typeof src !== 'object') return out;
    BLOCK_IDS.forEach((id) => {
      const b = src[id];
      if (!b || typeof b !== 'object') return;
      out[id] = {
        x: b.x == null ? null : Number(b.x),
        y: b.y == null ? null : Number(b.y),
        scale: b.scale == null ? 1 : Number(b.scale),
        w: b.w == null ? null : Number(b.w),
        align: b.align || '',
        lineHeight: b.lineHeight == null ? null : Number(b.lineHeight),
        letterSpacing: b.letterSpacing == null ? null : Number(b.letterSpacing)
      };
    });
    return out;
  }

  const FONT_PRESETS = {
    wenkai: {
      label: '霞鹜文楷',
      family: '"LXGW WenKai", "霞鹜文楷", "Noto Serif SC", "Songti SC", "SimSun", serif',
      loadName: 'LXGW WenKai'
    },
    serif: {
      label: '思源宋体',
      family: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif',
      loadName: 'Noto Serif SC'
    },
    fangsong: {
      label: '朱雀仿宋',
      family: '"Zhuque Fangsong", "STFangsong", "FangSong", "Noto Serif SC", serif',
      loadName: 'Zhuque Fangsong'
    },
    twsung: {
      label: '全字库正宋',
      family: '"TW-Sung", "Noto Serif SC", "Songti SC", "SimSun", serif',
      loadName: 'TW-Sung'
    },
    twkai: {
      label: '全字库正楷',
      family: '"TW-Kai", "LXGW WenKai", "KaiTi", "STKaiti", serif',
      loadName: 'TW-Kai'
    },
    huiwen: {
      label: '汇文明朝',
      family: '"Huiwen-MinchoGBK", "Noto Serif SC", "Songti SC", serif',
      loadName: 'Huiwen-MinchoGBK'
    },
    xiaowei: {
      label: '小薇标题',
      family: '"ZCOOL XiaoWei", "Noto Serif SC", "Songti SC", serif',
      loadName: 'ZCOOL XiaoWei'
    },
    mashan: {
      label: '马善政题签',
      family: '"Ma Shan Zheng", "LXGW WenKai", "KaiTi", serif',
      loadName: 'Ma Shan Zheng'
    },
    sans: {
      label: '思源黑体',
      family: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      loadName: 'Noto Sans SC'
    },
    system: {
      label: '系统宋体',
      family: '"Songti SC", "SimSun", "STSong", "Noto Serif SC", serif',
      loadName: null
    }
  };

  const state = {
    templateId: 'moon-letter',
    ratio: '3/4',
    title: '',
    author: '',
    body: '',
    meaning: '',
    watermark: '',
    date: '',
    excerpts: [],
    font: 'wenkai',
    layout: emptyLayout(),
    layoutDirty: false,
    selectedBlock: null
  };

  /** 仪表盘「预设样式」当前选中项（IndexedDB id） */
  let selectedPresetId = null;
  let layoutApplyTimer = 0;
  let dragSession = null;

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
    // 换模板/重置示例：恢复模板自然排版
    resetLayoutState(false);
    syncFormFromState();
    renderCard();
  }

  function resetLayoutState(keepSelection) {
    state.layout = emptyLayout();
    state.layoutDirty = false;
    if (!keepSelection) state.selectedBlock = null;
  }

  function syncFormFromState() {
    els.title.value = state.title;
    els.author.value = state.author;
    els.body.value = state.body;
    els.meaning.value = state.meaning;
    els.watermark.value = state.watermark;
    els.date.value = state.date;
    updateFieldVisibility();
  }

  function syncStateFromForm() {
    state.title = els.title.value;
    state.author = els.author.value;
    state.body = els.body.value;
    state.meaning = els.meaning.value;
    state.watermark = els.watermark.value;
    state.date = els.date.value;
  }

  function updateFieldVisibility() {
    const tpl = getTemplate(state.templateId);
    els.fieldTitle.classList.toggle('hidden', !tpl.showTitle);
    els.fieldAuthor.classList.toggle('hidden', !tpl.showAuthor);
    els.fieldBody.classList.toggle('hidden', false);
    els.fieldMeaning.classList.toggle('hidden', !tpl.showMeaning);
    els.fieldWatermark.classList.toggle('hidden', !tpl.showWatermark);
    els.fieldDate.classList.toggle('hidden', !tpl.showDate);

    const meaningLabel = els.fieldMeaning.querySelector('label');
    const wmLabel = els.fieldWatermark.querySelector('label');
    const dateLabel = els.fieldDate.querySelector('label');
    const titleLabel = els.fieldTitle.querySelector('label');
    if (tpl.id === 'photo-quote') {
      if (meaningLabel) meaningLabel.textContent = '副文 / 小字（可选）';
      if (wmLabel) wmLabel.textContent = '水印 / 品牌文案';
    } else if (tpl.id === 'wall-light') {
      if (titleLabel) titleLabel.textContent = '栏目标题';
      if (meaningLabel) meaningLabel.textContent = '译文（可选）';
      if (wmLabel) wmLabel.textContent = '账号 / 句柄';
      if (dateLabel) dateLabel.textContent = '页脚品牌文案';
    } else if (tpl.id === 'parchment-navy') {
      if (meaningLabel) meaningLabel.textContent = '英文行（可选）';
      if (wmLabel) wmLabel.textContent = '幽灵水印字（大字）';
    } else {
      if (titleLabel) titleLabel.textContent = '诗名 / 标题';
      if (meaningLabel) meaningLabel.textContent = '释义（可选）';
      if (wmLabel) wmLabel.textContent = '水印 / 品牌文案';
      if (dateLabel) dateLabel.textContent = '日期（可选）';
    }
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

  function wrapBlock(id, inner) {
    if (!inner) return '';
    return `<div class="layout-block" data-block="${id}" tabindex="0">${inner}<span class="layout-handle" data-handle="se" aria-hidden="true"></span></div>`;
  }

  function renderTemplateSelect() {
    const sel = els.templateSelect;
    if (!sel) return;
    sel.innerHTML = '';
    window.POEM_TEMPLATES.forEach((tpl) => {
      const opt = document.createElement('option');
      opt.value = tpl.id;
      opt.textContent = tpl.name;
      sel.appendChild(opt);
    });
    syncTemplateSelect();
  }

  function syncTemplateSelect() {
    if (!els.templateSelect) return;
    const id = state.templateId;
    if (els.templateSelect.value !== id) els.templateSelect.value = id;
  }

  function onTemplateSelectChange() {
    const tplId = els.templateSelect.value;
    const tpl = getTemplate(tplId);
    state.templateId = tplId;
    syncTemplateSelect();
    if (tpl.ratio === '3/5') setRatio('3/5');
    else setRatio('3/4');
    loadSample(tplId);
  }

  function setRatio(r, opts = {}) {
    if (r !== '3/4' && r !== '3/5') r = '3/4';
    state.ratio = r;
    $$('.ratio-row .btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.ratio === r);
    });
    if (!opts.skipRender) renderCard();
  }

  function ratioClass(r) {
    if (r === '3/5') return 'ratio-3-5';
    return 'ratio-3-4';
  }

  function renderCard() {
    const tpl = getTemplate(state.templateId);
    const card = els.card;
    const prevSelected = state.selectedBlock;
    card.className = '';
    card.classList.add('tpl-' + tpl.id, ratioClass(state.ratio));

    let html = '';
    switch (tpl.id) {
      case 'moon-letter': html = renderMoonLetter(); break;
      case 'mist-card': html = renderMistCard(); break;
      case 'crimson': html = renderCrimson(); break;
      case 'willow': html = renderWillow(); break;
      case 'ink-mountain': html = renderInkMountain(); break;
      case 'ink-cream': html = renderInkCream(); break;
      case 'snow-indigo': html = renderSnowIndigo(); break;
      case 'dusk-peach': html = renderDuskPeach(); break;
      case 'bamboo-scroll': html = renderBambooScroll(); break;
      case 'lacquer-gold': html = renderLacquerGold(); break;
      case 'photo-quote': html = renderPhotoQuote(); break;
      case 'wall-light': html = renderWallLight(); break;
      case 'parchment-navy': html = renderParchmentNavy(); break;
      default: html = renderMoonLetter();
    }

    card.innerHTML = html;
    applyFontOnly();
    // 先按模板流式排版测量，再进入自由定位层
    scheduleApplyFreeLayout(prevSelected);
  }

  function applyFontOnly() {
    const card = els.card;
    if (!card) return;
    const preset = FONT_PRESETS[state.font] || FONT_PRESETS.wenkai;
    card.style.setProperty('--poem-font', preset.family);
    // 区块缩放走 transform:scale，模板 CSS 倍率保持 1，避免叠乘
    card.style.setProperty('--body-scale', '1');
    card.style.setProperty('--title-scale', '1');
    card.style.setProperty('--meaning-scale', '1');
    card.style.setProperty('--offset-y', '0%');
    card.style.setProperty('--pad-y', '0%');
    card.style.removeProperty('--align');
    card.classList.remove('align-override');
  }

  function scheduleApplyFreeLayout(prevSelected) {
    cancelAnimationFrame(layoutApplyTimer);
    layoutApplyTimer = requestAnimationFrame(() => {
      applyFreeLayout();
      if (prevSelected && els.card.querySelector(`.layout-block[data-block="${prevSelected}"]`)) {
        selectBlock(prevSelected, { syncOnly: false, skipPanelFocus: true });
      } else {
        selectBlock(null, { syncOnly: true });
      }
      syncLayoutPanel();
    });
  }

  function measureNaturalLayouts() {
    const card = els.card;
    const cardRect = card.getBoundingClientRect();
    if (!cardRect.width || !cardRect.height) return null;
    const measured = emptyLayout();
    $$('.layout-block', card).forEach((el) => {
      const id = el.dataset.block;
      if (!BLOCK_IDS.includes(id)) return;
      // 幽灵字等绝对子元素：始终测子节点，避免父级 inset:0 铺满整卡
      const ghost = el.querySelector('.pc-ghost');
      let r;
      if (ghost) {
        r = ghost.getBoundingClientRect();
      } else {
        r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) {
          const inner = el.querySelector(
            '.pc-title, .pc-body, .pc-watermark, .pc-author, .pc-author-right, .pc-meaning, .pc-meaning-label, .pc-sub, .pc-english, .pc-handle, .pc-footer-brand, .pc-brand-cn, .pc-brand-top, .pc-date, .pc-quote-block'
          );
          if (inner) r = inner.getBoundingClientRect();
        }
      }
      if (!r || r.width < 2 || r.height < 2) return;
      measured[id] = {
        x: round1(((r.left - cardRect.left) / cardRect.width) * 100),
        y: round1(((r.top - cardRect.top) / cardRect.height) * 100),
        scale: 1,
        w: round1(Math.min(100, (r.width / cardRect.width) * 100)),
        align: '',
        lineHeight: null,
        letterSpacing: null
      };
    });
    return measured;
  }

  function round1(n) {
    return Math.round(Number(n) * 10) / 10;
  }

  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function ensureLayoutPositions() {
    const measured = measureNaturalLayouts();
    if (!measured) return;

    BLOCK_IDS.forEach((id) => {
      const m = measured[id];
      if (!m || m.x == null) return;
      const cur = state.layout[id] || defaultBlockLayout();
      if (!state.layoutDirty) {
        // 未手动改过：位置跟随模板测量；保留迁移来的 scale / 细排版
        state.layout[id] = {
          x: m.x,
          y: m.y,
          w: m.w,
          scale: cur.scale == null ? 1 : Number(cur.scale),
          align: cur.align || '',
          lineHeight: cur.lineHeight == null ? null : Number(cur.lineHeight),
          letterSpacing: cur.letterSpacing == null ? null : Number(cur.letterSpacing)
        };
      } else if (cur.x == null || cur.y == null) {
        cur.x = m.x;
        cur.y = m.y;
        if (cur.w == null) cur.w = m.w;
        state.layout[id] = cur;
      } else if (cur.w == null && m.w != null) {
        cur.w = m.w;
        state.layout[id] = cur;
      }
    });
  }



  /** 整块在诗卡内水平排布：按当前宽度 w 计算 x（父级居中 / 靠左 / 靠右） */
  function blockWidthPct(id) {
    const cur = state.layout[id];
    if (cur && cur.w != null) return Number(cur.w);
    ensureLayoutPositions();
    const after = state.layout[id];
    if (after && after.w != null) return Number(after.w);
    return 72;
  }

  function placeBlockInParent(id, side) {
    if (!id || !BLOCK_IDS.includes(id)) return;
    if (!state.layout[id] || state.layout[id].x == null) {
      ensureLayoutPositions();
    }
    const cur = state.layout[id] || defaultBlockLayout();
    const w = cur.w == null ? blockWidthPct(id) : Number(cur.w);
    let x;
    if (side === 'center') x = (100 - w) / 2;
    else if (side === 'right') x = 100 - w;
    else x = 0;
    state.selectedBlock = id;
    updateSelectedLayout({ x: round1(clamp(x, -5, 98)), w: round1(clamp(w, 10, 100)) });
    selectBlock(id);
  }

  /** 块内水平对齐：写到 layout-block，并由 CSS 覆盖模板子元素的 text-align / 边距 */
  function applyBlockAlign(el, align) {
    const a = align === 'left' || align === 'center' || align === 'right' ? align : '';
    if (a) {
      el.style.textAlign = a;
      el.style.setProperty('--block-align', a);
      el.dataset.align = a;
    } else {
      el.style.textAlign = '';
      el.style.removeProperty('--block-align');
      delete el.dataset.align;
    }
  }

  function applyFreeLayout() {
    const card = els.card;
    if (!card) return;

    card.classList.add('is-layout-pending');
    try {
    // 测量阶段：确保仍在流式布局
    card.classList.remove('is-free-layout', 'is-exporting');
    $$('.layout-block', card).forEach((el) => {
      el.style.left = '';
      el.style.top = '';
      el.style.width = '';
      el.style.maxWidth = '';
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.textAlign = '';
      el.style.lineHeight = '';
      el.style.letterSpacing = '';
      el.style.removeProperty('--block-align');
      delete el.dataset.align;
      el.style.setProperty('--block-scale', '1');
    });

    // 强制回流后再测
    void card.offsetWidth;
    ensureLayoutPositions();

    card.classList.add('is-free-layout');

    $$('.layout-block', card).forEach((el) => {
      const id = el.dataset.block;
      const L = state.layout[id];
      if (!L || L.x == null || L.y == null) return;

      const scale = L.scale == null ? 1 : Number(L.scale);
      const w = L.w == null ? null : Number(L.w);

      el.style.left = clamp(L.x, -5, 98) + '%';
      el.style.top = clamp(L.y, -5, 98) + '%';
      if (w != null) {
        el.style.width = clamp(w, 10, 100) + '%';
        el.style.maxWidth = clamp(w, 10, 100) + '%';
      }
      el.style.transformOrigin = 'top left';
      el.style.transform = scale === 1 ? '' : `scale(${scale})`;
      el.style.setProperty('--block-scale', String(scale));

      applyBlockAlign(el, L.align);
      if (L.lineHeight != null) el.style.lineHeight = String(L.lineHeight);
      if (L.letterSpacing != null) el.style.letterSpacing = L.letterSpacing + 'em';

      el.classList.toggle('is-selected', state.selectedBlock === id);
    });

    // 同步 CSS 变量（模板内 font-size calc 仍可读）
    applyFontOnly();
    } finally {
      card.classList.remove('is-layout-pending');
    }
  }

  function selectBlock(id, opts = {}) {
    const next = id && BLOCK_IDS.includes(id) ? id : null;
    state.selectedBlock = next;
    if (els.card) {
      $$('.layout-block', els.card).forEach((el) => {
        el.classList.toggle('is-selected', el.dataset.block === next);
      });
    }
    if (!opts.syncOnly) syncLayoutPanel();
  }

  function syncLayoutPanel() {
    if (!els.layoutX) return;
    const id = state.selectedBlock;
    const has = !!(id && state.layout[id] && state.layout[id].x != null);
    const L = has ? state.layout[id] : null;

    if (els.layoutBlockName) {
      els.layoutBlockName.textContent = has ? (BLOCK_LABELS[id] || id) : '未选中';
    }
    if (els.layoutBlockPanel) {
      els.layoutBlockPanel.classList.toggle('is-empty', !has);
    }

    const controls = [
      els.layoutX, els.layoutY, els.layoutScale, els.layoutW, els.layoutLh, els.layoutLs
    ];
    controls.forEach((c) => { if (c) c.disabled = !has; });
    $$('#layout-align-row .btn').forEach((b) => { b.disabled = !has; });

    if (!has) {
      if (els.valLayoutX) els.valLayoutX.textContent = '—';
      if (els.valLayoutY) els.valLayoutY.textContent = '—';
      if (els.valLayoutScale) els.valLayoutScale.textContent = '—';
      if (els.valLayoutW) els.valLayoutW.textContent = '—';
      if (els.valLayoutLh) els.valLayoutLh.textContent = '—';
      if (els.valLayoutLs) els.valLayoutLs.textContent = '—';
      $$('#layout-align-row .btn').forEach((b) => b.classList.toggle('active', (b.dataset.align || '') === ''));
      if (els.font) els.font.value = state.font;
      return;
    }

    els.layoutX.value = L.x;
    els.layoutY.value = L.y;
    els.layoutScale.value = L.scale == null ? 1 : L.scale;
    els.layoutW.value = L.w == null ? 80 : L.w;
    els.layoutLh.value = L.lineHeight == null ? 1.8 : L.lineHeight;
    els.layoutLs.value = L.letterSpacing == null ? 0.12 : L.letterSpacing;

    els.valLayoutX.textContent = Number(L.x).toFixed(1) + '%';
    els.valLayoutY.textContent = Number(L.y).toFixed(1) + '%';
    els.valLayoutScale.textContent = Number(L.scale == null ? 1 : L.scale).toFixed(2) + '×';
    els.valLayoutW.textContent = (L.w == null ? 80 : Number(L.w).toFixed(0)) + '%';
    els.valLayoutLh.textContent = L.lineHeight == null ? '跟随' : Number(L.lineHeight).toFixed(2);
    els.valLayoutLs.textContent = L.letterSpacing == null ? '跟随' : Number(L.letterSpacing).toFixed(2) + 'em';

    $$('#layout-align-row .btn').forEach((b) => {
      b.classList.toggle('active', (b.dataset.align || '') === (L.align || ''));
    });
    if (els.font) els.font.value = state.font;
  }

  function updateSelectedLayout(patch, opts = {}) {
    const id = state.selectedBlock;
    if (!id) return;
    const cur = state.layout[id] || defaultBlockLayout();
    Object.assign(cur, patch);
    if (cur.x != null) cur.x = round1(clamp(cur.x, -5, 98));
    if (cur.y != null) cur.y = round1(clamp(cur.y, -5, 98));
    if (cur.scale != null) cur.scale = round2(clamp(cur.scale, 0.4, 2.5));
    if (cur.w != null) cur.w = round1(clamp(cur.w, 10, 100));
    state.layout[id] = cur;
    state.layoutDirty = true;
    if (!opts.skipApply) applyBlockStyle(id);
    if (!opts.skipPanel) syncLayoutPanel();
  }

  function applyBlockStyle(id) {
    const el = els.card && els.card.querySelector(`.layout-block[data-block="${id}"]`);
    const L = state.layout[id];
    if (!el || !L || L.x == null) return;
    const scale = L.scale == null ? 1 : Number(L.scale);
    el.style.left = clamp(L.x, -5, 98) + '%';
    el.style.top = clamp(L.y, -5, 98) + '%';
    if (L.w != null) {
      el.style.width = clamp(L.w, 10, 100) + '%';
      el.style.maxWidth = clamp(L.w, 10, 100) + '%';
    }
    el.style.transformOrigin = 'top left';
    el.style.transform = scale === 1 ? '' : `scale(${scale})`;
    el.style.setProperty('--block-scale', String(scale));
    applyBlockAlign(el, L.align);
    if (L.lineHeight != null) el.style.lineHeight = String(L.lineHeight);
    else el.style.lineHeight = '';
    if (L.letterSpacing != null) el.style.letterSpacing = L.letterSpacing + 'em';
    else el.style.letterSpacing = '';
    applyFontOnly();
  }

  function resetTypography() {
    resetLayoutState(false);
    state.font = 'wenkai';
    if (els.font) els.font.value = 'wenkai';
    renderCard();
    showToast('已重置为模板默认排版');
  }

  function meaningBlock(labelStyle) {
    if (!state.meaning.trim()) return '';
    const label = labelStyle === 'bracket' ? '【释义】' : '[ 释义 ]';
    return wrapBlock('meaning', `
      <div class="pc-meaning-label">${label}</div>
      <div class="pc-meaning">${nl2brPreserve(state.meaning)}</div>
    `);
  }

  function renderMoonLetter() {
    const wm = state.watermark.trim();
    return `
      <img class="pc-deco deco-moon" src="assets/moon.svg" alt="" />
      <img class="pc-deco deco-branches" src="assets/branches.svg" alt="" />
      <div class="pc-inner">
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        ${state.author ? wrapBlock('author', `<div class="pc-author-right">${escapeHtml(state.author)}</div>`) : ''}
        ${meaningBlock('bracket')}
        ${wm ? wrapBlock('watermark', `<div class="pc-watermark"><span class="wm-cn">【${escapeHtml(wm)}】</span></div>`) : ''}
      </div>
    `;
  }

  function renderMistCard() {
    const brand = state.watermark.trim();
    return `
      <div class="pc-inner">
        <div class="pc-topbar">
          <div>
            ${brand ? wrapBlock('watermark', `<div class="pc-brand-cn">${escapeHtml(brand)}</div>`) : '<div class="pc-brand-cn">&nbsp;</div>'}
          </div>
          ${state.date ? wrapBlock('date', `<div class="pc-date">${escapeHtml(state.date)}</div>`) : '<div class="pc-date"></div>'}
        </div>
        ${state.title ? wrapBlock('title', `<div class="pc-title">${escapeHtml(state.title)}</div><div class="pc-title-line"></div>`) : ''}
        ${state.author ? wrapBlock('author', `<div class="pc-author">${escapeHtml(state.author)}</div>`) : ''}
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        <div class="pc-footer-marks">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
  }

  function renderCrimson() {
    return `
      <div class="pc-inner">
        ${state.title ? wrapBlock('title', `<div class="pc-title">${escapeHtml(state.title)}</div>`) : ''}
        ${state.author ? wrapBlock('author', `<div class="pc-author">${escapeHtml(state.author)}</div>`) : ''}
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        ${meaningBlock('bracket')}
        ${state.watermark ? wrapBlock('watermark', `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>`) : ''}
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
        ${brand ? wrapBlock('watermark', `<div class="pc-brand-top">${escapeHtml(brand)}</div><hr class="pc-brand-line" />`) : ''}
        <div class="body-block">
          ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
          ${state.author ? wrapBlock('author', `<div class="pc-author-right">--${escapeHtml(state.author)}</div>`) : ''}
        </div>
        ${meaningBlock('square')}
      </div>
    `;
  }

  function renderInkMountain() {
    return `
      <img class="pc-deco deco-mountains" src="assets/mountains.svg" alt="" />
      <div class="pc-inner">
        ${state.title ? wrapBlock('title', `<div class="pc-title">${escapeHtml(state.title)}</div>`) : ''}
        ${state.author ? wrapBlock('author', `<div class="pc-author">${escapeHtml(state.author)}</div>`) : ''}
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        ${state.watermark ? wrapBlock('watermark', `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>`) : ''}
      </div>
    `;
  }

  function renderInkCream() {
    return `
      <div class="pc-inner">
        ${state.title ? wrapBlock('title', `<div class="pc-title">${escapeHtml(state.title)}</div>`) : ''}
        ${state.author ? wrapBlock('author', `<div class="pc-author">${escapeHtml(state.author)}</div>`) : ''}
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        ${meaningBlock('bracket')}
        ${state.watermark ? wrapBlock('watermark', `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>`) : ''}
      </div>
    `;
  }

  function renderSnowIndigo() {
    return `
      <div class="pc-inner">
        <div class="pc-topbar">
          ${state.watermark ? wrapBlock('watermark', `<span>${escapeHtml(state.watermark)}</span>`) : '<span></span>'}
          ${state.date ? wrapBlock('date', `<span>${escapeHtml(state.date)}</span>`) : '<span></span>'}
        </div>
        ${state.title ? wrapBlock('title', `<div class="pc-title">${escapeHtml(state.title)}</div>`) : ''}
        ${state.author ? wrapBlock('author', `<div class="pc-author">${escapeHtml(state.author)}</div>`) : ''}
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        ${meaningBlock('bracket')}
      </div>
    `;
  }

  function renderDuskPeach() {
    return `
      <div class="pc-inner">
        ${state.title ? wrapBlock('title', `<div class="pc-title">${escapeHtml(state.title)}</div>`) : ''}
        ${state.author ? wrapBlock('author', `<div class="pc-author">${escapeHtml(state.author)}</div>`) : ''}
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        ${meaningBlock('bracket')}
        ${state.watermark ? wrapBlock('watermark', `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>`) : ''}
      </div>
    `;
  }

  function renderBambooScroll() {
    return `
      <img class="pc-deco deco-bamboo" src="assets/bamboo.svg" alt="" />
      <div class="pc-inner">
        ${state.title ? wrapBlock('title', `<div class="pc-title">${escapeHtml(state.title)}</div>`) : ''}
        ${state.author ? wrapBlock('author', `<div class="pc-author">${escapeHtml(state.author)}</div>`) : ''}
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        ${state.watermark ? wrapBlock('watermark', `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>`) : ''}
      </div>
    `;
  }

  function renderLacquerGold() {
    return `
      <div class="pc-inner">
        ${state.title ? wrapBlock('title', `<div class="pc-title">${escapeHtml(state.title)}</div>`) : ''}
        ${state.author ? wrapBlock('author', `<div class="pc-author">${escapeHtml(state.author)}</div>`) : ''}
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        ${meaningBlock('bracket')}
        ${state.watermark ? wrapBlock('watermark', `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>`) : ''}
      </div>
    `;
  }

  function renderPhotoQuote() {
    const sub = state.meaning.trim();
    return `
      <div class="pc-photo-scrim" aria-hidden="true"></div>
      <div class="pc-inner">
        ${wrapBlock('body', `
          <div class="pc-quote-block">
            <span class="pc-quote-mark pc-quote-open" aria-hidden="true">“</span>
            <div class="pc-body">${nl2brPreserve(state.body)}</div>
            <span class="pc-quote-mark pc-quote-close" aria-hidden="true">”</span>
          </div>
        `)}
        ${sub ? wrapBlock('meaning', `<div class="pc-sub">${nl2brPreserve(state.meaning)}</div>`) : ''}
        ${state.watermark.trim() ? wrapBlock('watermark', `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>`) : ''}
      </div>
    `;
  }

  function renderWallLight() {
    const handle = state.watermark.trim();
    const footer = state.date.trim();
    return `
      <div class="pc-window-light" aria-hidden="true"></div>
      <div class="pc-inner">
        <div class="pc-header-block">
          ${state.title ? wrapBlock('title', `<div class="pc-title">${escapeHtml(state.title)}</div>`) : ''}
          ${handle ? wrapBlock('watermark', `<div class="pc-handle">${escapeHtml(handle)}</div>`) : ''}
        </div>
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        ${state.author ? wrapBlock('author', `<div class="pc-author-right">${escapeHtml(state.author)}</div>`) : ''}
        ${state.meaning.trim() ? wrapBlock('meaning', `<div class="pc-meaning"><span class="pc-yiwen">译文：</span>${nl2brPreserve(state.meaning)}</div>`) : ''}
        ${footer ? wrapBlock('date', `<div class="pc-footer-brand">${nl2brPreserve(state.date)}</div>`) : ''}
      </div>
    `;
  }

  function ghostCharsFromState() {
    const raw = (state.watermark || state.author || '').trim();
    if (!raw) return '诗';
    const cleaned = raw.replace(/[—\-·•\s《》「」【】\[\]（）()]/g, '');
    const chars = [...cleaned].filter((ch) => /[\u4e00-\u9fffA-Za-z]/.test(ch));
    if (!chars.length) return raw.slice(0, 2) || '诗';
    return chars.slice(-4).join('');
  }

  function renderParchmentNavy() {
    const ghost = ghostCharsFromState();
    const en = state.meaning.trim();
    return `
      ${wrapBlock('watermark', `<div class="pc-ghost" aria-hidden="true">${escapeHtml(ghost)}</div>`)}
      <div class="pc-inner">
        ${wrapBlock('body', `<div class="pc-body">${nl2brPreserve(state.body)}</div>`)}
        ${state.author ? wrapBlock('author', `<div class="pc-author-right">${escapeHtml(state.author)}</div>`) : ''}
        ${en ? wrapBlock('meaning', `<div class="pc-english">${nl2brPreserve(state.meaning)}</div>`) : ''}
      </div>
    `;
  }


  /* ========== 预设样式（IndexedDB） ========== */
  const PRESET_CONTENT_KEYS = ['title', 'author', 'body', 'meaning', 'watermark', 'date'];

  function snapshotForPreset() {
    const snap = {
      templateId: state.templateId,
      ratio: state.ratio === '3/5' ? '3/5' : '3/4',
      font: state.font,
      layout: cloneLayout(state.layout),
      layoutDirty: !!state.layoutDirty
    };
    PRESET_CONTENT_KEYS.forEach((k) => { snap[k] = state[k] || ''; });
    // 兼容旧字段：从 layout 导出全局倍率
    snap.bodyScale = (state.layout.body && state.layout.body.scale) || 1;
    snap.titleScale = (state.layout.title && state.layout.title.scale) || 1;
    snap.meaningScale = (state.layout.meaning && state.layout.meaning.scale) || 1;
    snap.offsetY = 0;
    snap.padY = 0;
    snap.align = '';
    return snap;
  }

  function migrateLegacyTypoToLayout(p) {
    const layout = emptyLayout();
    const bodyScale = p.bodyScale != null ? Number(p.bodyScale) : 1;
    const titleScale = p.titleScale != null ? Number(p.titleScale) : 1;
    const meaningScale = p.meaningScale != null ? Number(p.meaningScale) : 1;
    layout.body.scale = bodyScale;
    layout.title.scale = titleScale;
    layout.meaning.scale = meaningScale;
    layout.author.scale = meaningScale;
    layout.watermark.scale = meaningScale;
    layout.date.scale = meaningScale;
    // x/y 留空，apply 时测量后再叠 scale
    return layout;
  }

  function formatPresetMeta(p) {
    const tpl = getTemplate(p.templateId);
    const ratio = p.ratio === '3/5' ? '3:5' : '3:4';
    const when = p.updatedAt
      ? new Date(p.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    return `${tpl.name || p.templateId} · ${ratio}${when ? ' · ' + when : ''}`;
  }

  function updatePresetActionButtons() {
    const has = !!selectedPresetId;
    if (els.btnPresetUpdate) els.btnPresetUpdate.disabled = !has;
    if (els.btnPresetRename) els.btnPresetRename.disabled = !has;
    if (els.btnPresetDelete) els.btnPresetDelete.disabled = !has;
  }

  async function refreshPresetList() {
    if (!els.presetList || !window.PoemPresets) return;
    let list = [];
    try {
      list = await window.PoemPresets.list();
    } catch (err) {
      console.error(err);
      showToast('读取预设失败');
      return;
    }
    els.presetList.innerHTML = '';
    if (els.presetEmpty) {
      els.presetEmpty.classList.toggle('hidden', list.length > 0);
    }
    if (selectedPresetId && !list.some((p) => p.id === selectedPresetId)) {
      selectedPresetId = null;
    }
    list.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'preset-item' + (p.id === selectedPresetId ? ' active' : '');
      li.dataset.id = p.id;
      li.setAttribute('role', 'button');
      li.tabIndex = 0;
      li.innerHTML =
        `<div class="preset-item-main">` +
        `<span class="preset-item-name">${escapeHtml(p.name)}</span>` +
        `<span class="preset-item-meta">${escapeHtml(formatPresetMeta(p))}</span>` +
        `</div>`;
      const applyOne = () => applyPresetRecord(p);
      li.addEventListener('click', applyOne);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          applyOne();
        }
      });
      els.presetList.appendChild(li);
    });
    updatePresetActionButtons();
  }

  async function applyPresetRecord(p) {
    if (!p) return;
    selectedPresetId = p.id;
    const tplId = p.templateId || state.templateId;
    state.templateId = tplId;
    syncTemplateSelect();
    PRESET_CONTENT_KEYS.forEach((k) => {
      if (p[k] !== undefined) state[k] = String(p[k] ?? '');
    });
    if (p.font) state.font = p.font;

    if (p.layout && typeof p.layout === 'object') {
      state.layout = cloneLayout(p.layout);
      state.layoutDirty = p.layoutDirty !== false;
    } else {
      // 旧预设：仅有全局 typo → 迁移为各区块 scale，位置用模板测量
      state.layout = migrateLegacyTypoToLayout(p);
      state.layoutDirty = false;
    }

    state.selectedBlock = null;
    if (els.presetName) els.presetName.value = p.name || '';
    syncFormFromState();
    updateFieldVisibility();
    setRatio(p.ratio === '3/5' ? '3/5' : '3/4'); // renders once with layout ready
    await waitFonts();
    await refreshPresetList();
    showToast('已应用「' + p.name + '」');
  }

  async function saveCurrentAsPreset() {
    if (!window.PoemPresets) {
      showToast('预设模块未加载');
      return;
    }
    const name = (els.presetName && els.presetName.value || '').trim();
    if (!name) {
      showToast('请先填写预设名称');
      if (els.presetName) els.presetName.focus();
      return;
    }
    try {
      const existing = await window.PoemPresets.findByName(name);
      if (existing) {
        const ok = window.confirm(`已有同名预设「${name}」，是否覆盖？`);
        if (!ok) return;
        const record = {
          ...existing,
          ...snapshotForPreset(),
          name,
          id: existing.id
        };
        const saved = await window.PoemPresets.put(record);
        selectedPresetId = saved.id;
        showToast('已覆盖「' + name + '」');
      } else {
        const record = {
          id: window.PoemPresets.newId(),
          name,
          ...snapshotForPreset()
        };
        const saved = await window.PoemPresets.put(record);
        selectedPresetId = saved.id;
        showToast('已保存「' + name + '」');
      }
      await refreshPresetList();
    } catch (err) {
      console.error(err);
      showToast(err.message || '保存失败');
    }
  }

  async function updateSelectedPreset() {
    if (!selectedPresetId || !window.PoemPresets) return;
    try {
      const existing = await window.PoemPresets.get(selectedPresetId);
      if (!existing) {
        showToast('所选预设不存在');
        selectedPresetId = null;
        await refreshPresetList();
        return;
      }
      const saved = await window.PoemPresets.put({
        ...existing,
        ...snapshotForPreset(),
        name: existing.name,
        id: existing.id
      });
      selectedPresetId = saved.id;
      if (els.presetName) els.presetName.value = saved.name;
      showToast('已更新「' + saved.name + '」');
      await refreshPresetList();
    } catch (err) {
      console.error(err);
      showToast(err.message || '更新失败');
    }
  }

  async function renameSelectedPreset() {
    if (!selectedPresetId || !window.PoemPresets) return;
    try {
      const existing = await window.PoemPresets.get(selectedPresetId);
      if (!existing) {
        showToast('所选预设不存在');
        selectedPresetId = null;
        await refreshPresetList();
        return;
      }
      const next = window.prompt('新名称', existing.name);
      if (next == null) return;
      const name = String(next).trim();
      if (!name) {
        showToast('名称不能为空');
        return;
      }
      const saved = await window.PoemPresets.rename(existing.id, name);
      if (els.presetName) els.presetName.value = saved.name;
      showToast('已改名为「' + saved.name + '」');
      await refreshPresetList();
    } catch (err) {
      console.error(err);
      showToast(err.message || '改名失败');
    }
  }

  async function deleteSelectedPreset() {
    if (!selectedPresetId || !window.PoemPresets) return;
    try {
      const existing = await window.PoemPresets.get(selectedPresetId);
      if (!existing) {
        selectedPresetId = null;
        await refreshPresetList();
        return;
      }
      const ok = window.confirm(`确定删除预设「${existing.name}」？`);
      if (!ok) return;
      await window.PoemPresets.remove(existing.id);
      selectedPresetId = null;
      if (els.presetName) els.presetName.value = '';
      showToast('已删除「' + existing.name + '」');
      await refreshPresetList();
    } catch (err) {
      console.error(err);
      showToast(err.message || '删除失败');
    }
  }

  function initPresets() {
    els.presetName = $('#preset-name');
    els.presetList = $('#preset-list');
    els.presetEmpty = $('#preset-empty');
    els.btnPresetSave = $('#btn-preset-save');
    els.btnPresetUpdate = $('#btn-preset-update');
    els.btnPresetRename = $('#btn-preset-rename');
    els.btnPresetDelete = $('#btn-preset-delete');
    if (!els.btnPresetSave) return;

    els.btnPresetSave.addEventListener('click', saveCurrentAsPreset);
    els.btnPresetUpdate.addEventListener('click', updateSelectedPreset);
    els.btnPresetRename.addEventListener('click', renameSelectedPreset);
    els.btnPresetDelete.addEventListener('click', deleteSelectedPreset);
    if (els.presetName) {
      els.presetName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveCurrentAsPreset();
        }
      });
    }
    refreshPresetList().catch((err) => console.error(err));
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
        const faces = new Set(['Noto Sans SC', 'LXGW WenKai', 'Noto Serif SC']);
        const preset = FONT_PRESETS[state.font] || FONT_PRESETS.wenkai;
        if (preset.loadName) faces.add(preset.loadName);
        await Promise.all(
          [...faces].map((f) => document.fonts.load(`400 16px "${f}"`).catch(() => null))
        );
      } catch (_) { /* ignore */ }
    }
  }

  function hideSelectionForExport() {
    hideLayoutContextMenu();
    selectBlock(null);
    if (els.card) els.card.classList.add('is-exporting');
  }

  function restoreAfterExport() {
    if (els.card) els.card.classList.remove('is-exporting');
  }

  async function exportPng() {
    const card = els.card;
    if (!window.html2canvas) {
      showToast('html2canvas 未加载');
      return;
    }
    els.btnExport.disabled = true;
    els.btnExport.textContent = '导出中…';
    hideSelectionForExport();
    try {
      await waitFonts();
      // 等一帧确保选中框已隐藏
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
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
      restoreAfterExport();
      els.btnExport.disabled = false;
      els.btnExport.textContent = '下载 PNG';
    }
  }


  /**
   * 无头 / 外部调用：注入诗帖状态并刷新预览。
   */
  async function apply(payload = {}) {
    const p = payload || {};
    const tplId = p.template || p.templateId;
    if (tplId) {
      state.templateId = tplId;
      syncTemplateSelect();
    }
    const keys = ['title', 'author', 'body', 'meaning', 'watermark', 'date'];
    keys.forEach((k) => {
      if (p[k] !== undefined) state[k] = String(p[k]);
    });
    if (Array.isArray(p.excerpts)) {
      state.excerpts = p.excerpts.map((e) => ({
        verse: (e && e.verse) || '',
        source: (e && e.source) || ''
      }));
    }
    if (p.font) state.font = p.font;

    if (p.layout && typeof p.layout === 'object') {
      state.layout = cloneLayout(p.layout);
      state.layoutDirty = p.layoutDirty !== false;
    } else if (
      p.bodyScale != null || p.titleScale != null || p.meaningScale != null
    ) {
      state.layout = migrateLegacyTypoToLayout(p);
      state.layoutDirty = false;
    }

    syncFormFromState();
    updateFieldVisibility();
    if (p.ratio) {
      setRatio(String(p.ratio).replace(':', '/'));
    } else {
      renderCard();
    }
    await waitFonts();
    const imgs = [...els.card.querySelectorAll('img')];
    await Promise.all(
      imgs.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => {
                img.addEventListener('load', res, { once: true });
                img.addEventListener('error', res, { once: true });
              })
      )
    );
    return getPublicState();
  }

  function getPublicState() {
    return {
      templateId: state.templateId,
      ratio: state.ratio,
      title: state.title,
      author: state.author,
      body: state.body,
      meaning: state.meaning,
      watermark: state.watermark,
      date: state.date,
      excerpts: state.excerpts.map((e) => ({ ...e })),
      font: state.font,
      layout: cloneLayout(state.layout),
      layoutDirty: !!state.layoutDirty,
      bodyScale: (state.layout.body && state.layout.body.scale) || 1,
      titleScale: (state.layout.title && state.layout.title.scale) || 1,
      meaningScale: (state.layout.meaning && state.layout.meaning.scale) || 1,
      offsetY: 0,
      padY: 0,
      align: '',
      selectedBlock: state.selectedBlock
    };
  }

  async function exportPngDataUrl(opts = {}) {
    const card = els.card;
    if (!window.html2canvas) throw new Error('html2canvas 未加载');
    hideSelectionForExport();
    try {
      await waitFonts();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const scale = opts.scale || Math.max(2, Math.min(3, window.devicePixelRatio || 2));
      const canvas = await html2canvas(card, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      });
      return canvas.toDataURL('image/png');
    } finally {
      restoreAfterExport();
    }
  }


  /* ========== 左右分栏拖拽（宽屏） ========== */
  const SPLIT_STORAGE_KEY = 'poem-post:split';
  const SPLIT_DEFAULT_PCT = 55;
  const SPLIT_PREVIEW_MIN = 280;
  const SPLIT_EDITOR_MIN = 320;
  const SPLIT_HANDLE_W = 6;

  function clampSplitPct(pct, mainWidth) {
    if (!mainWidth || mainWidth <= 0) return SPLIT_DEFAULT_PCT;
    const minPct = (SPLIT_PREVIEW_MIN / mainWidth) * 100;
    const maxPct = ((mainWidth - SPLIT_HANDLE_W - SPLIT_EDITOR_MIN) / mainWidth) * 100;
    if (maxPct <= minPct) return (minPct + maxPct) / 2;
    return Math.min(maxPct, Math.max(minPct, pct));
  }

  function readStoredSplitPct() {
    try {
      const raw = localStorage.getItem(SPLIT_STORAGE_KEY);
      const n = raw == null ? NaN : parseFloat(raw);
      if (Number.isFinite(n) && n > 5 && n < 95) return n;
    } catch (_) { /* private mode */ }
    return SPLIT_DEFAULT_PCT;
  }

  function writeStoredSplitPct(pct) {
    try {
      localStorage.setItem(SPLIT_STORAGE_KEY, String(Math.round(pct * 10) / 10));
    } catch (_) { /* ignore */ }
  }

  function applySplitPct(pct) {
    const main = els.appMain;
    if (!main) return pct;
    const w = main.getBoundingClientRect().width;
    const clamped = clampSplitPct(pct, w);
    main.style.setProperty('--preview-pct', clamped + '%');
    return clamped;
  }

  function isStackedLayout() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  function initSplitPane() {
    els.appMain = $('.app-main');
    els.splitHandle = $('#split-handle');
    if (!els.appMain || !els.splitHandle) return;

    let pct = readStoredSplitPct();
    if (!isStackedLayout()) pct = applySplitPct(pct);

    let dragging = false;
    let activePointerId = null;

    const onPointerMove = (e) => {
      if (!dragging || isStackedLayout()) return;
      if (activePointerId != null && e.pointerId !== activePointerId) return;
      const rect = els.appMain.getBoundingClientRect();
      const x = e.clientX - rect.left;
      pct = applySplitPct((x / rect.width) * 100);
    };

    const endDrag = (e) => {
      if (!dragging) return;
      if (activePointerId != null && e && e.pointerId !== activePointerId) return;
      dragging = false;
      activePointerId = null;
      document.body.classList.remove('is-resizing');
      els.appMain.classList.remove('is-resizing');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      if (!isStackedLayout()) writeStoredSplitPct(pct);
    };

    els.splitHandle.addEventListener('pointerdown', (e) => {
      if (isStackedLayout()) return;
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      activePointerId = e.pointerId;
      document.body.classList.add('is-resizing');
      els.appMain.classList.add('is-resizing');
      try { els.splitHandle.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    });

    els.splitHandle.addEventListener('dblclick', () => {
      if (isStackedLayout()) return;
      pct = applySplitPct(SPLIT_DEFAULT_PCT);
      writeStoredSplitPct(pct);
    });

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isStackedLayout()) return;
        pct = applySplitPct(pct);
        // 卡片尺寸变化时，若仍是默认测量态则重新测量
        if (!state.layoutDirty) {
          resetLayoutState(!!state.selectedBlock);
          renderCard();
        } else {
          applyFreeLayout();
        }
      }, 80);
    });
  }


  function hideLayoutContextMenu() {
    const menu = els.layoutContextMenu || $('#layout-context-menu');
    if (!menu) return;
    menu.hidden = true;
  }

  function showLayoutContextMenu(clientX, clientY) {
    const menu = els.layoutContextMenu || $('#layout-context-menu');
    if (!menu || !state.selectedBlock) return;
    menu.style.left = clientX + 'px';
    menu.style.top = clientY + 'px';
    menu.hidden = false;
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = menu.getBoundingClientRect();
    let left = clientX;
    let top = clientY;
    if (left + rect.width > vw - pad) left = Math.max(pad, vw - rect.width - pad);
    if (top + rect.height > vh - pad) top = Math.max(pad, vh - rect.height - pad);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  function initLayoutContextMenu() {
    els.layoutContextMenu = $('#layout-context-menu');
    const menu = els.layoutContextMenu;
    const card = els.card;
    if (!menu || !card) return;

    menu.querySelectorAll('[data-place]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const side = btn.dataset.place;
        const id = state.selectedBlock;
        hideLayoutContextMenu();
        if (id && side) placeBlockInParent(id, side);
      });
    });

    card.addEventListener('contextmenu', (e) => {
      if (card.classList.contains('is-exporting')) return;
      const block = e.target.closest && e.target.closest('.layout-block');
      if (block) {
        e.preventDefault();
        selectBlock(block.dataset.block);
        showLayoutContextMenu(e.clientX, e.clientY);
        return;
      }
      if (state.selectedBlock) {
        e.preventDefault();
        showLayoutContextMenu(e.clientX, e.clientY);
        return;
      }
      hideLayoutContextMenu();
    });

    document.addEventListener('pointerdown', (e) => {
      if (!menu || menu.hidden) return;
      if (menu.contains(e.target)) return;
      hideLayoutContextMenu();
    }, true);
  }

  /* ========== 自由排版交互 ========== */
  function initLayoutInteraction() {
    const card = els.card;
    if (!card) return;

    card.addEventListener('pointerdown', (e) => {
      if (e.button != null && e.button !== 0) return;
      const handle = e.target.closest && e.target.closest('.layout-handle');
      const block = e.target.closest && e.target.closest('.layout-block');

      if (!block) {
        hideLayoutContextMenu();
        selectBlock(null);
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const id = block.dataset.block;
      selectBlock(id);

      const cardRect = card.getBoundingClientRect();
      const L = state.layout[id] || defaultBlockLayout();
      if (L.x == null || L.y == null) {
        ensureLayoutPositions();
      }
      const cur = state.layout[id] || defaultBlockLayout();

      if (handle) {
        dragSession = {
          mode: 'scale',
          id,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          originScale: cur.scale == null ? 1 : Number(cur.scale),
          cardW: cardRect.width,
          cardH: cardRect.height
        };
      } else {
        dragSession = {
          mode: 'move',
          id,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          originX: cur.x,
          originY: cur.y,
          cardW: cardRect.width,
          cardH: cardRect.height
        };
      }

      try { card.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      card.classList.add('is-dragging');
    });

    card.addEventListener('pointermove', (e) => {
      if (!dragSession || e.pointerId !== dragSession.pointerId) return;
      const dx = e.clientX - dragSession.startX;
      const dy = e.clientY - dragSession.startY;
      state.selectedBlock = dragSession.id;

      if (dragSession.mode === 'move') {
        const nx = dragSession.originX + (dx / dragSession.cardW) * 100;
        const ny = dragSession.originY + (dy / dragSession.cardH) * 100;
        updateSelectedLayout({ x: nx, y: ny });
      } else if (dragSession.mode === 'scale') {
        const dist = (dx + dy) / 2;
        const delta = dist / 120;
        updateSelectedLayout({ scale: dragSession.originScale + delta });
      }
    });

    const endDrag = (e) => {
      if (!dragSession) return;
      if (e && dragSession.pointerId != null && e.pointerId !== dragSession.pointerId) return;
      dragSession = null;
      card.classList.remove('is-dragging');
    };
    card.addEventListener('pointerup', endDrag);
    card.addEventListener('pointercancel', endDrag);

    card.addEventListener('wheel', (e) => {
      if (!state.selectedBlock) return;
      e.preventDefault();
      const cur = state.layout[state.selectedBlock];
      if (!cur) return;
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      updateSelectedLayout({ scale: (cur.scale == null ? 1 : cur.scale) + delta });
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideLayoutContextMenu();
        selectBlock(null);
      }
    });
  }

  function initLayoutPanel() {
    els.layoutBlockPanel = $('#layout-block-panel');
    els.layoutBlockName = $('#layout-block-name');
    els.layoutX = $('#layout-x');
    els.layoutY = $('#layout-y');
    els.layoutScale = $('#layout-scale');
    els.layoutW = $('#layout-w');
    els.layoutLh = $('#layout-lh');
    els.layoutLs = $('#layout-ls');
    els.valLayoutX = $('#val-layout-x');
    els.valLayoutY = $('#val-layout-y');
    els.valLayoutScale = $('#val-layout-scale');
    els.valLayoutW = $('#val-layout-w');
    els.valLayoutLh = $('#val-layout-lh');
    els.valLayoutLs = $('#val-layout-ls');
    els.font = $('#typo-font');
    els.btnResetTypo = $('#btn-reset-typo');

    const bindRange = (input, key, fmt) => {
      if (!input) return;
      input.addEventListener('input', () => {
        if (!state.selectedBlock) return;
        const val = Number(input.value);
        updateSelectedLayout({ [key]: val });
        if (fmt && input === els.layoutX) { /* syncLayoutPanel handles vals */ }
      });
    };
    bindRange(els.layoutX, 'x');
    bindRange(els.layoutY, 'y');
    bindRange(els.layoutScale, 'scale');
    bindRange(els.layoutW, 'w');
    bindRange(els.layoutLh, 'lineHeight');
    bindRange(els.layoutLs, 'letterSpacing');

    $$('#layout-align-row .btn').forEach((b) => {
      b.addEventListener('click', () => {
        if (!state.selectedBlock) return;
        const align = b.dataset.align || '';
        const patch = { align };
        const cur = state.layout[state.selectedBlock];
        // 显式对齐：必要时扩宽；并按左/中/右把整块摆进诗卡（再次点「中」会重新居中）
        if (align && cur) {
          if (cur.x == null) ensureLayoutPositions();
          const live = state.layout[state.selectedBlock] || cur;
          const oldW = live.w == null ? null : Number(live.w);
          const MIN_W = 64;
          const w = (oldW == null || oldW < MIN_W) ? 72 : oldW;
          if (oldW == null || oldW < MIN_W) patch.w = w;
          if (align === 'center') {
            patch.x = round1(clamp((100 - w) / 2, -5, 98));
          } else if (align === 'right') {
            patch.x = round1(clamp(100 - w, -5, 98));
          } else if (align === 'left') {
            patch.x = round1(clamp(0, -5, 98));
          }
        }
        updateSelectedLayout(patch);
      });
    });

    if (els.font) {
      els.font.addEventListener('change', () => {
        state.font = els.font.value;
        applyFontOnly();
        waitFonts();
      });
    }
    if (els.btnResetTypo) {
      els.btnResetTypo.addEventListener('click', resetTypography);
    }
    syncLayoutPanel();
  }

  function init() {
    els.templateSelect = $('#template-select');
    els.title = $('#field-title');
    els.author = $('#field-author');
    els.body = $('#field-body');
    els.meaning = $('#field-meaning');
    els.watermark = $('#field-watermark');
    els.date = $('#field-date');
    els.fieldTitle = $('#wrap-title');
    els.fieldAuthor = $('#wrap-author');
    els.fieldBody = $('#wrap-body');
    els.fieldMeaning = $('#wrap-meaning');
    els.fieldWatermark = $('#wrap-watermark');
    els.fieldDate = $('#wrap-date');
    els.card = $('#poem-card');
    els.btnExport = $('#btn-export');
    els.btnReset = $('#btn-reset');
    els.toast = $('#toast');

    renderTemplateSelect();
    if (els.templateSelect) {
      els.templateSelect.addEventListener('change', onTemplateSelectChange);
    }
    initLayoutContextMenu();
    initLayoutPanel();
    initLayoutInteraction();

    ['title', 'author', 'body', 'meaning', 'watermark', 'date'].forEach((key) => {
      els[key].addEventListener('input', () => {
        syncStateFromForm();
        // 内容变化会重渲染 DOM；若用户已自由排版则保留坐标
        renderCard();
      });
    });

    $$('.ratio-row .btn').forEach((b) => {
      b.addEventListener('click', () => setRatio(b.dataset.ratio));
    });

    els.btnExport.addEventListener('click', exportPng);
    els.btnReset.addEventListener('click', () => loadSample(state.templateId));

    els.btnExport.disabled = true;
    els.btnExport.textContent = '字体加载中…';
    waitFonts().then(() => {
      els.btnExport.disabled = false;
      els.btnExport.textContent = '下载 PNG';
      // 字体到位后若仍是模板默认排版，重新测量自然坐标
      if (!state.layoutDirty) {
        resetLayoutState(!!state.selectedBlock);
        applyFreeLayout();
        if (state.selectedBlock) selectBlock(state.selectedBlock, { skipPanelFocus: true });
        else syncLayoutPanel();
      }
    });

    loadSample(state.templateId);
    setRatio('3/4');
    initSplitPane();
    initPresets();

    window.PoemPost = {
      ready: true,
      apply,
      exportPng: exportPngDataUrl,
      getState: getPublicState,
      waitFonts
    };
    window.__POEM_APPLY__ = apply;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
