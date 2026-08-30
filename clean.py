import re

def clean_file(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    clean_lines = []
    for line in lines:
        if re.match(r'^\d+:\s', line):
            clean_line = line.split(': ', 1)[1]
            clean_lines.append(clean_line)
        elif re.match(r'^\d+:$', line.strip()):
            clean_lines.append('\n')
            
    with open(output_path, 'w', encoding='utf-8') as f:
        f.writelines(clean_lines)

clean_file(r'C:\Users\tmult\.gemini\antigravity\brain\f906e5d8-e622-4a0b-afb4-e152e2858ed4\scratch\assembled_TD.jsx', 'reconstructed.jsx')
print('Done')
