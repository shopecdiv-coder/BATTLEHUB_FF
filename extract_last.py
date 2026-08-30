import json, re

code_map = {}
with open(r'C:\Users\tmult\.gemini\antigravity\brain\f906e5d8-e622-4a0b-afb4-e152e2858ed4\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if 'file:///E:/BATTLEHUB%20%203.0/src/pages/TournamentDetail.jsx' in line and 'Showing lines' in line:
            data = json.loads(line)
            step = data.get('step_index')
            if step >= 9860:
                continue
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
                            # ALWAYS overwrite, so we get the LAST occurrence before step 9860
                            code_map[num] = m.group(2)

sorted_code = [code_map[k] for k in sorted(code_map.keys())]
with open('extracted_last_before_9860.jsx', 'w', encoding='utf-8') as out:
    out.write('\n'.join(sorted_code))
print(f'Max line: {max(code_map.keys())}')
print(f'Length of code_map: {len(code_map)}')
