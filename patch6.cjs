const fs = require("fs");
const path = "src/components/profile/GroupSettingsDrawer.jsx";
let content = fs.readFileSync(path, "utf8");

// Add ArrowRight to imports
content = content.replace(
  /import \{ Shield, Users, LogOut, Settings, UserPlus, X, Save \} from "lucide-react";/,
  `import { Shield, Users, LogOut, Settings, UserPlus, X, Save, ArrowRight } from "lucide-react";`
);

// Update Header
content = content.replace(
  /<SheetHeader className="p-6 border-b border-slate-800 sticky top-0 bg-slate-950 z-10">\s*<SheetTitle className="text-white text-xl">Group Info<\/SheetTitle>\s*<\/SheetHeader>/,
  `<SheetHeader className="p-4 border-b border-slate-800 sticky top-0 bg-slate-950 z-10 flex flex-row items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white rounded-full bg-slate-900/50 hover:bg-slate-800 mt-2">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Button>
            <SheetTitle className="text-white text-xl flex-1 text-center pr-10">Group Info</SheetTitle>
          </SheetHeader>`
);

// Update Edit Button
content = content.replace(
  /<Button\s*size="sm"\s*variant=\{isEditing \? "default" : "outline"\}\s*onClick=\{\(\) => isEditing \? handleSaveSettings\(\) : setIsEditing\(true\)\}\s*className=\{isEditing \? "bg-\[#00FFFF\] text-black hover:bg-\[#00FFFF\]\/80" : "border-\[#00FFFF\] text-\[#00FFFF\] hover:bg-\[#00FFFF\]\/10"\}\s*>/,
  `<Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => isEditing ? handleSaveSettings() : setIsEditing(true)}
                    className={isEditing ? "bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold px-4" : "bg-slate-800 text-gray-200 hover:text-white hover:bg-slate-700 font-bold px-4"}
                  >`
);

fs.writeFileSync(path, content, "utf8");
console.log("Patched successfully!");
