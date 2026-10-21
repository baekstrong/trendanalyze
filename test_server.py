# python3 test_server.py
import json

import server

assert server.allowed_origin('http://localhost:5178')
assert not server.allowed_origin('https://evil.example')
assert not server.allowed_origin(None)

assert server.safe_thumb_url('https://i.ytimg.com/vi/x/hqdefault.jpg')
assert not server.safe_thumb_url('http://i.ytimg.com/vi/x/hqdefault.jpg')
assert not server.safe_thumb_url('https://169.254.169.254/latest')
assert not server.safe_thumb_url('https://i.ytimg.com.evil.example/x.jpg')

blocks = server.build_content('audience', {'title': '어깨 운동', 'comments': ['50대인데 효과 봤어요']})
assert len(blocks) == 1 and '50대인데' in blocks[0]['text'] and '<data>' in blocks[0]['text']

try:
    server.build_content('thumbnail', {'thumbUrl': 'file:///etc/passwd'})
    raise AssertionError('막혀야 함')
except ValueError:
    pass

try:
    server.build_content('thumbnail', {})
    raise AssertionError('막혀야 함')
except ValueError:
    pass

try:
    server.build_content('patterns', {'thumbUrls': ['https://i.ytimg.com/a.jpg', 'https://evil.example/b.jpg']})
    raise AssertionError('하나라도 외부 주소면 막혀야 함')
except ValueError:
    pass

vtt = """WEBVTT
Kind: captions
Language: ko

00:00:00.120 --> 00:00:02.230 align:start position:0%

어깨<00:00:00.359><c> 아프신</c>

00:00:02.230 --> 00:00:02.240 align:start position:0%
어깨 아프신 분들
 
00:00:31.000 --> 00:00:33.000
이렇게 해보세요
"""
lines = server.parse_vtt(vtt)
assert lines == [(0, '어깨 아프신'), (2, '어깨 아프신 분들'), (31, '이렇게 해보세요')], lines
text = server.format_transcript(lines)
assert text.startswith('[0:00]') and '[0:31] 이렇게 해보세요' in text, text
assert server.transcript('bad id; rm -rf /') == ''
assert server.enrich('audience', {'videoId': 'x'}) == {'videoId': 'x'}

for t in server.TASKS.values():
    json.dumps(t['schema'])
print('ok')
