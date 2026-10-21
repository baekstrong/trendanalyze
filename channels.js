// 채널 찾기 · 채널 분석 탭. index.html의 공용 함수($, yt, store, esc, fmt, render 등)를 그대로 쓴다.

let channels = [];                               // 채널 찾기 결과
let chSearches = store.get('chHistory', []);     // 채널 검색 내역
let analyses = store.get('analyses', []);        // 분석한 채널 (최근 영상 포함)
let currentChannel = null;                       // 채널 분석 탭에 띄운 채널

// localStorage 한도를 넘으면 오래된 것부터 버리고 저장
function saveCapped(key, list) {
  for (;;) {
    try { localStorage.setItem(key, JSON.stringify(list)); return; }
    catch { if (list.length <= 1) return; list.pop(); }
  }
}

const fmtKo = (n) => !Number.isFinite(n) ? '-' : n >= 1e8 ? (n / 1e8).toFixed(1) + '억' : n >= 1e4 ? (n / 1e4).toFixed(1) + '만' : n.toLocaleString();
const ymd = (iso) => (iso || '').slice(2, 10).replace(/-/g, '.');
const gradeCell = (g, title) => `<td class="${g}" title="${esc(title)}">${g}</td>`;

async function inBatches(list, size, fn) {
  for (let i = 0; i < list.length; i += size) await Promise.all(list.slice(i, i + size).map(fn));
}

