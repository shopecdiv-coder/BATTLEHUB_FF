const fs = require("fs");
const path = "src/components/profile/GroupSettingsDrawer.jsx";
let content = fs.readFileSync(path, "utf8");

const oldButton = `<Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => isEditing ? handleSaveSettings() : setIsEditing(true)}
                      className={isEditing ? "bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold px-4" : "bg-slate-800 text-gray-200 hover:text-white hover:bg-slate-700 font-bold px-4"}
                    >
                    {isEditing ? <><Save className="w-4 h-4 mr-1"/> Save</> : "Edit"}
                  </Button>`;

const newButtons = `<div className="flex items-center gap-2">
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
                  </div>`;

content = content.replace(oldButton, newButtons);

fs.writeFileSync(path, content, "utf8");
console.log("Patched successfully!");
