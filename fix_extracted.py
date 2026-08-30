import re

with open('extracted_first.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix double spacing caused by \r
content = content.replace('\r\n', '\n').replace('\r', '\n')
content = re.sub(r'\n{3,}', '\n\n', content)

# Fix the missing chunk
# Search for tournament.status === "Live" and replace the block
pattern = r'(tournament\.status === "Live"[^\n]*\n)\s*\{/\*.*MODERN ESPORTS TABS BAR.*\*/\}'
replacement = r'''\1                    ? "bg-red-500/20 text-red-400 border-red-500/50" 
                    : tournament.status === "Registration Open" 
                    ? "bg-green-500/20 text-green-400 border-green-500/50" 
                    : "bg-gray-500/20 text-gray-400 border-gray-500/50"
                }`}>
                  {tournament.status === "Live" && <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                  {tournament.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MODERN ESPORTS TABS BAR */}'''

content = re.sub(pattern, replacement, content)

with open('extracted_fixed.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
