// node metrics.test.js
const assert = require('assert');
const { grade, durationSec, toRow, compareToRecent, median, channelRow } = require('./metrics.js');

assert.equal(durationSec('PT4M43S'), 283);
assert.equal(durationSec('PT1H2M'), 3720);
assert.equal(durationSec('P1DT1S'), 86401);
assert.equal(durationSec('P0D'), 0);

assert.equal(grade('performance', 26), 'Good'); // 뷰트랩: 723만회/27.6만구독 → Good
assert.equal(grade('performance', 0.75), 'Normal'); // 53만회/70.9만구독 → Normal
assert.equal(grade('performance', 0.05), 'Worst');
assert.equal(grade('contribution', NaN), '-');

const row = toRow(
  { id: 'x', snippet: { title: 't', thumbnails: {}, channelId: 'c', channelTitle: 'C', publishedAt: '2024-06-25T00:00:00Z' },
    contentDetails: { duration: 'PT30S', caption: 'false' }, statistics: { viewCount: '1000' } },
  { statistics: { subscriberCount: '500', videoCount: '10', viewCount: '2000', hiddenSubscriberCount: false } },
);
assert.equal(row.performanceRate, 2);
assert.equal(row.contributionRate, 5); // 1000 ÷ (2000/10)
assert.equal(row.contribution, 'Good');

const hidden = toRow(
  { id: 'y', snippet: { title: 't', thumbnails: {}, channelId: 'c' }, contentDetails: {}, statistics: { viewCount: '1' } },
  { statistics: { subscriberCount: '0', videoCount: '0', viewCount: '0', hiddenSubscriberCount: true } },
);
assert.equal(hidden.performance, '-');
assert.equal(hidden.contribution, '-');
const cmp = compareToRecent(500, [100, 300, 500, 900]);
assert.equal(cmp.median, 400);
assert.equal(cmp.rank, 2);
assert.equal(cmp.ratio, 1.25);
assert.equal(compareToRecent(1, []), null);
// 채널: 뷰트랩 채널 찾기 화면에서 본 값 (2026-10-21 기준)
const now = Date.parse('2026-10-21T00:00:00Z');
const ch = (subs, views, publishedAt, videoCount = 100) => ({ id: 'c', snippet: { title: 'C', publishedAt },
  statistics: { subscriberCount: String(subs), viewCount: String(views), videoCount: String(videoCount) } });
const yaji = channelRow(ch(22900, 4185000, '2023-08-19T00:00:00Z'), [], now);   // 뷰트랩: Good / Bad
assert.equal(yaji.subRateGrade, 'Good');
assert.equal(yaji.dailySubsGrade, 'Bad');
const ironbin = channelRow(ch(616000, 540000000, '2022-05-20T00:00:00Z'), [], now); // 뷰트랩: Normal / Great
assert.equal(ironbin.subRateGrade, 'Normal');
assert.equal(ironbin.dailySubsGrade, 'Great');
const jaecomics = channelRow(ch(1040, 2189000, '2020-07-27T00:00:00Z'), [], now); // 뷰트랩: Worst / Worst
assert.equal(jaecomics.subRateGrade, 'Worst');
assert.equal(jaecomics.dailySubsGrade, 'Worst');
assert.equal(yaji.videoPerf, '-');                                                  // 최근 영상 없으면 계산 안 함
assert.equal(channelRow(ch(1000, 0, '2020-01-01T00:00:00Z'), [500, 300, 100], now).videoPerf, 'Good');
assert.equal(channelRow(ch(1000, 0, '2020-01-01T00:00:00Z'), [], now).subRateGrade, '-');
assert.equal(median([3, 1, 2]), 2);
console.log('ok');
