const fs = require("fs");
const path = "src/components/profile/UserGroupsPanel.jsx";
let content = fs.readFileSync(path, "utf8");

// Change isCreating back to Portal but with z-[230]
content = content.replace(
  /\{isCreating && \(\s*<motion\.div\s*initial=\{\{ x: "100%" \}\}\s*animate=\{\{ x: 0 \}\}\s*exit=\{\{ x: "100%" \}\}\s*transition=\{\{ type: "spring", damping: 25, stiffness: 200 \}\}\s*className="fixed inset-0 z-\[400\] bg-\[#0A0C10\] flex flex-col overflow-y-auto"\s*>/,
  `{isCreating && typeof document !== "undefined" && createPortal(
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[230] bg-[#0A0C10] flex flex-col overflow-y-auto"
          >`
);

content = content.replace(
  /<\/motion\.div>\s*\)\}/,
  `</motion.div>,\n          document.body\n        )}`
);

fs.writeFileSync(path, content, "utf8");
console.log("Patched successfully!");
