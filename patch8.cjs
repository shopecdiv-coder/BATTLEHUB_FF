const fs = require("fs");
const path = "src/components/profile/GroupSettingsDrawer.jsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  /\{\/\* Group Settings \(If Admin\) \*\/\}\s*<input/,
  \`{/* Group Settings (If Admin) */}
            {isAdmin && (
              <div className="space-y-4 bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#00FFFF] uppercase tracking-wider flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Group Settings
                  </h3>
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(group.name);
                          setEditDesc(group.description || "");
                          setEditEditInfo(group.settings_edit_info || "all");
                          setEditSendMessages(group.settings_send_messages || "all");
                          setEditApproveNew(group.settings_approve_new || false);
                        }}
                        className="text-gray-400 hover:text-white hover:bg-slate-800 font-bold px-4"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => isEditing ? handleSaveSettings() : setIsEditing(true)}
                        className={isEditing ? "bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold px-4" : "bg-slate-800 text-gray-200 hover:text-white hover:bg-slate-700 font-bold px-4"}
                      >
                      {isEditing ? <><Save className="w-4 h-4 mr-1"/> Save</> : "Edit"}
                    </Button>
                  </div>
                </div>
  
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Group Name</label>
                      <input\`
);

fs.writeFileSync(path, content, "utf8");
console.log("Patched successfully!");
