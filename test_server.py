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

# Codex 모드
s = server.strict_schema(server.TASKS['reason']['schema'])
assert s['additionalProperties'] is False and s['properties']['content']['additionalProperties'] is False
assert 'additionalProperties' not in server.TASKS['reason']['schema']  # 원본은 그대로
for t in server.TASKS.values():  # OpenAI 구조화 출력은 모든 속성이 required여야 한다
    def check(n):
        if isinstance(n, dict):
            if n.get('type') == 'object':
                assert set(n['properties']) == set(n['required']), n['required']
            for v in n.values():
                check(v)
        elif isinstance(n, list):
            for v in n:
                check(v)
    check(t['schema'])
cmd = server.codex_cmd('s.json', 'o.json', ['a.jpg'])
assert cmd[0].endswith(('codex', 'codex.cmd', 'codex.exe')) and cmd[1] == 'exec' and 'read-only' in cmd and cmd[-3:] == ['-i', 'a.jpg', '-']
assert '--ignore-user-config' in cmd and cmd[cmd.index('shell_tool') - 1] == '--disable'  # 남이 쓴 댓글로 셸·MCP를 못 부르게
assert set(server.ENGINES) == {'claude', 'codex'}
print('ok codex')