// 업로드 재생목록에서 최근 영상 n개 → videos.list 결과
async function fetchUploads(uploads, n, part) {
  let ids = [], pageToken, units = 0;
  while (ids.length < n) {
    const r = await yt('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: 50, ...(pageToken && { pageToken }) });
    units++;
    ids.push(...r.items.map((it) => it.contentDetails.videoId));
    if (!(pageToken = r.nextPageToken)) break;
  }
  const items = [];
  for (const c of chunk(ids.slice(0, n), 50)) {
    items.push(...(await yt('videos', { part, id: c.join(',') })).items);
    units++;
  }
  return { items, units };
}

// ── 채널 찾기 ──────────────────────────────────────────
const chOpts = () => ({ chQ: $('chQ').value.trim(), chOrder: $('chOrder').value, chPages: $('chPages').value, chPerf: $('chPerf').checked });
const chKey = (o) => [o.chQ.toLowerCase(), o.chOrder, o.chPages, o.chPerf].join('|');

function renderChHistory() {
  $('chHist').innerHTML = `<option value="">검색 내역 (${chSearches.length})</option>` +
    chSearches.map((h, i) => `<option value="${i}">${esc(h.label)} · ${h.channels.length}개 · ${new Date(h.at).toLocaleDateString('ko-KR')}</option>`).join('');
}

function loadChSearch(h) {
  $('chQ').value = h.opts.chQ; $('chOrder').value = h.opts.chOrder; $('chPages').value = h.opts.chPages; $('chPerf').checked = h.opts.chPerf;
  channels = h.channels;
  sort = { k: null, dir: -1 };
  renderChannels();
  setStatus(`저장된 결과 ${channels.length}개 · ${new Date(h.at).toLocaleString('ko-KR')} 검색 · 0유닛`);
}

async function searchChannels(e, force = false) {
  e?.preventDefault();
  const o = chOpts();
  const saved = chSearches.find((h) => h.key === chKey(o));
  if (saved && !force) return loadChSearch(saved);
  if (!$('key').value.trim()) return setStatus('API 키를 먼저 넣어주세요');
  setStatus('채널 검색 중…');
  try {
    const base = { part: 'id', type: 'channel', maxResults: 50, q: o.chQ, order: o.chOrder, regionCode: 'KR', relevanceLanguage: 'ko' };
    let ids = [], pageToken, units = 0;
    for (let i = 0; i < +o.chPages; i++) {
      const r = await yt('search', pageToken ? { ...base, pageToken } : base);
      units += 100;
      ids.push(...r.items.map((it) => it.id.channelId));
      if (!(pageToken = r.nextPageToken)) break;
    }
    const list = [];
    for (const c of chunk([...new Set(ids)], 50)) {
      list.push(...(await yt('channels', { part: 'snippet,statistics,contentDetails', id: c.join(',') })).items);
      units++;
    }
    const recent = {};
    if (o.chPerf) {
      let done = 0;
      await inBatches(list, 5, async (ch) => {
        const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
        if (!uploads) return;
        try {
          const r = await fetchUploads(uploads, 20, 'statistics');
          recent[ch.id] = r.items.map((v) => +v.statistics.viewCount);
          units += r.units;
        } catch { /* 영상이 없는 채널 */ }
        setStatus(`영상성과 계산 중… ${++done}/${list.length}`);
      });
    }
    channels = list.map((ch) => channelRow(ch, recent[ch.id] || []));
    const label = [o.chQ, optLabel('chOrder'), optLabel('chPages')].join(' · ') + (o.chPerf ? '' : ' · 성과 제외');
    chSearches = [{ key: chKey(o), label, opts: o, at: Date.now(), channels }, ...chSearches.filter((h) => h.key !== chKey(o))].slice(0, 30);
    saveCapped('chHistory', chSearches);
    renderChHistory();
    sort = { k: null, dir: -1 };
    renderChannels();
    setStatus(`채널 ${channels.length}개 · 이번 검색 ${units}유닛 · 오늘 약 ${addQuota(units).toLocaleString()}/10,000`);
  } catch (err) {
    setStatus('오류: ' + err.message);
  }
}

function renderChannels() {
  let list = channels.filter((c) => !blocked.has(c.id));
  if (sort.k) list = [...list].sort((a, b) => {
    const x = a[sort.k], y = b[sort.k];
    const nx = Number.isFinite(x) || typeof x === 'string', ny = Number.isFinite(y) || typeof y === 'string';
    if (!nx || !ny) return nx ? -1 : ny ? 1 : 0;
    return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
  });
  const pctTitle = (x, unit) => (Number.isFinite(x) ? unit(x) : '');
  $('chRows').innerHTML = list.length ? list.map((c) => `
    <tr>
      <td><img class="profile" src="${esc(c.thumb || '')}" alt="" loading="lazy"></td>
      <td class="title"><a href="#" data-analyze="${esc(c.id)}"><b>${esc(c.title)}</b></a><div class="ch">${esc(c.handle)}${c.country ? ' · ' + esc(c.country) : ''}</div></td>
      <td>${esc(ymd(c.publishedAt))}</td>
      <td class="num">${fmt(c.subs)}</td>
      ${gradeCell(c.subRateGrade, pctTitle(c.subRate, (x) => (x * 100).toFixed(2) + '%'))}
      ${gradeCell(c.dailySubsGrade, pctTitle(c.dailySubs, (x) => `하루 ${Math.round(x).toLocaleString()}명`))}
      ${gradeCell(c.videoPerf, pctTitle(c.videoPerfRate, (x) => `최근 중앙값이 구독자의 ${x.toFixed(2)}배`))}
      <td class="num">${fmtKo(c.views)}</td>
      <td class="num">${fmt(c.videoCount)}</td>
      <td><button class="x" data-block="${esc(c.id)}" title="${esc(c.title)} 숨기기">✕</button></td>
    </tr>`).join('')
    : '<tr><td colspan="10" class="empty">채널 키워드를 검색해 보세요</td></tr>';
}

$('chForm').onsubmit = searchChannels;
$('chRefresh').onclick = () => $('chForm').reportValidity() && searchChannels(null, true);
$('chHist').onchange = () => chSearches[$('chHist').value] && loadChSearch(chSearches[$('chHist').value]);
$('chHistDel').onclick = () => {
  const i = $('chHist').value;
  if (i === '') return setStatus('삭제할 내역을 먼저 고르세요');
  chSearches.splice(+i, 1);
  store.set('chHistory', chSearches);
  renderChHistory();
};
$('chHead').onclick = (e) => {
  const k = e.target.closest('th')?.dataset.k;
  if (!k) return;
  sort = { k, dir: sort.k === k ? -sort.dir : -1 };
  renderChannels();
};
$('chRows').onclick = (e) => {
  const a = e.target.closest('[data-analyze]');
  if (a) { e.preventDefault(); setView('analysis'); return analyzeChannel(a.dataset.analyze); }
  const b = e.target.closest('[data-block]');
  if (b) { blocked.add(b.dataset.block); store.set('blockedChannels', [...blocked]); renderChannels(); }
};

// ── 채널 분석 ──────────────────────────────────────────
// 주소/@핸들/UC아이디/이름 → 채널 ID. 이름 검색만 100유닛이 든다
async function resolveChannelId(input) {
  const s = input.trim();
  const id = s.match(/(UC[\w-]{22})/)?.[1];
  if (id) return { id, units: 0 };
  const handle = s.match(/@([^/?#\s]+)/)?.[1];
  if (handle) {
    const r = await yt('channels', { part: 'id', forHandle: '@' + decodeURIComponent(handle) });
    if (!r.items?.length) throw new Error('그 핸들의 채널이 없어요');
    return { id: r.items[0].id, units: 1 };
  }
  const r = await yt('search', { part: 'id', type: 'channel', q: s, maxResults: 1, regionCode: 'KR' });
  if (!r.items?.length) throw new Error('채널을 찾지 못했어요');
  return { id: r.items[0].id.channelId, units: 100 };
}

async function analyzeChannel(input, force = false) {
  if (!input) return;
  const count = +$('anCount').value;
  const saved = analyses.find((a) => a.id === input && a.count === count);
  if (saved && !force) return showAnalysis(saved);
  if (!$('key').value.trim()) return setStatus('API 키를 먼저 넣어주세요');
  setStatus('채널 분석 중…');
  $('chSummary').innerHTML = '<p class="muted">채널 분석 중…</p>';
  try {
    let { id, units } = await resolveChannelId(input);
    const again = analyses.find((a) => a.id === id && a.count === count);
    if (again && !force) return showAnalysis(again);
    const ch = (await yt('channels', { part: 'snippet,statistics,contentDetails', id })).items?.[0];
    units++;
    if (!ch) throw new Error('채널을 찾지 못했어요');
    let videos = [];
    if (ch.contentDetails?.relatedPlaylists?.uploads) {
      const r = await fetchUploads(ch.contentDetails.relatedPlaylists.uploads, count, 'snippet,statistics,contentDetails');
      videos = r.items.map((v) => toRow(v, ch));
      units += r.units;
    }
    const a = { id, count, at: Date.now(), ch: channelRow(ch, videos.slice(0, 20).map((v) => v.views)), videos };
    analyses = [a, ...analyses.filter((x) => !(x.id === id && x.count === count))].slice(0, 20);
    saveCapped('analyses', analyses);
    showAnalysis(a);
    setStatus(`채널 분석 · 영상 ${videos.length}개 · ${units}유닛 · 오늘 약 ${addQuota(units).toLocaleString()}/10,000`);
  } catch (err) {
    $('chSummary').innerHTML = '';
    setStatus('오류: ' + err.message);
  }
}

function showAnalysis(a) {
  currentChannel = a.ch;
  chVideos = a.videos;
  const c = a.ch, v = a.videos;
  const avg = (k) => (v.length ? Math.round(v.reduce((s, x) => s + x[k], 0) / v.length) : NaN);
  const month = v.filter((x) => Date.now() - new Date(x.publishedAt) < 30 * 864e5).length;
  const g = (grade, sub) => `<span class="${grade}">${grade}</span>`;
  $('chSummary').innerHTML = `
    <div class="chhead">
      <img src="${esc(c.thumb || '')}" alt="">
      <div><h2 style="margin:0">${esc(c.title)}</h2>
        <div class="muted">${esc(c.handle)} · <a href="https://www.youtube.com/channel/${esc(c.id)}" target="_blank" rel="noopener">유튜브에서 보기</a>
          · ${new Date(a.at).toLocaleString('ko-KR')} 분석 · 최근 영상 ${v.length}개 기준</div></div>
    </div>
    <div class="grid">
      ${stat('구독자', fmtKo(c.subs))}
      ${stat('총 영상 수', fmt(c.videoCount) + '개', `최근 30일 업로드 ${month}개`)}
      ${stat('채널 개설', `${fmt(c.days)}일 경과`, new Date(c.publishedAt).toLocaleDateString('ko-KR'))}
      ${stat('누적 조회수', fmtKo(c.views))}
      ${stat('최근 평균 조회수', fmtKo(avg('views')), `중앙값 ${fmtKo(c.recentMedian)}`)}
      ${stat('최근 평균 좋아요', fmt(avg('likes')))}
      ${stat('조회수대비 구독전환', g(c.subRateGrade), Number.isFinite(c.subRate) ? (c.subRate * 100).toFixed(2) + '%' : '')}
      ${stat('일평균 구독전환', g(c.dailySubsGrade), Number.isFinite(c.dailySubs) ? `하루 ${Math.round(c.dailySubs).toLocaleString()}명` : '')}
      ${stat('영상성과', g(c.videoPerf), Number.isFinite(c.videoPerfRate) ? `최근 중앙값 ÷ 구독자 ${c.videoPerfRate.toFixed(2)}배` : '')}
    </div>`;
  renderAnList(a);
  sort = { k: null, dir: -1 };
  render();
}

function renderAnList(cur) {
  $('anList').innerHTML = `<option value="">분석한 채널 (${analyses.length})</option>` +
    analyses.map((a, i) => `<option value="${i}"${a === cur ? ' selected' : ''}>${esc(a.ch.title)} · ${a.videos.length}개 · ${new Date(a.at).toLocaleDateString('ko-KR')}</option>`).join('');
}

$('anForm').onsubmit = (e) => { e.preventDefault(); analyzeChannel($('anQ').value); };
$('anList').onchange = () => analyses[$('anList').value] && showAnalysis(analyses[$('anList').value]);
$('anRefresh').onclick = () => (currentChannel ? analyzeChannel(currentChannel.id, true) : setStatus('먼저 채널을 분석하세요'));
$('anDel').onclick = () => {
  const i = $('anList').value;
  if (i === '') return setStatus('삭제할 채널을 먼저 고르세요');
  analyses.splice(+i, 1);
  store.set('analyses', analyses);
  currentChannel = null; chVideos = []; $('chSummary').innerHTML = '';
  renderAnList(); render();
};

renderFolders();
renderChHistory();
renderAnList();
setView('video');
