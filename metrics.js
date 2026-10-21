// 뷰트랩식 지표 근사치. 서버 계산식은 비공개라 기준값은 실제 결과와 비교하며 조정한다.
// ponytail: 등급 기준은 눈대중 보정값, 뷰트랩과 같은 영상을 비교해 GRADES만 고치면 됨
const GRADES = {
  // 기여도: 영상 조회수 ÷ 채널 평균 조회수 (채널 안에서 얼마나 튀었나)
  contribution: [[10, 'Great'], [2, 'Good'], [0.5, 'Normal'], [0.2, 'Bad']],
  // 성과도: 영상 조회수 ÷ 구독자 수 (구독자 기반 노출 밖으로 얼마나 퍼졌나)
  performance: [[50, 'Great'], [1, 'Good'], [0.3, 'Normal'], [0.1, 'Bad']],
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

if (typeof module !== 'undefined') module.exports = { grade, durationSec, toRow, GRADES };
