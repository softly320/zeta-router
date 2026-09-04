(() => {
  'use strict';

  if (!/(^|\.)zeta-ai\.io$/i.test(location.hostname)) {
    alert('Private Plot Explorer는 Zeta에서만 실행할 수 있습니다.');
    return;
  }

  if (window.__PRIVATE_PLOT_EXPLORER_CORE_LOADED__) return;
  window.__PRIVATE_PLOT_EXPLORER_CORE_LOADED__ = true;

  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const API = 'https://api.zeta-ai.io';
  const CORE_VERSION = '1.9.0';
  const UI_ID = 'zeta-private-plot-explorer-v1';
  const STATE_KEY = 'zeta_private_plot_explorer_state_v1';
  const POS_KEY = 'zeta_private_plot_explorer_pos_v1';

  const DEFAULT_STATE = {
    source: 'ALL',
    fields: {
      title: true,
      shortDescription: true,
      longDescription: true,
      characterName: true,
      creatorName: true,
      creatorComment: true,
      conversations: true
    },
    logic: 'AND',
    matchMode: 'CONTAINS',
    interactionMode: 'ALL',
    interactionMin: '',
    interactionMax: '',
    presence: {
      title: 'ANY',
      shortDescription: 'ANY',
      creatorComment: 'ANY',
      conversations: 'ANY'
    },
    sort: 'UPDATED_DESC'
  };

  let auth = null;
  let clientVersion = null;
  let nativeVersion = null;
  let userLanguage = 'KOREAN';
  let deviceType = 'web';
  let clientType = 'web';

  let allPlots = [];
  let filteredPlots = [];
  let selectedIds = new Set();
  let loading = false;
  let deleting = false;
  let state = loadState();

  let panel, content, resultsEl, queryEl, countAllEl, countPersonalEl,
      countLockedEl, countResultEl, countSelectedEl, deleteBtn, refreshBtn,
      filterPanel, fieldSummaryEl, resizeHandle, statusEl;
  let closedByUser = false;
  const PAGE_SIZE = 40;
  let visibleLimit = PAGE_SIZE;
  let searchIndex = new Map();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      return mergeState(DEFAULT_STATE, saved || {});
    } catch {
      return structuredCloneSafe(DEFAULT_STATE);
    }
  }

  function structuredCloneSafe(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function mergeState(base, saved) {
    const out = structuredCloneSafe(base);
    for (const [k, v] of Object.entries(saved || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
        out[k] = { ...out[k], ...v };
      } else if (k in out) out[k] = v;
    }
    return out;
  }

  function saveState() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
  }

  function captureHeader(k, v) {
    const key = String(k || '').toLowerCase();
    const val = String(v || '');
    const hadAuth = !!auth;

    if (key === 'authorization' && val) auth = val;
    if (key === 'x-client-version' && val) clientVersion = val;
    if (key === 'x-client-native-version' && val) nativeVersion = val;
    if (key === 'x-user-language' && val) userLanguage = val;
    if (key === 'x-device-type' && val) deviceType = val;
    if (key === 'x-client-type' && val) clientType = val;

    // Bookmarklet may be launched from any Zeta page.
    // As soon as a normal Zeta API request exposes the auth header, load automatically.
    if (!hadAuth && auth && panel && !loading && allPlots.length === 0) {
      setTimeout(() => {
        if (auth && panel && !loading && allPlots.length === 0) loadAllPlots();
      }, 0);
    }
  }

  // Capture the page's existing API headers without storing them persistently.
  try {
    const p = W.XMLHttpRequest.prototype;
    const origSet = p.setRequestHeader;
    p.setRequestHeader = function(k, v) {
      try { captureHeader(k, v); } catch {}
      return origSet.call(this, k, v);
    };
  } catch {}

  try {
    const origFetch = W.fetch;
    W.fetch = function(input, init = {}) {
      try {
        const h = init?.headers;
        if (h) {
          if (h instanceof Headers) h.forEach((v, k) => captureHeader(k, v));
          else if (Array.isArray(h)) h.forEach(([k, v]) => captureHeader(k, v));
          else Object.entries(h).forEach(([k, v]) => captureHeader(k, v));
        }
      } catch {}
      return origFetch.apply(this, arguments);
    };
  } catch {}

  function wakeZetaAuth() {
    // Verified on Zeta: visibilitychange causes an authenticated XHR.
    // That request is captured by the hooks above, then loadAllPlots() starts automatically.
    try {
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
    } catch {}
  }

  function apiHeaders(json = false) {
    const h = {
      'Accept': 'application/json, text/plain, */*',
      'X-Client-Type': clientType || 'web',
      'X-User-Language': userLanguage || 'KOREAN',
      'X-Device-Type': deviceType || 'web'
    };
    if (clientVersion) h['X-Client-Version'] = clientVersion;
    if (nativeVersion) h['X-Client-Native-Version'] = nativeVersion;
    if (auth) h['Authorization'] = auth;
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  function request(method, url, body = null) {
    return new Promise((resolve, reject) => {
      const xhr = new W.XMLHttpRequest();
      xhr.open(method, url, true);
      Object.entries(apiHeaders(body !== null)).forEach(([k, v]) => {
        try { xhr.setRequestHeader(k, v); } catch {}
      });
      xhr.onload = () => {
        let data = null;
        try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; }
        catch { data = xhr.responseText; }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(`${xhr.status} ${xhr.statusText || ''}`.trim()));
      };
      xhr.onerror = () => reject(new Error('네트워크 오류'));
      xhr.send(body === null ? null : JSON.stringify(body));
    });
  }

  function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function normalize(v) {
    return String(v ?? '').trim().toLocaleLowerCase();
  }

  function hasContent(v) {
    if (Array.isArray(v)) return v.length > 0;
    return String(v ?? '').trim().length > 0;
  }

  function getCreatorText(p) {
    return [...new Set([
      p?.creator?.nickname,
      p?.creator?.username
    ].filter(Boolean))].join(' ');
  }

  function getCharacterNames(p) {
    return (Array.isArray(p?.characters) ? p.characters : [])
      .map(c => c?.name)
      .filter(Boolean)
      .join(' ');
  }

  function getConversationText(p) {
    const convs = Array.isArray(p?.conversations) ? p.conversations : [];
    const out = [];
    for (const conv of convs) {
      const msgs = Array.isArray(conv?.messages) ? conv.messages : [];
      for (const m of msgs) {
        if (m?.content) out.push(m.content);
        if (m?.senderName) out.push(m.senderName);
      }
    }
    return out.join('\n');
  }

  function getRawFieldValue(p, key) {
    switch (key) {
      case 'title': return p?.name ?? '';
      case 'shortDescription': return p?.shortDescription ?? '';
      case 'longDescription': return p?.longDescription ?? '';
      case 'characterName': return getCharacterNames(p);
      case 'creatorName': return getCreatorText(p);
      case 'creatorComment': return p?.creatorComment ?? '';
      case 'conversations': return getConversationText(p);
      default: return '';
    }
  }

  function getIndexEntry(p) {
    if (!p?.id) return { values: {}, normalized: {} };
    let entry = searchIndex.get(p.id);
    if (!entry) {
      entry = { values: {}, normalized: {} };
      searchIndex.set(p.id, entry);
    }
    return entry;
  }

  function getIndexedField(p, key) {
    const entry = getIndexEntry(p);
    if (!(key in entry.values)) {
      const raw = getRawFieldValue(p, key);
      entry.values[key] = raw;
      entry.normalized[key] = normalize(raw);
    }
    return {
      value: entry.values[key],
      normalized: entry.normalized[key]
    };
  }

  function rebuildSearchIndex() {
    // v1.7: do not eagerly process long plot details / conversation examples.
    // Fields are normalized only when the user actually searches them.
    searchIndex = new Map();
  }

  function getFieldValues(p) {
    const out = {};
    for (const key of Object.keys(FIELD_LABELS)) {
      out[key] = getIndexedField(p, key).value;
    }
    return out;
  }

  const FIELD_LABELS = {
    title: '제목',
    shortDescription: '소개글',
    longDescription: '플롯 상세',
    characterName: '캐릭터명',
    creatorName: '제작자명',
    creatorComment: '크리에이터 코멘트',
    conversations: '대화 예시'
  };

  function parseTerms(raw) {
    return String(raw || '')
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function fieldMatches(value, term) {
    const v = normalize(value);
    const t = normalize(term);
    if (!t) return true;
    if (state.matchMode === 'EXACT') return v === t;
    return v.includes(t);
  }

  function searchMatch(p, terms) {
    if (!terms.length) return { pass: true, fields: [] };

    const enabled = Object.keys(state.fields).filter(k => state.fields[k]);
    if (!enabled.length) return { pass: false, fields: [] };

    const termMatches = terms.map(term => {
      const t = normalize(term);
      const hitFields = enabled.filter(k => {
        const v = getIndexedField(p, k).normalized || '';
        return state.matchMode === 'EXACT' ? v === t : v.includes(t);
      });
      return { term, hitFields, hit: hitFields.length > 0 };
    });

    const pass = state.logic === 'AND'
      ? termMatches.every(x => x.hit)
      : termMatches.some(x => x.hit);

    const fields = [...new Set(termMatches.flatMap(x => x.hitFields))];
    return { pass, fields };
  }

  function sourceMatch(p) {
    if (state.source === 'PERSONAL') return p?.originatedId == null;
    if (state.source === 'LOCKED') return p?.originatedId != null;
    return true;
  }

  function interactionMatch(p) {
    const n = Number(p?.interactionCount || 0);
    if (state.interactionMode === 'ZERO') return n === 0;
    if (state.interactionMode === 'POSITIVE') return n >= 1;
    if (state.interactionMode === 'RANGE') {
      const min = state.interactionMin === '' ? -Infinity : Number(state.interactionMin);
      const max = state.interactionMax === '' ? Infinity : Number(state.interactionMax);
      return n >= min && n <= max;
    }
    return true;
  }

  function presenceMatch(p) {
    const values = {
      title: p?.name,
      shortDescription: p?.shortDescription,
      creatorComment: p?.creatorComment,
      conversations: Array.isArray(p?.conversations) ? p.conversations : []
    };

    for (const [k, mode] of Object.entries(state.presence)) {
      if (mode === 'ANY') continue;
      const yes = hasContent(values[k]);
      if (mode === 'HAS' && !yes) return false;
      if (mode === 'NONE' && yes) return false;
    }
    return true;
  }

  const SORT_LABELS = {
    UPDATED: '업데이트일',
    CREATED: '생성일',
    INTERACTION: '대화량',
    NAME: '이름'
  };

  function getSortParts() {
    const raw = String(state.sort || 'UPDATED_DESC');
    const m = raw.match(/^(UPDATED|CREATED|INTERACTION|NAME)_(ASC|DESC)$/);
    return m ? { key: m[1], dir: m[2] } : { key: 'UPDATED', dir: 'DESC' };
  }

  function setSort(key, dir, rerender = true) {
    state.sort = `${key}_${dir}`;
    saveState();
    updateSortUI();
    if (rerender) recompute(false);
  }

  function updateSortUI() {
    if (!panel) return;
    const { key, dir } = getSortParts();
    const label = panel.querySelector('#zpe-sort-label');
    const direction = panel.querySelector('#zpe-sort-direction');
    if (label) label.textContent = SORT_LABELS[key] || '업데이트일';
    if (direction) {
      direction.textContent = dir === 'DESC' ? '↓' : '↑';
      direction.setAttribute('aria-label', dir === 'DESC' ? '내림차순, 누르면 오름차순' : '오름차순, 누르면 내림차순');
      direction.title = dir === 'DESC' ? '내림차순 · 눌러서 오름차순' : '오름차순 · 눌러서 내림차순';
    }
    panel.querySelectorAll('[data-sort-key]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sortKey === key);
    });
  }

  function sortPlots(arr) {
    const a = [...arr];
    const numTime = v => {
      const n = Date.parse(v || '');
      return Number.isFinite(n) ? n : 0;
    };
    const { key, dir } = getSortParts();
    const sign = dir === 'ASC' ? 1 : -1;

    a.sort((x, y) => {
      let cmp = 0;
      switch (key) {
        case 'CREATED':
          cmp = numTime(x?.createdAt) - numTime(y?.createdAt);
          break;
        case 'INTERACTION':
          cmp = Number(x?.interactionCount || 0) - Number(y?.interactionCount || 0);
          break;
        case 'NAME':
          cmp = String(x?.name || '').localeCompare(String(y?.name || ''), 'ko-KR', {
            numeric: true,
            sensitivity: 'base'
          });
          break;
        case 'UPDATED':
        default:
          cmp = numTime(x?.updatedAt || x?.modifiedAt || x?.createdAt) -
                numTime(y?.updatedAt || y?.modifiedAt || y?.createdAt);
          break;
      }
      return cmp * sign;
    });
    return a;
  }

  function recompute(resetSelection = true) {
    if (resetSelection) selectedIds.clear();
    visibleLimit = PAGE_SIZE;

    const terms = parseTerms(queryEl?.value || '');
    const rows = [];

    for (const p of allPlots) {
      if (!sourceMatch(p) || !interactionMatch(p) || !presenceMatch(p)) continue;
      const sm = searchMatch(p, terms);
      if (!sm.pass) continue;
      rows.push({ plot: p, matchFields: sm.fields });
    }

    const sortedPlots = sortPlots(rows.map(x => x.plot));
    const matchMap = new Map(rows.map(x => [x.plot.id, x.matchFields]));
    filteredPlots = sortedPlots.map(p => ({ plot: p, matchFields: matchMap.get(p.id) || [] }));

    updateCounts();
    renderResults();
  }

  function updateCounts() {
    const valid = allPlots.filter(p => p && p.status !== 'DELETED' && p.isPrivate === true);
    const personal = valid.filter(p => p.originatedId == null).length;
    const locked = valid.filter(p => p.originatedId != null).length;

    if (countAllEl) countAllEl.textContent = valid.length;
    if (countPersonalEl) countPersonalEl.textContent = personal;
    if (countLockedEl) countLockedEl.textContent = locked;
    if (countResultEl) countResultEl.textContent = filteredPlots.length;
    if (countSelectedEl) countSelectedEl.textContent = selectedIds.size;

    if (deleteBtn) {
      deleteBtn.disabled = selectedIds.size === 0 || deleting;
      deleteBtn.textContent = selectedIds.size ? `선택 ${selectedIds.size}개 삭제` : '선택 삭제';
    }
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
  }

  function compact(s, max = 120) {
    const t = String(s ?? '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) + '…' : t;
  }

  function highlightSnippet(text, terms, max = 260) {
    const raw = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (!raw) return '';

    const norm = normalize(raw);
    let index = -1;
    let found = '';

    for (const term of terms) {
      const t = normalize(term);
      if (!t) continue;
      const i = norm.indexOf(t);
      if (i >= 0 && (index < 0 || i < index)) {
        index = i;
        found = raw.slice(i, i + term.length);
      }
    }

    let snippet = raw;
    if (index >= 0 && raw.length > max) {
      const start = Math.max(0, index - Math.floor(max * 0.35));
      const end = Math.min(raw.length, start + max);
      snippet = (start ? '…' : '') + raw.slice(start, end) + (end < raw.length ? '…' : '');
    } else if (raw.length > max) {
      snippet = raw.slice(0, max) + '…';
    }

    let html = esc(snippet);
    const sortedTerms = [...terms].sort((a, b) => b.length - a.length);
    for (const term of sortedTerms) {
      if (!term) continue;
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      try {
        html = html.replace(new RegExp(escapedTerm, 'gi'), m => `<mark>${m}</mark>`);
      } catch {}
    }
    return html;
  }

  function plotUrl(p) {
    return `${location.origin}/ko/plots/${encodeURIComponent(p.id)}/profile`;
  }

  function renderResults() {
    if (!resultsEl) return;

    if (!filteredPlots.length) {
      resultsEl.innerHTML = `<div class="zpe-empty">${loading ? '불러오는 중…' : '조건에 맞는 플롯이 없습니다.'}</div>`;
      return;
    }

    const terms = parseTerms(queryEl?.value || '');

    const shown = filteredPlots.slice(0, visibleLimit);
    resultsEl.innerHTML = shown.map(({ plot: p, matchFields }) => {
      const checked = selectedIds.has(p.id) ? 'checked' : '';
      const title = hasContent(p.name) ? p.name : '제목 없음';
      const type = p.originatedId == null ? '개인비캐' : '가둔 공캐';
      const chars = getCharacterNames(p) || '없음';
      const creator = getCreatorText(p) || '없음';
      const comment = compact(p.creatorComment || '', 100) || '없음';
      const badges = matchFields.map(k => `<span class="zpe-hit">${esc(FIELD_LABELS[k])}</span>`).join('');
      const vals = getFieldValues(p);


      return `
        <article class="zpe-card" data-id="${esc(p.id)}">
          <div class="zpe-card-top">
            <label class="zpe-check-wrap" title="삭제 대상 선택">
              <input class="zpe-select" type="checkbox" data-id="${esc(p.id)}" ${checked}>
              <span></span>
            </label>
            <div class="zpe-main">
              <div class="zpe-title-row">
                <strong class="${hasContent(p.name) ? '' : 'zpe-muted'}">${esc(title)}</strong>
                <span class="zpe-type ${p.originatedId == null ? 'personal' : 'locked'}">${type}</span>
              </div>
              <div class="zpe-meta">대화 ${Number(p.interactionCount || 0).toLocaleString()} · 캐릭터 ${esc(chars)}</div>
              <div class="zpe-meta">제작자 ${esc(creator)}</div>
              <div class="zpe-comment">코멘트 ${esc(comment)}</div>
              ${badges ? `<div class="zpe-hits"><span>일치</span>${badges}</div>` : ''}
            </div>
          </div>
          <div class="zpe-card-actions">
            <button class="zpe-expand" type="button">상세 펼치기</button>
            <button class="zpe-open" type="button" data-url="${esc(plotUrl(p))}">새 탭에서 열기</button>
          </div>
          <div class="zpe-details" hidden data-built="0"></div>
        </article>
      `;
    }).join('') + (visibleLimit < filteredPlots.length
      ? `<button id="zpe-more" class="zpe-more" type="button">더보기 (${Math.min(PAGE_SIZE, filteredPlots.length - visibleLimit)}개)</button>`
      : '');

    const moreBtn = resultsEl.querySelector('#zpe-more');
    if (moreBtn) moreBtn.addEventListener('click', () => {
      visibleLimit += PAGE_SIZE;
      renderResults();
    });

    resultsEl.querySelectorAll('.zpe-select').forEach(el => {
      el.addEventListener('change', () => {
        const id = el.dataset.id;
        if (el.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateCounts();
      });
    });

    resultsEl.querySelectorAll('.zpe-expand').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.zpe-card');
        const d = card.querySelector('.zpe-details');
        if (d.dataset.built !== '1') {
          const id = card.dataset.id;
          const row = filteredPlots.find(x => String(x.plot.id) === String(id));
          if (row) {
            const vals = getFieldValues(row.plot);
            const detailRows = row.matchFields
              .filter(k => ['shortDescription','longDescription','conversations','creatorComment'].includes(k))
              .map(k => {
                const snip = highlightSnippet(vals[k], terms);
                return snip ? `<div class="zpe-snippet"><b>${esc(FIELD_LABELS[k])}</b><div>${snip}</div></div>` : '';
              }).join('');
            d.innerHTML = detailRows || '<div class="zpe-muted">펼쳐 볼 긴 검색 일치 내용이 없습니다.</div>';
          }
          d.dataset.built = '1';
        }
        d.hidden = !d.hidden;
        btn.textContent = d.hidden ? '상세 펼치기' : '상세 접기';
      });
    });

    resultsEl.querySelectorAll('.zpe-open').forEach(btn => {
      btn.addEventListener('click', () => {
        W.open(btn.dataset.url, '_blank', 'noopener,noreferrer');
      });
    });
  }

  async function loadAllPlots() {
    if (loading || deleting) return;
    loading = true;
    selectedIds.clear();
    allPlots = [];
    filteredPlots = [];
    renderResults();
    updateCounts();
    setStatus('비공개 플롯을 불러오는 중…');
    refreshBtn.disabled = true;

    try {
      if (!auth) {
        setStatus('Zeta 인증정보를 아직 못 찾았습니다. Creator Center를 한 번 열거나 페이지를 새로고침한 뒤 다시 눌러주세요.', true);
        return;
      }

      let cursor = null;
      let page = 0;
      const seen = new Set();

      do {
        page++;
        let url = `${API}/v1/plots/creator?limit=200&isPrivate=true&orderBy.property=UPDATED_AT&orderBy.direction=DESC`;
        if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

        const data = await request('GET', url);
        const plots = Array.isArray(data?.plots) ? data.plots : [];

        for (const p of plots) {
          if (!p?.id || seen.has(p.id)) continue;
          seen.add(p.id);
          if (p.status !== 'DELETED' && p.status !== 'PRERELEASE' && p.isPrivate === true) allPlots.push(p);
        }

        cursor = data?.nextCursor || null;
        setStatus(`불러오는 중… ${allPlots.length}개`);
        if (page > 1000) throw new Error('페이지 수가 비정상적으로 많아 중단했습니다.');
      } while (cursor);

      rebuildSearchIndex();
      setStatus(`완료 · 비공개 플롯 ${allPlots.length}개`);
      recompute(true);
    } catch (e) {
      setStatus(`불러오기 실패: ${e.message || e}`, true);
    } finally {
      loading = false;
      refreshBtn.disabled = false;
      renderResults();
      updateCounts();
    }
  }

  function buildLockedExportPayload() {
    const plots = allPlots
      .filter(p => p && p.status !== 'DELETED' && p.status !== 'PRERELEASE' && p.isPrivate === true && p.originatedId != null)
      .map(p => ({
        lockedPlotId: String(p.id),
        originatedPlotId: String(p.originatedId),
        lockedProfileUrl: `${location.origin}/ko/plots/${encodeURIComponent(p.id)}/profile`,
        originalProfileUrl: `${location.origin}/ko/plots/${encodeURIComponent(p.originatedId)}/profile`,
        title: String(p.name || ''),
        creatorNickname: String(p?.creator?.nickname || ''),
        creatorUsername: String(p?.creator?.username || ''),
        characterNames: (Array.isArray(p?.characters) ? p.characters : [])
          .map(c => String(c?.name || '').trim())
          .filter(Boolean),
        createdAt: p.createdAt || null,
        updatedAt: p.updatedAt || p.modifiedAt || null
      }));

    return {
      schema: 'zeta-locked-public-plots',
      schemaVersion: 1,
      coreVersion: CORE_VERSION,
      exportedAt: new Date().toISOString(),
      zetaOrigin: location.origin,
      count: plots.length,
      plots
    };
  }

  function downloadJsonFile(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    try {
      a.click();
    } finally {
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function exportLockedPlots() {
    if (loading) {
      setStatus('비공개 플롯을 불러오는 중입니다. 완료 후 다시 눌러주세요.', true);
      return;
    }
    if (!allPlots.length) {
      setStatus('내보낼 데이터가 없습니다. 먼저 새로고침해 주세요.', true);
      return;
    }

    const payload = buildLockedExportPayload();
    if (!payload.plots.length) {
      setStatus('가둔 공캐가 없습니다.', true);
      return;
    }

    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').replace(/\.\d{3}Z$/, 'Z');
    const filename = `zeta_locked_public_plots_${stamp}.json`;
    downloadJsonFile(filename, payload);
    setStatus(`가둔 공캐 ${payload.count}개 JSON 저장 완료 · ${filename}`);
  }

  async function deleteSelected() {
    if (deleting || !selectedIds.size) return;

    const ids = [...selectedIds];
    const selectedRows = allPlots.filter(p => ids.includes(p.id));
    const personalN = selectedRows.filter(p => p.originatedId == null).length;
    const lockedN = selectedRows.filter(p => p.originatedId != null).length;

    const ok = W.confirm(
      `선택한 ${ids.length}개를 정말 삭제하시겠습니까?\n\n` +
      `개인비캐 ${personalN}개\n가둔 공캐 ${lockedN}개\n\n` +
      `확인 전에는 삭제되지 않습니다.`
    );
    if (!ok) return;

    deleting = true;
    refreshBtn.disabled = true;
    deleteBtn.disabled = true;

    let success = 0;
    let failed = 0;
    const failedIds = new Set();

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      setStatus(`삭제 중 ${i + 1}/${ids.length} · 성공 ${success} · 실패 ${failed}`);

      try {
        const res = await request('PATCH', `${API}/v1/plots/${encodeURIComponent(id)}/status`, { status: 'DELETE' });
        if (res?.status === 'DELETED' || res?.id === id) {
          success++;
          allPlots = allPlots.filter(p => p.id !== id);
          searchIndex.delete(id);
          selectedIds.delete(id);
        } else {
          failed++;
          failedIds.add(id);
        }
      } catch {
        failed++;
        failedIds.add(id);
      }

      await wait(450);
    }

    deleting = false;
    refreshBtn.disabled = false;
    recompute(false);
    setStatus(`삭제 완료 · 성공 ${success} · 실패 ${failed}`, failed > 0);

    if (failedIds.size) {
      for (const id of failedIds) {
        const card = resultsEl?.querySelector(`.zpe-card[data-id="${CSS.escape(id)}"]`);
        if (card) card.classList.add('zpe-failed');
      }
    }
  }

  function setStatus(text, danger = false) {
    if (!statusEl) return;
    statusEl.textContent = text;
    panel?.querySelector('#zpe-status-wrap')?.classList.toggle('danger', !!danger);
  }

  function applyStateToUI() {
    panel.querySelectorAll('[data-source]').forEach(b => b.classList.toggle('active', b.dataset.source === state.source));
    panel.querySelectorAll('[data-field]').forEach(c => c.checked = !!state.fields[c.dataset.field]);
    panel.querySelectorAll('[data-presence]').forEach(s => s.value = state.presence[s.dataset.presence] || 'ANY');

    panel.querySelector('#zpe-logic').value = state.logic;
    panel.querySelector('#zpe-match').value = state.matchMode;
    panel.querySelector('#zpe-interaction-mode').value = state.interactionMode;
    panel.querySelector('#zpe-min').value = state.interactionMin;
    panel.querySelector('#zpe-max').value = state.interactionMax;
    updateSortUI();

    updateFieldSummary();
  }

  function updateFieldSummary() {
    const names = Object.keys(state.fields).filter(k => state.fields[k]).map(k => FIELD_LABELS[k]);
    fieldSummaryEl.textContent = names.length === Object.keys(state.fields).length
      ? '검색 필드: 전체'
      : `검색 필드: ${names.length ? names.join(', ') : '선택 없음'}`;
  }

  function wireUI() {
    panel.querySelectorAll('[data-source]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.source = btn.dataset.source;
        saveState();
        applyStateToUI();
        recompute(true);
      });
    });

    panel.querySelector('#zpe-search-run').addEventListener('click', () => recompute(true));
    queryEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        recompute(true);
      }
    });

    panel.querySelector('#zpe-filter-toggle').addEventListener('click', () => {
      filterPanel.hidden = !filterPanel.hidden;
    });

    panel.querySelectorAll('[data-field]').forEach(c => {
      c.addEventListener('change', () => {
        state.fields[c.dataset.field] = c.checked;
        saveState();
        updateFieldSummary();
      });
    });

    panel.querySelectorAll('[data-presence]').forEach(s => {
      s.addEventListener('change', () => {
        state.presence[s.dataset.presence] = s.value;
        saveState();
      });
    });

    const bindings = [
      ['#zpe-logic', 'logic'],
      ['#zpe-match', 'matchMode'],
      ['#zpe-interaction-mode', 'interactionMode']
    ];

    for (const [sel, key] of bindings) {
      panel.querySelector(sel).addEventListener('change', e => {
        state[key] = e.target.value;
        saveState();
      });
    }

    const sortMenuBtn = panel.querySelector('#zpe-sort-menu-btn');
    const sortPopup = panel.querySelector('#zpe-sort-popup');
    const sortDirection = panel.querySelector('#zpe-sort-direction');

    sortMenuBtn.addEventListener('click', e => {
      e.stopPropagation();
      sortPopup.hidden = !sortPopup.hidden;
    });

    panel.querySelectorAll('[data-sort-key]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const { dir } = getSortParts();
        setSort(btn.dataset.sortKey, dir, true);
        sortPopup.hidden = true;
      });
    });

    sortDirection.addEventListener('click', () => {
      const { key, dir } = getSortParts();
      setSort(key, dir === 'DESC' ? 'ASC' : 'DESC', true);
    });

    document.addEventListener('click', e => {
      if (!sortPopup.hidden && !e.target.closest('.zpe-sort-menu-wrap')) {
        sortPopup.hidden = true;
      }
    });

    panel.querySelector('#zpe-min').addEventListener('input', debounce(e => {
      state.interactionMin = e.target.value;
      saveState();
    }, 180));

    panel.querySelector('#zpe-max').addEventListener('input', debounce(e => {
      state.interactionMax = e.target.value;
      saveState();
    }, 180));

    panel.querySelector('#zpe-apply-filter').addEventListener('click', () => {
      recompute(true);
      filterPanel.hidden = true;
    });

    panel.querySelector('#zpe-select-all').addEventListener('click', () => {
      filteredPlots.forEach(x => selectedIds.add(x.plot.id));
      resultsEl.querySelectorAll('.zpe-select').forEach(el => el.checked = true);
      updateCounts();
    });

    panel.querySelector('#zpe-clear-all').addEventListener('click', () => {
      selectedIds.clear();
      resultsEl.querySelectorAll('.zpe-select').forEach(el => el.checked = false);
      updateCounts();
    });

    panel.querySelector('#zpe-export-locked').addEventListener('click', exportLockedPlots);
    refreshBtn.addEventListener('click', loadAllPlots);
    deleteBtn.addEventListener('click', deleteSelected);

    panel.querySelector('#zpe-minimize').addEventListener('click', () => {
      saveGeometry();
      showFloatingLauncher();
    });

    panel.querySelector('#zpe-normalize').addEventListener('click', () => {
      restoreDefaultGeometry();
    });

    panel.querySelector('#zpe-exit').addEventListener('click', () => {
      if (window.confirm('비캐 검색·정리기를 종료하시겠습니까?')) {
        closedByUser = true;
        document.getElementById('zpe-floating-launcher')?.remove();
        panel?.remove();
        panel = null;
      }
    });
  }

  function debounce(fn, ms) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function enableMove(header) {
    let active = false, sx = 0, sy = 0, sl = 0, st = 0;

    const down = e => {
      if (e.target.closest('button,input,select,label')) return;
      const p = e.touches?.[0] || e;
      const r = panel.getBoundingClientRect();
      active = true;
      sx = p.clientX; sy = p.clientY; sl = r.left; st = r.top;
      panel.style.left = `${r.left}px`;
      panel.style.top = `${r.top}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      e.preventDefault();
    };

    const move = e => {
      if (!active) return;
      const p = e.touches?.[0] || e;
      const r = panel.getBoundingClientRect();
      const left = Math.min(Math.max(0, sl + p.clientX - sx), Math.max(0, innerWidth - r.width));
      const top = Math.min(Math.max(0, st + p.clientY - sy), Math.max(0, innerHeight - 48));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      e.preventDefault();
    };

    const up = () => {
      if (!active) return;
      active = false;
      saveGeometry();
    };

    header.addEventListener('touchstart', down, { passive: false });
    header.addEventListener('touchmove', move, { passive: false });
    header.addEventListener('touchend', up);
    header.addEventListener('mousedown', down);
    W.addEventListener('mousemove', move);
    W.addEventListener('mouseup', up);
  }

  function enableResize(handle) {
    let active = false, sx = 0, sy = 0, sw = 0, sh = 0;

    const down = e => {
      const p = e.touches?.[0] || e;
      const r = panel.getBoundingClientRect();
      active = true;
      sx = p.clientX; sy = p.clientY; sw = r.width; sh = r.height;
      e.preventDefault();
      e.stopPropagation();
    };

    const move = e => {
      if (!active) return;
      const p = e.touches?.[0] || e;
      const minW = Math.min(300, innerWidth - 12);
      const maxW = Math.max(minW, innerWidth - 8);
      const minH = 330;
      const maxH = Math.max(minH, innerHeight - 8);
      const w = Math.min(Math.max(minW, sw + p.clientX - sx), maxW);
      const h = Math.min(Math.max(minH, sh + p.clientY - sy), maxH);
      panel.style.width = `${w}px`;
      panel.style.height = `${h}px`;
      e.preventDefault();
    };

    const up = () => {
      if (!active) return;
      active = false;
      saveGeometry();
    };

    handle.addEventListener('touchstart', down, { passive: false });
    handle.addEventListener('touchmove', move, { passive: false });
    handle.addEventListener('touchend', up);
    handle.addEventListener('mousedown', down);
    W.addEventListener('mousemove', move);
    W.addEventListener('mouseup', up);
  }

  function saveGeometry() {
    try {
      const r = panel.getBoundingClientRect();
      const prev = JSON.parse(localStorage.getItem(POS_KEY) || 'null') || {};
      localStorage.setItem(POS_KEY, JSON.stringify({
        left: r.left,
        top: r.top,
        width: r.width,
        height: panel.classList.contains('zpe-minimized') ? (prev.height || 650) : r.height
      }));
    } catch {}
  }

  function restoreGeometry() {
    try {
      const g = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (!g) return;
      if (g.width) panel.style.width = `${Math.min(g.width, innerWidth - 8)}px`;
      if (g.height) panel.style.height = `${Math.min(g.height, innerHeight - 8)}px`;
      if (Number.isFinite(g.left) && Number.isFinite(g.top)) {
        panel.style.left = `${Math.max(0, Math.min(g.left, innerWidth - 60))}px`;
        panel.style.top = `${Math.max(0, Math.min(g.top, innerHeight - 48))}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      }
    } catch {}
  }


  function showFloatingLauncher() {
    let fab = document.getElementById('zpe-floating-launcher');
    if (!fab) {
      fab = document.createElement('button');
      fab.id = 'zpe-floating-launcher';
      fab.type = 'button';
      fab.textContent = '💌';
      fab.setAttribute('aria-label', '비캐 검색·정리기 열기');
      document.body.appendChild(fab);

      let dragging = false, moved = false, sx = 0, sy = 0, sl = 0, st = 0;
      fab.addEventListener('pointerdown', e => {
        dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
        const r = fab.getBoundingClientRect(); sl = r.left; st = r.top;
        try { fab.setPointerCapture(e.pointerId); } catch {}
      });
      fab.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
        if (!moved) return;
        const left = Math.max(6, Math.min(innerWidth - fab.offsetWidth - 6, sl + dx));
        const top = Math.max(6, Math.min(innerHeight - fab.offsetHeight - 6, st + dy));
        fab.style.left = left + 'px'; fab.style.top = top + 'px';
        fab.style.right = 'auto'; fab.style.bottom = 'auto';
      });
      fab.addEventListener('pointerup', e => {
        dragging = false;
        try { fab.releasePointerCapture(e.pointerId); } catch {}
        if (moved) {
          const r = fab.getBoundingClientRect();
          localStorage.setItem('zpe_fab_pos_v13', JSON.stringify({left:r.left, top:r.top}));
        }
      });
      fab.addEventListener('click', () => {
        if (moved) { moved = false; return; }
        fab.remove();
        if (panel && panel.isConnected) {
          panel.style.display = '';
          content.hidden = false;
          panel.classList.remove('zpe-minimized');
        } else {
          closedByUser = false;
          createUI();
        }
      });

      try {
        const pos = JSON.parse(localStorage.getItem('zpe_fab_pos_v13') || 'null');
        if (pos) {
          fab.style.left = Math.max(6, Math.min(innerWidth - 58, pos.left)) + 'px';
          fab.style.top = Math.max(6, Math.min(innerHeight - 58, pos.top)) + 'px';
          fab.style.right = 'auto'; fab.style.bottom = 'auto';
        }
      } catch {}
    }
    if (panel) panel.style.display = 'none';
  }

  function restoreDefaultGeometry() {
    if (!panel) return;
    panel.classList.remove('zpe-minimized');
    content.hidden = false;
    const w = Math.min(430, Math.max(320, innerWidth - 24));
    const h = Math.min(700, Math.max(500, innerHeight - 32));
    panel.style.width = w + 'px';
    panel.style.height = h + 'px';
    panel.style.left = Math.max(12, innerWidth - w - 16) + 'px';
    panel.style.top = Math.max(12, (innerHeight - h) / 2) + 'px';
    saveGeometry();
  }

  function createUI() {
    if (closedByUser) return;
    if (!document.body || document.getElementById(UI_ID)) return;

    const style = document.createElement('style');
    style.textContent = `
      #${UI_ID}, #${UI_ID} * { box-sizing:border-box; }
      #${UI_ID} {
        position:fixed; right:10px; bottom:14px; z-index:2147483647;
        width:min(390px, calc(100vw - 20px)); height:min(650px, calc(100vh - 28px));
        min-width:min(300px, calc(100vw - 12px)); min-height:330px;
        background:#fffdfd; color:#292527; border:1px solid #eee5e7;
        border-radius:18px; box-shadow:0 12px 38px rgba(65,45,52,.18);
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR",sans-serif;
        overflow:hidden; font-size:12px; scrollbar-color:#a9d7f5 #ffffff;
      }
      #${UI_ID} button, #${UI_ID} input, #${UI_ID} select { font:inherit; }
      #${UI_ID} button { cursor:pointer; }
      .zpe-header {
        height:46px; padding:7px 8px 7px 12px; display:flex; align-items:center;
        justify-content:space-between; gap:8px; background:#bfe3f8;
        border-bottom:0; user-select:none; touch-action:none; cursor:move;
      }
      .zpe-header-title { min-width:0; }
      .zpe-header strong { font-size:14px; font-weight:900; color:#263744; }
      .zpe-window-actions { display:flex; align-items:center; gap:5px; flex:0 0 auto; }
      .zpe-window-btn {
        box-sizing:border-box; width:31px; height:31px; min-width:31px; min-height:31px;
        padding:0; margin:0; border:0; background:#f5b5ca; color:#553844;
        border-radius:5px; font-size:18px; line-height:31px; font-weight:800;
        display:flex; align-items:center; justify-content:center; text-align:center;
        font-family:Arial,sans-serif;
      }
      .zpe-window-btn:active { background:#ee9fbb; }
      .zpe-window-close { border:0; }
      .zpe-soft-btn, .zpe-action {
        border:1px solid #eadfe1; background:#fff; color:#3a3235; border-radius:9px;
        padding:7px 9px; font-weight:700;
      }
      .zpe-content { height:calc(100% - 46px); display:flex; flex-direction:column; min-height:0; overflow:hidden; }
      .zpe-top { padding:10px; border-bottom:1px solid #f0eaeb; flex:0 0 auto; }
      .zpe-counts { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
      .zpe-count {
        appearance:none; -webkit-appearance:none; width:100%; min-width:0;
        border:1px solid #e6ebe5; background:#fff; color:#2f3531; border-radius:11px; padding:8px 5px;
        text-align:center; line-height:1.25; font:inherit; cursor:pointer; box-shadow:none;
      }
      .zpe-count b { display:block; font-size:16px; margin-top:2px; }
      .zpe-count.active { background:#e8f3e6; border-color:#94be98; color:#3f6248; }
      .zpe-count:active { background:#d2e8cf; }
      .zpe-search-row { display:flex; gap:6px; margin-top:8px; align-items:stretch; }
      .zpe-search-buttons { display:flex; flex-direction:column; gap:5px; }
      .zpe-search-btn { border:0; background:#bfe3f8; color:#314b5c; border-radius:9px; padding:7px 11px; font-weight:900; }
      .zpe-apply-filter { width:100%; margin-top:10px; border:0; background:#fff09a; color:#5f5525; border-radius:9px; padding:8px; font-weight:900; }
      .zpe-more { width:100%; border:1px solid #eadfe2; background:#fff; color:#62575b; border-radius:10px; padding:9px; font-weight:800; margin:3px 0 10px; }
      #zpe-query {
        flex:1; min-width:0; border:1px solid #e7dfe1; background:#fff; color:#282326;
        border-radius:10px; padding:9px 10px; outline:none;
      }
      #zpe-query:focus { border-color:#efc8d1; box-shadow:0 0 0 2px #fff1f4; }
      .zpe-summary { margin-top:6px; font-size:10px; color:#766b6f; line-height:1.4; }
      .zpe-filter {
        margin-top:8px; padding:10px; background:#fff7b8; border:0;
        border-radius:12px; max-height:270px; overflow-y:auto; overflow-x:hidden;
        scrollbar-width:thin; scrollbar-color:#a9d7f5 #ffffff;
      }
      .zpe-filter::-webkit-scrollbar { width:10px; height:0; }
      .zpe-filter::-webkit-scrollbar-track { background:#ffffff; border-radius:10px; }
      .zpe-filter::-webkit-scrollbar-thumb { background:#a9d7f5; border:2px solid #ffffff; border-radius:10px; }
      .zpe-section-title { font-weight:800; margin:3px 0 6px; }
      .zpe-check-grid {
        display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 12px;
        width:100%; min-width:0;
      }
      .zpe-check-grid label {
        display:flex; gap:8px; align-items:center; min-width:0; width:100%;
        white-space:normal; word-break:keep-all; overflow-wrap:break-word; line-height:1.35;
      }
      .zpe-check-grid input[type="checkbox"] {
        appearance:none; -webkit-appearance:none; flex:0 0 18px; width:18px; height:18px;
        margin:0; border:1.5px solid #cfc7ca; border-radius:5px; background:#fff; position:relative;
      }
      .zpe-check-grid input[type="checkbox"]:checked {
        background:#f5b5ca; border-color:#ef9fba;
      }
      .zpe-check-grid input[type="checkbox"]:checked::after {
        content:""; position:absolute; left:5px; top:1px; width:5px; height:10px;
        border-right:2px solid #6a3945; border-bottom:2px solid #6a3945; transform:rotate(45deg);
      }
      .zpe-filter-row { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin-top:8px; min-width:0; }
      .zpe-filter select, .zpe-filter input {
        width:100%; max-width:100%; min-width:0; border:1px solid #eadfcd; border-radius:8px; background:#fff; padding:7px;
      }
      .zpe-range { display:flex; gap:5px; align-items:center; min-width:0; }
      .zpe-range input { min-width:0; flex:1 1 0; }
      .zpe-toolbar {
        display:flex; align-items:center; gap:5px; padding:7px 10px; border-bottom:1px solid #f0eaeb;
        background:#fff; flex:0 0 auto; flex-wrap:wrap; overflow:hidden;
      }
      .zpe-toolbar .zpe-stats { margin-right:auto; font-weight:700; }
      .zpe-toolbar button { padding:6px 8px; }
      .zpe-status {
        padding:5px 10px; color:#6e6367; background:#fff; border-bottom:1px solid #f3edef;
        font-size:10px; flex:0 0 auto;
      }
      .zpe-status.danger { color:#b8444c; background:#fff4f4; }
      .zpe-results {
        flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden; padding:8px 9px 46px; background:#ffffff;
        scrollbar-width:thin; scrollbar-color:#a9d7f5 #ffffff;
      }
      .zpe-results::-webkit-scrollbar { width:10px; height:0; }
      .zpe-results::-webkit-scrollbar-track { background:#ffffff; border-radius:10px; }
      .zpe-results::-webkit-scrollbar-thumb { background:#a9d7f5; border:2px solid #ffffff; border-radius:10px; }
      .zpe-card {
        background:#fff; border:1px solid #ece5e7; border-radius:13px; padding:9px;
        margin-bottom:7px; box-shadow:0 2px 8px rgba(62,44,51,.04);
      }
      .zpe-card.zpe-failed { border-color:#e7a1a6; background:#fff8f8; }
      .zpe-card-top { display:flex; gap:8px; align-items:flex-start; }
      .zpe-check-wrap { flex:0 0 auto; padding-top:2px; }
      .zpe-check-wrap input { width:19px; height:19px; accent-color:#e8a3b5; }
      .zpe-main { flex:1; min-width:0; }
      .zpe-title-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
      .zpe-title-row strong { font-size:13px; overflow-wrap:anywhere; }
      .zpe-type { border-radius:999px; padding:2px 6px; font-size:9px; font-weight:800; }
      .zpe-type.personal { background:#fff0f3; color:#965565; }
      .zpe-type.locked { background:#fff6d9; color:#7d6825; }
      .zpe-meta, .zpe-comment { color:#6d6467; margin-top:4px; line-height:1.35; overflow-wrap:anywhere; }
      .zpe-comment { color:#51484b; }
      .zpe-hits { display:flex; flex-wrap:wrap; align-items:center; gap:4px; margin-top:6px; font-size:9px; color:#7a6f72; }
      .zpe-hit { background:#fff2f5; border:1px solid #f3d9df; border-radius:999px; padding:2px 5px; color:#8c5965; }
      .zpe-card-actions { display:flex; justify-content:flex-end; gap:5px; margin-top:7px; }
      .zpe-card-actions button {
        border:1px solid #e9e0e2; background:#fff; border-radius:8px; padding:6px 8px; font-weight:700;
      }
      .zpe-open { background:#fff9e8 !important; border-color:#f0dfae !important; }
      .zpe-details { border-top:1px dashed #eadfe2; margin-top:8px; padding-top:7px; }
      .zpe-snippet { margin-bottom:7px; line-height:1.45; color:#50474a; overflow-wrap:anywhere; }
      .zpe-snippet b { display:block; margin-bottom:2px; font-size:10px; color:#75686c; }
      .zpe-snippet mark { background:#fff0a9; color:inherit; padding:0 1px; border-radius:2px; }
      .zpe-muted { color:#9b9194 !important; font-style:italic; }
      .zpe-empty { padding:30px 10px; text-align:center; color:#8c8185; }
      .zpe-delete {
        position:absolute; left:10px; right:44px; bottom:8px; z-index:4;
        border:1px solid #efcbd2; background:#fff1f4; color:#9c4c5d; border-radius:10px;
        padding:8px 10px; font-weight:900; box-shadow:0 3px 12px rgba(82,49,60,.08);
      }
      .zpe-delete:disabled { opacity:.45; cursor:default; }
      .zpe-resize {
        position:absolute; right:0; bottom:0; width:38px; height:38px; z-index:8;
        cursor:nwse-resize; touch-action:none;
      }
      .zpe-resize::after {
        content:""; position:absolute; right:7px; bottom:7px; width:20px; height:20px;
        border-right:3px solid #d9b6be; border-bottom:3px solid #d9b6be; border-radius:0 0 5px 0;
      }

      .zpe-soft-btn { border:0 !important; background:#bfe3f8 !important; color:#314b5c !important; }
      .zpe-badge, .zpe-chip { border:0 !important; background:#f8c8d7 !important; color:#68414e !important; }
      .zpe-card { border-color:#e7e7e7 !important; background:#fff !important; box-shadow:none !important; }
      .zpe-card:hover { border-color:#dedede !important; }

      #zpe-search-run { background:#bfe3f8 !important; color:#314b5c !important; border:0 !important; }
      #zpe-filter-toggle { background:#fff09a !important; color:#5f5525 !important; border:0 !important; }
      #zpe-apply-filter { background:#f5b5ca !important; color:#553844 !important; border:0 !important; }
      #zpe-select-all { background:#bfe3f8 !important; color:#314b5c !important; border:0 !important; }
      #zpe-clear-selection { background:#f5b5ca !important; color:#553844 !important; border:0 !important; }
      #zpe-refresh { background:#fff09a !important; color:#5f5525 !important; border:0 !important; }
      .zpe-type-btn.active, .zpe-segment button.active {
        background:#f5b5ca !important; color:#553844 !important; border-color:transparent !important;
      }
      .zpe-open { background:#fff09a !important; color:#554d28 !important; border:0 !important; }

      #zpe-floating-launcher {
        position:fixed; right:18px; bottom:22px; width:52px; height:52px; z-index:2147483001;
        border:2px solid #8fc9ee; border-radius:12px; background:#fff;
        box-shadow:3px 4px 0 rgba(247,184,205,.48); font-size:25px; line-height:1;
        display:flex; align-items:center; justify-content:center; padding:0;
        touch-action:none; user-select:none; cursor:grab;
      }
      #zpe-floating-launcher:active { background:#fffbe5; cursor:grabbing; }


      /* v1.5 white-first palette */
      #${UI_ID} {
        background:#ffffff !important;
        border:1px solid #e7e9ec !important;
        box-shadow:0 5px 18px rgba(38,50,56,.10) !important;
      }
      #${UI_ID} .zpe-header {
        background:#ffffff !important;
        border-bottom:1px solid #eceef0 !important;
      }
      #${UI_ID} .zpe-header strong { color:#30363c !important; }

      #${UI_ID} .zpe-window-actions {
        gap:0 !important;
        border:1px solid #e7e9ec;
        border-radius:6px;
        overflow:hidden;
        background:#fff;
      }
      #${UI_ID} .zpe-window-btn {
        position:relative;
        width:34px !important; height:30px !important;
        min-width:34px !important; min-height:30px !important;
        padding:0 !important; margin:0 !important;
        border:0 !important; border-radius:0 !important;
        border-left:1px solid #eceef0 !important;
        background:#ffffff !important;
        display:flex !important; align-items:center !important; justify-content:center !important;
        line-height:1 !important;
      }
      #${UI_ID} .zpe-window-btn:first-child { border-left:0 !important; }
      #${UI_ID} .zpe-window-btn:active { background:#f4fbff !important; }
      #${UI_ID} .zpe-window-close:active { background:#fff0f5 !important; }

      #${UI_ID} .zpe-ico {
        display:block; position:relative; width:12px; height:12px;
        box-sizing:border-box; color:#525a61;
      }
      #${UI_ID} .zpe-ico-min::before {
        content:""; position:absolute; left:1px; right:1px; top:6px;
        height:1.5px; border-radius:2px; background:currentColor;
      }
      #${UI_ID} .zpe-ico-box {
        width:10px; height:10px; border:1.5px solid currentColor; border-radius:1px;
      }
      #${UI_ID} .zpe-ico-x::before,
      #${UI_ID} .zpe-ico-x::after {
        content:""; position:absolute; left:5.25px; top:0.5px;
        width:1.5px; height:11px; border-radius:2px; background:currentColor;
        transform-origin:center;
      }
      #${UI_ID} .zpe-ico-x::before { transform:rotate(45deg); }
      #${UI_ID} .zpe-ico-x::after { transform:rotate(-45deg); }
      #${UI_ID} .zpe-window-close .zpe-ico { color:#ff8fb5; }

      /* Keep almost everything white; use neutral borders for structure. */
      #${UI_ID} .zpe-card,
      #${UI_ID} .zpe-filter-panel,
      #${UI_ID} .zpe-section,
      #${UI_ID} input,
      #${UI_ID} select,
      #${UI_ID} textarea {
        background:#ffffff !important;
        border-color:#e7e9ec !important;
        box-shadow:none !important;
      }

      /* Sora blue: primary action / active navigation */
      #${UI_ID} #zpe-search-run,
      #${UI_ID} .zpe-soft-btn {
        background:#dff3ff !important;
        color:#365766 !important;
        border:0 !important;
      }

      /* Lemon: secondary filter emphasis */
      #${UI_ID} #zpe-filter-toggle,
      #${UI_ID} #zpe-refresh,
      #${UI_ID} .zpe-open {
        background:#fff7c7 !important;
        color:#5f592e !important;
        border:0 !important;
      }

      /* Clear baby pink: selection/destructive accents only */
      #${UI_ID} #zpe-apply-filter,
      #${UI_ID} #zpe-clear-selection,
      #${UI_ID} .zpe-type-btn.active,
      #${UI_ID} .zpe-segment button.active {
        background:#ffd7e6 !important;
        color:#704557 !important;
        border:0 !important;
      }
      #${UI_ID} .zpe-badge,
      #${UI_ID} .zpe-chip {
        background:#fff !important;
        color:#596168 !important;
        border:1px solid #eceef0 !important;
      }

      #zpe-floating-launcher {
        background:#fff !important;
        border:1px solid #dfe7ec !important;
        box-shadow:0 4px 14px rgba(38,50,56,.12) !important;
      }


      /* ===== v1.6 calm green / white line-first redesign =====
         Palette:
         subtle: #E8F3E6 -> #CDE6C6 -> #94BE98
         accent: #D2E8CF -> #94BE98 -> #5F8F6A
      */
      #${UI_ID} {
        --zpe-bg:#ffffff;
        --zpe-line:#e6ebe5;
        --zpe-line-green:#cfe0cd;
        --zpe-green-0:#f7fbf6;
        --zpe-green-1:#e8f3e6;
        --zpe-green-2:#d2e8cf;
        --zpe-green-3:#cde6c6;
        --zpe-green-4:#94be98;
        --zpe-green-5:#5f8f6a;
        --zpe-text:#2f3531;
        --zpe-muted:#737c75;
        --zpe-danger:#ff7f9f;
        background:var(--zpe-bg) !important;
        color:var(--zpe-text) !important;
        border:1px solid var(--zpe-line) !important;
        box-shadow:0 6px 18px rgba(55,72,58,.09) !important;
      }

      #${UI_ID} .zpe-header {
        background:#fff !important;
        border-bottom:1px solid var(--zpe-line-green) !important;
      }
      #${UI_ID} .zpe-header strong {
        color:#334538 !important;
      }

      /* Window controls: unified white buttons, green line set */
      #${UI_ID} .zpe-window-actions {
        background:#fff !important;
        border:1px solid var(--zpe-line-green) !important;
        border-radius:7px !important;
        overflow:hidden !important;
        gap:0 !important;
      }
      #${UI_ID} .zpe-window-btn {
        background:#fff !important;
        border:0 !important;
        border-left:1px solid var(--zpe-line-green) !important;
        border-radius:0 !important;
      }
      #${UI_ID} .zpe-window-btn:first-child {
        border-left:0 !important;
      }
      #${UI_ID} .zpe-window-btn:active {
        background:var(--zpe-green-1) !important;
      }
      #${UI_ID} .zpe-ico { color:#58705e !important; }
      #${UI_ID} .zpe-window-close .zpe-ico { color:#e86f8e !important; }
      #${UI_ID} .zpe-window-close:active {
        background:#fff3f6 !important;
      }

      /* Main white surfaces */
      #${UI_ID} .zpe-content,
      #${UI_ID} .zpe-results,
      #${UI_ID} .zpe-card,
      #${UI_ID} .zpe-filter,
      #${UI_ID} .zpe-filter-panel,
      #${UI_ID} .zpe-section,
      #${UI_ID} .zpe-toolbar {
        background:#fff !important;
      }

      /* Cards and blocks: lines first */
      #${UI_ID} .zpe-card {
        border:1px solid var(--zpe-line) !important;
        box-shadow:none !important;
      }
      #${UI_ID} .zpe-card:hover {
        border-color:var(--zpe-line-green) !important;
      }

      #${UI_ID} .zpe-filter {
        background:#fff !important;
        border:1px solid var(--zpe-line-green) !important;
      }

      #${UI_ID} textarea,
      #${UI_ID} input[type="text"],
      #${UI_ID} input[type="number"],
      #${UI_ID} select {
        background:#fff !important;
        color:var(--zpe-text) !important;
        border:1px solid var(--zpe-line) !important;
        box-shadow:none !important;
      }
      #${UI_ID} textarea:focus,
      #${UI_ID} input:focus,
      #${UI_ID} select:focus {
        outline:none !important;
        border-color:var(--zpe-green-4) !important;
        box-shadow:0 0 0 2px rgba(148,190,152,.12) !important;
      }

      /* Ordinary buttons: white + green outline */
      #${UI_ID} button {
        box-shadow:none !important;
      }
      #${UI_ID} .zpe-soft-btn,
      #${UI_ID} #zpe-select-all,
      #${UI_ID} #zpe-clear-selection,
      #${UI_ID} #zpe-refresh,
      #${UI_ID} .zpe-open,
      #${UI_ID} .zpe-more {
        background:#fff !important;
        color:#4d6552 !important;
        border:1px solid var(--zpe-line-green) !important;
      }
      #${UI_ID} .zpe-soft-btn:active,
      #${UI_ID} #zpe-select-all:active,
      #${UI_ID} #zpe-clear-selection:active,
      #${UI_ID} #zpe-refresh:active,
      #${UI_ID} .zpe-open:active,
      #${UI_ID} .zpe-more:active {
        background:var(--zpe-green-1) !important;
      }

      /* Only key actions get a very light fill */
      #${UI_ID} #zpe-search-run {
        background:var(--zpe-green-1) !important;
        color:#3f6248 !important;
        border:1px solid var(--zpe-green-3) !important;
      }
      #${UI_ID} #zpe-filter-toggle {
        background:#fff !important;
        color:#4d6552 !important;
        border:1px solid var(--zpe-line-green) !important;
      }
      #${UI_ID} #zpe-apply-filter {
        background:var(--zpe-green-2) !important;
        color:#3f6248 !important;
        border:1px solid var(--zpe-green-3) !important;
      }

      /* Segments / tabs: outline until active */
      #${UI_ID} .zpe-type-btn,
      #${UI_ID} .zpe-segment button {
        background:#fff !important;
        color:#58645a !important;
        border:1px solid var(--zpe-line) !important;
      }
      #${UI_ID} .zpe-type-btn.active,
      #${UI_ID} .zpe-segment button.active {
        background:var(--zpe-green-1) !important;
        color:#3f6248 !important;
        border-color:var(--zpe-green-3) !important;
      }

      /* Badges/chips stay mostly white */
      #${UI_ID} .zpe-badge,
      #${UI_ID} .zpe-chip {
        background:#fff !important;
        color:#5f6b61 !important;
        border:1px solid var(--zpe-line-green) !important;
      }

      /* Checkboxes: soft sage */
      #${UI_ID} input[type="checkbox"] {
        background:#fff !important;
        border-color:#c9d5c8 !important;
      }
      #${UI_ID} input[type="checkbox"]:checked {
        background:var(--zpe-green-4) !important;
        border-color:var(--zpe-green-4) !important;
      }
      #${UI_ID} input[type="checkbox"]:checked::after {
        border-color:#fff !important;
      }

      /* Selection / destructive: pink only where meaningful */
      #${UI_ID} .zpe-delete,
      #${UI_ID} #zpe-delete,
      #${UI_ID} #zpe-delete-selected,
      #${UI_ID} .zpe-danger {
        background:#fff !important;
        color:var(--zpe-danger) !important;
        border:1px solid #ffc8d6 !important;
      }
      #${UI_ID} .zpe-delete:active,
      #${UI_ID} #zpe-delete:active,
      #${UI_ID} #zpe-delete-selected:active,
      #${UI_ID} .zpe-danger:active {
        background:#fff5f7 !important;
      }

      /* Scrollbars: bright, subtle green */
      #${UI_ID},
      #${UI_ID} .zpe-results,
      #${UI_ID} .zpe-filter {
        scrollbar-color:#cde6c6 #ffffff !important;
      }
      #${UI_ID} .zpe-results::-webkit-scrollbar-track,
      #${UI_ID} .zpe-filter::-webkit-scrollbar-track {
        background:#fff !important;
      }
      #${UI_ID} .zpe-results::-webkit-scrollbar-thumb,
      #${UI_ID} .zpe-filter::-webkit-scrollbar-thumb {
        background:#cde6c6 !important;
        border:2px solid #fff !important;
      }

      /* Floating launcher */
      #zpe-floating-launcher {
        background:#fff !important;
        border:1px solid #cde6c6 !important;
        box-shadow:0 4px 14px rgba(55,72,58,.10) !important;
      }
      #zpe-floating-launcher:active {
        background:#e8f3e6 !important;
      }

      /* Muted text */
      #${UI_ID} .zpe-muted,
      #${UI_ID} small {
        color:var(--zpe-muted) !important;
      }


      /* v1.8 sort controls + compact search */
      #${UI_ID} #zpe-query {
        min-height:46px !important;
        height:46px !important;
        max-height:64px !important;
        resize:vertical !important;
        padding:10px 11px !important;
        line-height:1.35 !important;
      }
      #${UI_ID} .zpe-search-buttons {
        min-height:46px !important;
      }
      #${UI_ID} .zpe-search-buttons button {
        min-height:0 !important;
        flex:1 1 0 !important;
        padding:5px 10px !important;
      }
      #${UI_ID} .zpe-filter-row-single {
        grid-template-columns:minmax(0,1fr) !important;
      }

      #${UI_ID} .zpe-status {
        min-height:44px !important;
        padding:6px 10px !important;
        display:flex !important;
        align-items:center !important;
        justify-content:space-between !important;
        gap:8px !important;
        overflow:visible !important;
        position:relative !important;
      }
      #${UI_ID} #zpe-status {
        flex:1 1 auto;
        min-width:0;
        color:#6e776f;
        line-height:1.3;
      }
      #${UI_ID} .zpe-status.danger #zpe-status {
        color:#b8444c !important;
      }

      #${UI_ID} .zpe-sort-control {
        flex:0 0 auto;
        display:flex;
        align-items:stretch;
        height:30px;
        border:1px solid var(--zpe-line-green);
        border-radius:8px;
        background:#fff;
      }
      #${UI_ID} .zpe-sort-menu-wrap {
        position:relative;
        display:flex;
      }
      #${UI_ID} .zpe-sort-menu-btn,
      #${UI_ID} .zpe-sort-direction {
        appearance:none;
        -webkit-appearance:none;
        border:0 !important;
        background:#fff !important;
        color:#496052 !important;
        margin:0 !important;
        padding:0 8px !important;
        min-height:28px !important;
        height:28px !important;
        font:inherit;
        font-weight:750;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:5px;
      }
      #${UI_ID} .zpe-sort-menu-btn {
        border-radius:7px 0 0 7px !important;
        white-space:nowrap;
      }
      #${UI_ID} .zpe-sort-direction {
        width:32px !important;
        min-width:32px !important;
        border-left:1px solid var(--zpe-line-green) !important;
        border-radius:0 7px 7px 0 !important;
        font-size:18px !important;
        line-height:1 !important;
        padding:0 !important;
      }
      #${UI_ID} .zpe-sort-menu-btn:active,
      #${UI_ID} .zpe-sort-direction:active {
        background:var(--zpe-green-1) !important;
      }
      #${UI_ID} .zpe-sort-lines {
        width:14px;
        height:12px;
        display:flex;
        flex-direction:column;
        justify-content:space-between;
      }
      #${UI_ID} .zpe-sort-lines i {
        display:block;
        height:1.5px;
        border-radius:2px;
        background:#58705e;
      }
      #${UI_ID} .zpe-sort-lines i:nth-child(1){width:14px}
      #${UI_ID} .zpe-sort-lines i:nth-child(2){width:10px}
      #${UI_ID} .zpe-sort-lines i:nth-child(3){width:6px}

      #${UI_ID} .zpe-sort-popup {
        position:absolute;
        right:0;
        top:34px;
        width:148px;
        padding:5px;
        background:#fff;
        border:1px solid var(--zpe-line-green);
        border-radius:10px;
        box-shadow:0 7px 20px rgba(55,72,58,.13);
        z-index:40;
      }
      #${UI_ID} .zpe-sort-popup[hidden] {
        display:none !important;
      }
      #${UI_ID} .zpe-sort-popup button {
        width:100%;
        min-height:34px;
        padding:7px 9px !important;
        border:0 !important;
        border-radius:7px !important;
        background:#fff !important;
        color:#38473c !important;
        display:flex;
        align-items:center;
        justify-content:space-between;
        text-align:left;
        font-weight:700;
      }
      #${UI_ID} .zpe-sort-popup button span {
        visibility:hidden;
        color:#5f8f6a;
        font-weight:900;
      }
      #${UI_ID} .zpe-sort-popup button.active {
        background:var(--zpe-green-1) !important;
        color:#3f6248 !important;
      }
      #${UI_ID} .zpe-sort-popup button.active span {
        visibility:visible;
      }

      @media (max-width:430px) {
        .zpe-check-grid { grid-template-columns:1fr; }
        .zpe-filter-row { grid-template-columns:1fr; }
      }
    `;
    document.documentElement.appendChild(style);

    panel = document.createElement('section');
    panel.id = UI_ID;
    panel.innerHTML = `
      <div class="zpe-header">
        <div class="zpe-header-title"><strong>비캐 검색·정리기</strong></div>
        <div class="zpe-window-actions">
          <button id="zpe-minimize" class="zpe-window-btn" type="button" aria-label="플로팅 버튼으로 최소화"><span class="zpe-ico zpe-ico-min"></span></button>
          <button id="zpe-normalize" class="zpe-window-btn" type="button" aria-label="기본 크기로 복원"><span class="zpe-ico zpe-ico-box"></span></button>
          <button id="zpe-exit" class="zpe-window-btn zpe-window-close" type="button" aria-label="탐색기 종료"><span class="zpe-ico zpe-ico-x"></span></button>
        </div>
      </div>

      <div class="zpe-content">
        <div class="zpe-top">
          <div class="zpe-counts">
            <button type="button" class="zpe-count" data-source="ALL">전체 비캐<b id="zpe-count-all">0</b></button>
            <button type="button" class="zpe-count" data-source="PERSONAL">개인비캐<b id="zpe-count-personal">0</b></button>
            <button type="button" class="zpe-count" data-source="LOCKED">가둔 공캐<b id="zpe-count-locked">0</b></button>
          </div>

          <div class="zpe-search-row">
            <textarea id="zpe-query" rows="1" placeholder="검색어 입력 · 여러 개는 쉼표 또는 줄바꿈"></textarea>
            <div class="zpe-search-buttons">
              <button id="zpe-search-run" class="zpe-search-btn" type="button">검색</button>
              <button id="zpe-filter-toggle" class="zpe-soft-btn" type="button">필터</button>
            </div>
          </div>
          <div id="zpe-field-summary" class="zpe-summary"></div>

          <div id="zpe-filter-panel" class="zpe-filter" hidden>
            <div class="zpe-section-title">검색할 필드</div>
            <div class="zpe-check-grid">
              <label><input type="checkbox" data-field="title"> 제목</label>
              <label><input type="checkbox" data-field="shortDescription"> 소개글</label>
              <label><input type="checkbox" data-field="longDescription"> 플롯 상세</label>
              <label><input type="checkbox" data-field="characterName"> 캐릭터명</label>
              <label><input type="checkbox" data-field="creatorName"> 제작자명</label>
              <label><input type="checkbox" data-field="creatorComment"> 크리에이터 코멘트</label>
              <label><input type="checkbox" data-field="conversations"> 대화 예시</label>
            </div>

            <div class="zpe-filter-row">
              <label>검색어 관계
                <select id="zpe-logic">
                  <option value="AND">모두 포함 (AND)</option>
                  <option value="OR">하나라도 포함 (OR)</option>
                </select>
              </label>
              <label>일치 방식
                <select id="zpe-match">
                  <option value="CONTAINS">포함</option>
                  <option value="EXACT">정확히 일치</option>
                </select>
              </label>
            </div>

            <div class="zpe-filter-row zpe-filter-row-single">
              <label>대화량
                <select id="zpe-interaction-mode">
                  <option value="ALL">전체</option>
                  <option value="ZERO">0</option>
                  <option value="POSITIVE">1 이상</option>
                  <option value="RANGE">범위 지정</option>
                </select>
              </label>
            </div>

            <div class="zpe-range">
              <input id="zpe-min" type="number" min="0" inputmode="numeric" placeholder="최소 대화량">
              <span>~</span>
              <input id="zpe-max" type="number" min="0" inputmode="numeric" placeholder="최대 대화량">
            </div>

            <div class="zpe-section-title" style="margin-top:10px">필드 내용 여부</div>
            <div class="zpe-filter-row">
              <label>제목
                <select data-presence="title">
                  <option value="ANY">전체</option><option value="HAS">있음</option><option value="NONE">없음</option>
                </select>
              </label>
              <label>소개글
                <select data-presence="shortDescription">
                  <option value="ANY">전체</option><option value="HAS">있음</option><option value="NONE">없음</option>
                </select>
              </label>
              <label>코멘트
                <select data-presence="creatorComment">
                  <option value="ANY">전체</option><option value="HAS">있음</option><option value="NONE">없음</option>
                </select>
              </label>
              <label>대화 예시
                <select data-presence="conversations">
                  <option value="ANY">전체</option><option value="HAS">있음</option><option value="NONE">없음</option>
                </select>
              </label>
            </div>
            <button id="zpe-apply-filter" class="zpe-apply-filter" type="button">필터 적용</button>
          </div>
        </div>

        <div class="zpe-toolbar">
          <span class="zpe-stats">결과 <b id="zpe-count-result">0</b> · 선택 <b id="zpe-count-selected">0</b></span>
          <button id="zpe-select-all" class="zpe-soft-btn" type="button">결과 전체 선택</button>
          <button id="zpe-clear-all" class="zpe-soft-btn" type="button">선택 해제</button>
          <button id="zpe-export-locked" class="zpe-soft-btn" type="button">가둔 공캐 JSON</button>
          <button id="zpe-refresh" class="zpe-soft-btn" type="button">새로고침</button>
        </div>

        <div id="zpe-status-wrap" class="zpe-status">
          <span id="zpe-status">데이터를 불러올 준비 중…</span>
          <div class="zpe-sort-control">
            <div class="zpe-sort-menu-wrap">
              <button id="zpe-sort-menu-btn" class="zpe-sort-menu-btn" type="button" aria-label="정렬 기준 선택">
                <span class="zpe-sort-lines" aria-hidden="true"><i></i><i></i><i></i></span>
                <span id="zpe-sort-label">업데이트일</span>
              </button>
              <div id="zpe-sort-popup" class="zpe-sort-popup" hidden>
                <button type="button" data-sort-key="UPDATED">업데이트일 <span>✓</span></button>
                <button type="button" data-sort-key="CREATED">생성일 <span>✓</span></button>
                <button type="button" data-sort-key="INTERACTION">대화량 <span>✓</span></button>
                <button type="button" data-sort-key="NAME">이름 <span>✓</span></button>
              </div>
            </div>
            <button id="zpe-sort-direction" class="zpe-sort-direction" type="button" aria-label="내림차순, 누르면 오름차순">↓</button>
          </div>
        </div>
        <div id="zpe-results" class="zpe-results"></div>
        <button id="zpe-delete" class="zpe-delete" type="button" disabled>선택 삭제</button>
      </div>
      <div class="zpe-resize" title="크기 조절"></div>
    `;

    document.body.appendChild(panel);

    content = panel.querySelector('.zpe-content');
    resultsEl = panel.querySelector('#zpe-results');
    queryEl = panel.querySelector('#zpe-query');
    countAllEl = panel.querySelector('#zpe-count-all');
    countPersonalEl = panel.querySelector('#zpe-count-personal');
    countLockedEl = panel.querySelector('#zpe-count-locked');
    countResultEl = panel.querySelector('#zpe-count-result');
    countSelectedEl = panel.querySelector('#zpe-count-selected');
    deleteBtn = panel.querySelector('#zpe-delete');
    refreshBtn = panel.querySelector('#zpe-refresh');
    filterPanel = panel.querySelector('#zpe-filter-panel');
    fieldSummaryEl = panel.querySelector('#zpe-field-summary');
    resizeHandle = panel.querySelector('.zpe-resize');
    statusEl = panel.querySelector('#zpe-status');

    restoreGeometry();
    applyStateToUI();
    wireUI();
    enableMove(panel.querySelector('.zpe-header'));
    enableResize(resizeHandle);
    updateCounts();
    renderResults();

    // Bookmarklet starts after Zeta's initial requests, so wake one harmless
    // authenticated XHR automatically instead of asking the user to touch the page.
    setStatus('인증 확인 중…');
    setTimeout(wakeZetaAuth, 80);

    setTimeout(() => {
      if (auth) {
        if (!loading && allPlots.length === 0) loadAllPlots();
      } else {
        setStatus('자동 인증을 기다리는 중… 자동으로 시작되지 않으면 제타 화면을 한 번 이동해 주세요.');
      }
    }, 1800);
  }

  function boot() {
    if (document.body) createUI();
    else setTimeout(boot, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  const observer = new MutationObserver(() => {
    if (document.body && !document.getElementById(UI_ID)) createUI();
  });

  function observe() {
    if (!document.documentElement) return setTimeout(observe, 50);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  observe();
})();
