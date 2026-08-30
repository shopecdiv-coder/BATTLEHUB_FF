const fs = require("fs");
const path = "src/components/profile/UserGroupsPanel.jsx";
let content = fs.readFileSync(path, "utf8");

const regex = /<div className="space-y-4 bg-\[#111318\] p-5 rounded-2xl border border-gray-800\/50">\s*<h4 className="text-sm font-semibold text-white mb-2">Group Preferences<\/h4>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

content = content.replace(regex, "");

fs.writeFileSync(path, content, "utf8");
console.log("Patched successfully!");
