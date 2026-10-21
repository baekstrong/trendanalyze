// node metrics.test.js
const assert = require('assert');
const { grade, durationSec, toRow } = require('./metrics.js');

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
console.log('ok');
