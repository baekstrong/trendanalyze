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

for t in server.TASKS.values():
    json.dumps(t['schema'])
print('ok')
