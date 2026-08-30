import json
import re

def parse_transcript_code():
    code_map = {}
    with open(r'C:\Users\tmult\.gemini\antigravity\brain\f906e5d8-e622-4a0b-afb4-e152e2858ed4\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
        for line in f:
            if 'file:///E:/BATTLEHUB%20%203.0/src/pages/TournamentDetail.jsx' in line and 'Showing lines' in line:
                data = json.loads(line)
                
                # Check if this tool call was BEFORE the corruption!
                # We can just stop updating lines once we have seen them!
                # Or we can write out versions for each step!
                
                step_index = data.get('step_index', 0)
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
                                
    print(f"Properly parsed {len(code_map)} lines! Min: {min(code_map.keys()) if code_map else 0}, Max: {max(code_map.keys()) if code_map else 0}")
    
    if code_map:
        max_num = max(code_map.keys())
        missing = [i for i in range(1, max_num + 1) if i not in code_map]
        print(f"Missing lines count: {len(missing)}")
        
        sorted_code = [code_map[k] for k in sorted(code_map.keys())]
        with open('extracted_first.jsx', 'w', encoding='utf-8') as out:
            out.write('\n'.join(sorted_code))
        print("Saved accurate extracted_first.jsx!")

if __name__ == '__main__':
    parse_transcript_code()
