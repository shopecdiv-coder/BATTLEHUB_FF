import json, re

code_map = {}
with open(r'C:\Users\tmult\.gemini\antigravity\brain\f906e5d8-e622-4a0b-afb4-e152e2858ed4\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if 'file:///E:/BATTLEHUB%20%203.0/src/pages/TournamentDetail.jsx' in line and 'Showing lines' in line:
            data = json.loads(line)
            content = data.get('content', '')
            match = re.search(r'Showing lines (\d+) to (\d+)', content)
            if match:
                s_range = int(match.group(1))
                e_range = int(match.group(2))
                for l in content.split('\n'):
                    m = re.match(r'^(\d+):\s?(.*)$', l)
                    if m:
                        num = int(m.group(1))
                        if s_range <= num <= e_range:
                            if num not in code_map:
                                code_map[num] = m.group(2)

with open('debug_750.txt', 'w', encoding='utf-8') as f:
    for i in range(750, 790):
        f.write(f'{i}: {repr(code_map.get(i))}\n')
