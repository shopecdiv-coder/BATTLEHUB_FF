const fs = require("fs");
const path = "src/components/profile/GroupSettingsDrawer.jsx";
let content = fs.readFileSync(path, "utf8");

// The bad part starts right after <AvatarFallback>...</AvatarFallback>\r\n            </Avatar>\r\n
// and ends right before <div className="flex justify-between items-center text-sm text-slate-200">\r\n                    <span>Edit Group Info</span>

const regex = /<AvatarFallback.*?<\/Avatar>[\s\S]*?(<div className="flex justify-between items-center text-sm text-slate-200">\s*<span>Edit Group Info<\/span>)/;

const fixedPart = `<AvatarFallback className="text-4xl font-bold bg-slate-900">{group.name.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
                <h2 className="text-2xl font-bold text-white">{group.name}</h2>
                <p className="text-slate-400">Group · {group.members.length} participants</p>
              </div>
              {group.description && <p className="text-sm text-slate-300 px-4">{group.description}</p>}
            </div>
  
          {/* Group Settings (If Admin) */}
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
                      <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-[#00FFFF]/50" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Description</label>
                      <textarea 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-[#00FFFF]/50" 
                        value={editDesc} 
                        onChange={e => setEditDesc(e.target.value)} 
                        rows={3}
                      />
                    </div>
                  $1`;

content = content.replace(regex, fixedPart);

fs.writeFileSync(path, content, "utf8");
console.log("Patched successfully!");
