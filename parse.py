import re

def parse_view_file_output(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Split by lines
    lines = content.split('\n')
    
    parsed_lines = {}
    current_line_num = -1
    
    for line in lines:
        match = re.match(r'^(\d+):\s(.*)', line)
        if match:
            line_num = int(match.group(1))
            code = match.group(2)
            parsed_lines[line_num] = code
            current_line_num = line_num
        elif re.match(r'^(\d+):$', line.strip()):
            line_num = int(line.strip()[:-1])
            parsed_lines[line_num] = ""
            current_line_num = line_num
        elif current_line_num != -1 and not line.startswith('The above content') and not line.startswith('Created At:') and not line.startswith('Completed At:') and not line.startswith('File Path:') and not line.startswith('Total Lines:') and not line.startswith('Total Bytes:') and not line.startswith('Showing lines') and not line.startswith('The following code has been modified'):
            # This might be a continuation of a line if there was an actual newline?
            # Wait, view_file preserves newlines? Yes, but it prepends line numbers.
            # If it doesn't have a line number, it's either part of the file (multi-line without number? No, view_file puts number on EVERY line).
            # So if it doesn't have a line number, we just ignore it if it's an empty line between lines.
            pass

    max_line = max(parsed_lines.keys()) if parsed_lines else 0
    print(f"Extracted {len(parsed_lines)} lines. Max line: {max_line}")
    
    with open('parsed_TD.jsx', 'w', encoding='utf-8') as f:
        for i in range(1, max_line + 1):
            f.write(parsed_lines.get(i, "") + "\n")

parse_view_file_output(r'C:\Users\tmult\.gemini\antigravity\brain\f906e5d8-e622-4a0b-afb4-e152e2858ed4\scratch\assembled_TD.jsx')
