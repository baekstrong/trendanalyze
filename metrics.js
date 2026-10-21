// 뷰트랩식 지표 근사치. 서버 계산식은 비공개라 기준값은 실제 결과와 비교하며 조정한다.
// ponytail: 등급 기준은 눈대중 보정값, 뷰트랩과 같은 영상을 비교해 GRADES만 고치면 됨
const GRADES = {
  // 기여도: 영상 조회수 ÷ 채널 평균 조회수 (채널 안에서 얼마나 튀었나)
  contribution: [[10, 'Great'], [2, 'Good'], [0.5, 'Normal'], [0.2, 'Bad']],
  // 성과도: 영상 조회수 ÷ 구독자 수 (구독자 기반 노출 밖으로 얼마나 퍼졌나)
  performance: [[50, 'Great'], [1, 'Good'], [0.3, 'Normal'], [0.1, 'Bad']],
  // 채널 지표 (뷰트랩 채널 찾기 화면 40여 개와 대조해 맞춤)
  // 조회수대비 구독전환: 구독자 ÷ 누적 조회수
  subRate: [[0.02, 'Great'], [0.005, 'Good'], [0.001, 'Normal'], [0.0005, 'Bad']],
  // 일평균 구독전환: 구독자 ÷ 개설 후 일수
  dailySubs: [[300, 'Great'], [80, 'Good'], [40, 'Normal'], [10, 'Bad']],
  // 영상성과: 최근 영상 조회수 중앙값 ÷ 구독자
  videoPerf: [[1, 'Great'], [0.3, 'Good'], [0.1, 'Normal'], [0.03, 'Bad']],
};

function grade(kind, ratio) {
  if (!Number.isFinite(ratio)) return '-';
  for (const [min, label] of GRADES[kind]) if (ratio >= min) return label;
  return 'Worst';
}

// ISO 8601 길이(PT1H2M3S) → 초
function durationSec(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return 0;
  const [, d, h, mi, s] = m.map(Number);
  return (d || 0) * 86400 + (h || 0) * 3600 + (mi || 0) * 60 + (s || 0);
}

// YouTube API의 video + channel 응답 → 표 한 줄
function toRow(v, ch) {
  const views = +v.statistics.viewCount || 0;
  const subs = ch && !ch.statistics.hiddenSubscriberCount ? +ch.statistics.subscriberCount : NaN;
  const chVideos = ch ? +ch.statistics.videoCount : NaN;
  const chAvg = ch && chVideos ? +ch.statistics.viewCount / chVideos : NaN;
  const contributionRate = views / chAvg;
  const performanceRate = views / subs;
  return {
    id: v.id,
    title: v.snippet.title,
    thumb: v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.default?.url,
    channelId: v.snippet.channelId,
    channelTitle: v.snippet.channelTitle,
    tags: (v.snippet.tags || []).slice(0, 15),
    publishedAt: v.snippet.publishedAt,
    durationSec: durationSec(v.contentDetails.duration),
    caption: v.contentDetails.caption === 'true',
    views,
    likes: +v.statistics.likeCount || 0,
    comments: +v.statistics.commentCount || 0,
    subs,
    chVideos,
    contributionRate,
    performanceRate,
    contribution: grade('contribution', contributionRate),
    performance: grade('performance', performanceRate),
  };
}

function median(values) {
  const list = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!list.length) return NaN;
  const mid = list.length >> 1;
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

// 채널 최근 영상들 사이에서 이 영상 위치 (평생 평균보다 지금 채널 체급에 가깝다)
function compareToRecent(views, recentViews) {
  const list = recentViews.filter(Number.isFinite);
  if (!list.length) return null;
  const m = median(list);
  return { median: m, ratio: views / m, rank: list.filter((v) => v > views).length + 1, total: list.length };
}

// YouTube API의 channel 응답 (+ 최근 영상 조회수) → 채널 표 한 줄
function channelRow(ch, recentViews = [], now = Date.now()) {
  const s = ch.statistics;
  const subs = s.hiddenSubscriberCount ? NaN : +s.subscriberCount;
  const views = +s.viewCount || 0;
  const days = Math.max(1, (now - new Date(ch.snippet.publishedAt)) / 864e5);
  const recentMedian = median(recentViews);
  const subRate = views ? subs / views : NaN;
  const dailySubs = subs / days;
  const videoPerfRate = recentMedian / subs;
  return {
    id: ch.id,
    title: ch.snippet.title,
    handle: ch.snippet.customUrl || '',
    thumb: ch.snippet.thumbnails?.default?.url,
    publishedAt: ch.snippet.publishedAt,
    country: ch.snippet.country || '',
    uploads: ch.contentDetails?.relatedPlaylists?.uploads,
    subs,
    views,
    videoCount: +s.videoCount || 0,
    days: Math.floor(days),
    recentMedian,
    subRate,
    dailySubs,
    videoPerfRate,
    subRateGrade: grade('subRate', subRate),
    dailySubsGrade: grade('dailySubs', dailySubs),
    videoPerf: grade('videoPerf', videoPerfRate),
  };
}

if (typeof module !== 'undefined') module.exports = { grade, durationSec, toRow, compareToRecent, median, channelRow, GRADES };
