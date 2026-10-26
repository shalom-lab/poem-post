(function () {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const TYPO_DEFAULTS = {
    bodyScale: 1,
    titleScale: 1,
    meaningScale: 1,
    offsetY: 0,
    padY: 0,
    align: '',
    font: 'wenkai'
  };

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
    ...TYPO_DEFAULTS
  };

  /** 仪表盘「预设样式」当前选中项（IndexedDB id） */
  let selectedPresetId = null;

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

    // 特殊模板字段文案
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
    // 仅支持 3/4、3/5；旧的 9/16 等一律回落到默认 3/4
    if (r !== '3/4' && r !== '3/5') r = '3/4';
    state.ratio = r;
    $$('.ratio-row .btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.ratio === r);
    });
    renderCard();
  }

  function ratioClass(r) {
    if (r === '3/5') return 'ratio-3-5';
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
      case 'photo-quote':
        html = renderPhotoQuote();
        break;
      case 'wall-light':
        html = renderWallLight();
        break;
      case 'parchment-navy':
        html = renderParchmentNavy();
        break;
      default:
        html = renderMoonLetter();
    }

    card.innerHTML = html;
    applyTypography();
  }

  function applyTypography() {
    const card = els.card;
    if (!card) return;
    card.style.setProperty('--body-scale', String(state.bodyScale));
    card.style.setProperty('--title-scale', String(state.titleScale));
    card.style.setProperty('--meaning-scale', String(state.meaningScale));
    card.style.setProperty('--offset-y', state.offsetY + '%');
    card.style.setProperty('--pad-y', state.padY + '%');
    const preset = FONT_PRESETS[state.font] || FONT_PRESETS.wenkai;
    card.style.setProperty('--poem-font', preset.family);
    if (state.align) {
      card.style.setProperty('--align', state.align);
      card.classList.add('align-override');
    } else {
      card.style.removeProperty('--align');
      card.classList.remove('align-override');
    }
  }

  function syncTypoFormFromState() {
    if (!els.bodyScale) return;
    els.bodyScale.value = state.bodyScale;
    els.titleScale.value = state.titleScale;
    els.meaningScale.value = state.meaningScale;
    els.offsetY.value = state.offsetY;
    els.padY.value = state.padY;
    els.font.value = state.font;
    els.valBody.textContent = Number(state.bodyScale).toFixed(2) + '×';
    els.valTitle.textContent = Number(state.titleScale).toFixed(2) + '×';
    els.valMeaning.textContent = Number(state.meaningScale).toFixed(2) + '×';
    els.valOffset.textContent = state.offsetY + '%';
    els.valPad.textContent = state.padY + '%';
    $$('#typo-align-row .btn').forEach((b) => {
      b.classList.toggle('active', (b.dataset.align || '') === (state.align || ''));
    });
  }

  function resetTypography() {
    Object.assign(state, { ...TYPO_DEFAULTS });
    syncTypoFormFromState();
    applyTypography();
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

  function renderPhotoQuote() {
    const sub = state.meaning.trim();
    return `
      <div class="pc-photo-scrim" aria-hidden="true"></div>
      <div class="pc-inner">
        <div class="pc-quote-block">
          <span class="pc-quote-mark pc-quote-open" aria-hidden="true">“</span>
          <div class="pc-body">${nl2brPreserve(state.body)}</div>
          <span class="pc-quote-mark pc-quote-close" aria-hidden="true">”</span>
        </div>
        ${sub ? `<div class="pc-sub">${nl2brPreserve(state.meaning)}</div>` : ''}
        ${state.watermark.trim() ? `<div class="pc-watermark">${escapeHtml(state.watermark)}</div>` : ''}
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
          ${state.title ? `<div class="pc-title">${escapeHtml(state.title)}</div>` : ''}
          ${handle ? `<div class="pc-handle">${escapeHtml(handle)}</div>` : ''}
        </div>
        <div class="pc-body">${nl2brPreserve(state.body)}</div>
        ${state.author ? `<div class="pc-author-right">${escapeHtml(state.author)}</div>` : ''}
        ${state.meaning.trim() ? `<div class="pc-meaning"><span class="pc-yiwen">译文：</span>${nl2brPreserve(state.meaning)}</div>` : ''}
        ${footer ? `<div class="pc-footer-brand">${nl2brPreserve(state.date)}</div>` : ''}
      </div>
    `;
  }

  function ghostCharsFromState() {
    const raw = (state.watermark || state.author || '').trim();
    if (!raw) return '诗';
    // 去掉破折号、朝代点号等，取末尾 1–4 个汉字/字母作幽灵字
    const cleaned = raw.replace(/[—\-·•\s《》「」【】\[\]（）()]/g, '');
    const chars = [...cleaned].filter((ch) => /[\u4e00-\u9fffA-Za-z]/.test(ch));
    if (!chars.length) return raw.slice(0, 2) || '诗';
    return chars.slice(-4).join('');
  }

  function renderParchmentNavy() {
    const ghost = ghostCharsFromState();
    const en = state.meaning.trim();
    return `
      <div class="pc-ghost" aria-hidden="true">${escapeHtml(ghost)}</div>
      <div class="pc-inner">
        <div class="pc-body">${nl2brPreserve(state.body)}</div>
        ${state.author ? `<div class="pc-author-right">${escapeHtml(state.author)}</div>` : ''}
        ${en ? `<div class="pc-english">${nl2brPreserve(state.meaning)}</div>` : ''}
      </div>
    `;
  }


  /* ========== 预设样式（IndexedDB） ========== */
  const PRESET_CONTENT_KEYS = ['title', 'author', 'body', 'meaning', 'watermark', 'date'];
  const PRESET_TYPO_KEYS = ['bodyScale', 'titleScale', 'meaningScale', 'offsetY', 'padY', 'align', 'font'];

  function snapshotForPreset() {
    const snap = {
      templateId: state.templateId,
      ratio: state.ratio === '3/5' ? '3/5' : '3/4'
    };
    PRESET_CONTENT_KEYS.forEach((k) => { snap[k] = state[k] || ''; });
    PRESET_TYPO_KEYS.forEach((k) => { snap[k] = state[k]; });
    return snap;
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
    // 不走 loadSample：保留预设内排版与文案
    const tplId = p.templateId || state.templateId;
    state.templateId = tplId;
    $$('.tpl-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === tplId));
    setRatio(p.ratio === '3/5' ? '3/5' : '3/4');
    PRESET_CONTENT_KEYS.forEach((k) => {
      if (p[k] !== undefined) state[k] = String(p[k] ?? '');
    });
    PRESET_TYPO_KEYS.forEach((k) => {
      if (p[k] !== undefined && p[k] !== null && p[k] !== '') {
        state[k] = k === 'align' || k === 'font' ? p[k] : Number(p[k]);
      }
    });
    if (p.align === '') state.align = '';
    if (els.presetName) els.presetName.value = p.name || '';
    syncFormFromState();
    syncTypoFormFromState();
    updateFieldVisibility();
    renderCard();
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
        // unicode-range 分包：只强等当前所选面 + UI/默认备选
        await Promise.all(
          [...faces].map((f) => document.fonts.load(`400 16px "${f}"`).catch(() => null))
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


  /**
   * 无头 / 外部调用：注入诗帖状态并刷新预览。
   * payload 字段均可选：template|templateId, title, author, body, meaning,
   * watermark, date, excerpts (accepted for compat, unused by current templates),
   * ratio, bodyScale, titleScale, meaningScale, offsetY, padY, align, font
   */
  async function apply(payload = {}) {
    const p = payload || {};
    const tplId = p.template || p.templateId;
    if (tplId) {
      state.templateId = tplId;
      $$('.tpl-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === tplId));
    }
    if (p.ratio) {
      setRatio(String(p.ratio).replace(':', '/'));
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
    ['bodyScale', 'titleScale', 'meaningScale', 'offsetY', 'padY'].forEach((k) => {
      if (p[k] !== undefined && p[k] !== null && p[k] !== '') state[k] = Number(p[k]);
    });
    if (p.align !== undefined) state.align = p.align || '';
    if (p.font) state.font = p.font;

    syncFormFromState();
    syncTypoFormFromState();
    updateFieldVisibility();
    renderCard();
    await waitFonts();
    // 等背景图 / 装饰 SVG
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
      bodyScale: state.bodyScale,
      titleScale: state.titleScale,
      meaningScale: state.meaningScale,
      offsetY: state.offsetY,
      padY: state.padY,
      align: state.align,
      font: state.font
    };
  }

  /** 返回诗卡 PNG dataURL（不触发下载），供无头脚本取回 */
  async function exportPngDataUrl(opts = {}) {
    const card = els.card;
    if (!window.html2canvas) throw new Error('html2canvas 未加载');
    await waitFonts();
    const scale = opts.scale || Math.max(2, Math.min(3, window.devicePixelRatio || 2));
    const canvas = await html2canvas(card, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false
    });
    return canvas.toDataURL('image/png');
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
      }, 80);
    });
  }

  function init() {
    els.templateGrid = $('#template-grid');
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

    // 排版控件
    els.bodyScale = $('#typo-body-scale');
    els.titleScale = $('#typo-title-scale');
    els.meaningScale = $('#typo-meaning-scale');
    els.offsetY = $('#typo-offset-y');
    els.padY = $('#typo-pad-y');
    els.font = $('#typo-font');
    els.valBody = $('#val-body-scale');
    els.valTitle = $('#val-title-scale');
    els.valMeaning = $('#val-meaning-scale');
    els.valOffset = $('#val-offset-y');
    els.valPad = $('#val-pad-y');
    els.btnResetTypo = $('#btn-reset-typo');

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

    const onScale = (key, input, valEl, fmt) => {
      input.addEventListener('input', () => {
        state[key] = Number(input.value);
        valEl.textContent = fmt(state[key]);
        applyTypography();
      });
    };
    onScale('bodyScale', els.bodyScale, els.valBody, (v) => v.toFixed(2) + '×');
    onScale('titleScale', els.titleScale, els.valTitle, (v) => v.toFixed(2) + '×');
    onScale('meaningScale', els.meaningScale, els.valMeaning, (v) => v.toFixed(2) + '×');
    onScale('offsetY', els.offsetY, els.valOffset, (v) => v + '%');
    onScale('padY', els.padY, els.valPad, (v) => v + '%');

    $$('#typo-align-row .btn').forEach((b) => {
      b.addEventListener('click', () => {
        state.align = b.dataset.align || '';
        $$('#typo-align-row .btn').forEach((x) => x.classList.toggle('active', x === b));
        applyTypography();
      });
    });

    els.font.addEventListener('change', () => {
      state.font = els.font.value;
      applyTypography();
      waitFonts();
    });

    els.btnResetTypo.addEventListener('click', resetTypography);

    els.btnExport.addEventListener('click', exportPng);
    els.btnReset.addEventListener('click', () => loadSample(state.templateId));

    // 字体就绪前先禁用导出，避免缺字 PNG
    els.btnExport.disabled = true;
    els.btnExport.textContent = '字体加载中…';
    waitFonts().then(() => {
      els.btnExport.disabled = false;
      els.btnExport.textContent = '下载 PNG';
    });

    syncTypoFormFromState();
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
    // 兼容别名
    window.__POEM_APPLY__ = apply;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
