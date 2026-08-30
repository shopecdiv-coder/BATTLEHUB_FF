const fs = require("fs");
const path = "src/components/profile/UserGroupsPanel.jsx";
let content = fs.readFileSync(path, "utf8");

// Imports
if (!content.includes("UploadFile")) {
  content = content.replace(
    /import \{ Users, Plus, UserPlus, Hash, Settings, Search, Trash2, ArrowRight, Shield, Gamepad2, Lock, Globe, Tag, Image as ImageIcon, FileText \} from "lucide-react";/,
    `import { Users, Plus, UserPlus, Hash, Settings, Search, Trash2, ArrowRight, Shield, Gamepad2, Lock, Globe, Tag, Image as ImageIcon, FileText, Upload, Loader2 } from "lucide-react";\nimport { UploadFile } from "@/integrations/Core";`
  );
}

// States
content = content.replace(
  /const \[newGroupTag, setNewGroupTag\] = useState\(""\);\n/,
  ""
);
content = content.replace(
  /const \[newGroupPlaystyle, setNewGroupPlaystyle\] = useState\("Casual"\);\n/,
  ""
);
if (!content.includes("uploadingAvatar")) {
  content = content.replace(
    /const \[joinCode, setJoinCode\] = useState\(""\);/,
    `const [joinCode, setJoinCode] = useState("");\n  const [uploadingAvatar, setUploadingAvatar] = useState(false);`
  );
}

// Handle Upload function
if (!content.includes("handleFileUpload")) {
  content = content.replace(
    /const generateInviteCode = \(\) => \{/,
    `const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { file_url } = await UploadFile({ file });
      setNewGroupDp(file_url);
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };\n\n  const generateInviteCode = () => {`
  );
}

// handleCreateGroup params update
content = content.replace(
  /tag: newGroupTag\.trim\(\)\.toUpperCase\(\)\.substring\(0, 4\) \|\| "",/,
  ""
);
content = content.replace(
  /playstyle: newGroupPlaystyle,/,
  ""
);
content = content.replace(
  /setNewGroupTag\(""\);\n/,
  ""
);
content = content.replace(
  /setNewGroupPlaystyle\("Casual"\);\n/,
  ""
);

// UI Replace for isCreating block
const isCreatingRegex = /\{isCreating && typeof document !== "undefined" && createPortal\([\s\S]*?document\.body\s*\)\}/;

const newIsCreatingUI = `{isCreating && (
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[400] bg-[#0A0C10] flex flex-col overflow-y-auto"
          >
            {/* Header for Create Group */}
            <div className="sticky top-0 z-10 p-4 border-b border-gray-800 flex items-center gap-4 bg-[#0A0C10]/90 backdrop-blur-md">
              <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-white rounded-full bg-gray-900/50 hover:bg-gray-800 transition-colors">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </Button>
              <h2 className="text-lg font-bold text-white">Create New Group</h2>
            </div>
            
            <div className="p-4 md:p-6 max-w-2xl mx-auto w-full pb-32">
              <div className="flex flex-col items-center justify-center mb-8">
                <label className="relative group cursor-pointer mb-4">
                   <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center bg-gray-900/50 hover:bg-gray-800/50 transition-colors overflow-hidden relative">
                     {newGroupDp ? <img src={newGroupDp} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-gray-500" />}
                     {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                     )}
                   </div>
                   <div className="absolute -bottom-2 -right-2 bg-[#00FFFF] rounded-full p-2 text-black shadow-lg">
                     <Upload className="w-4 h-4" />
                   </div>
                   <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploadingAvatar} />
                </label>
                <h3 className="text-xl font-bold text-white">Group Details</h3>
                <p className="text-sm text-gray-500">Provide some basic info about your squad</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-4 bg-[#111318] p-5 rounded-2xl border border-gray-800/50">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Group Name</label>
                    <Input 
                      value={newGroupName} 
                      onChange={e => setNewGroupName(e.target.value)} 
                      placeholder="e.g. Pro Snipers Squad" 
                      className="bg-[#0A0C10] border-gray-800 text-white focus-visible:ring-[#00FFFF]/50 h-12 rounded-xl placeholder:text-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description (Optional)</label>
                    <textarea 
                      value={newGroupDesc}
                      onChange={e => setNewGroupDesc(e.target.value)}
                      placeholder="What is your group about?"
                      className="w-full bg-[#0A0C10] border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00FFFF]/50 h-24 resize-none placeholder:text-gray-600"
                    />
                  </div>
                </div>

                <div className="space-y-4 bg-[#111318] p-5 rounded-2xl border border-gray-800/50">
                  <h4 className="text-sm font-semibold text-white mb-2">Group Preferences</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Privacy</label>
                      <Select value={newGroupPrivacy} onValueChange={setNewGroupPrivacy}>
                        <SelectTrigger className="bg-[#0A0C10] border-gray-800 h-12 rounded-xl text-white">
                          <SelectValue placeholder="Select privacy" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111318] border-gray-800 text-white">
                          <SelectItem value="Public">?? Public</SelectItem>
                          <SelectItem value="Invite Only">?? Invite Only</SelectItem>
                          <SelectItem value="Private">?? Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 bg-[#111318] p-5 rounded-2xl border border-gray-800/50">
                  <h4 className="text-sm font-semibold text-white mb-2">Admin Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Edit Group Info</p>
                        <p className="text-xs text-gray-500">Who can change name and description</p>
                      </div>
                      <Select value={newGroupSettingsEditInfo} onValueChange={setNewGroupSettingsEditInfo}>
                        <SelectTrigger className="bg-[#0A0C10] border-gray-800 h-10 w-[140px] rounded-lg text-white">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111318] border-gray-800 text-white">
                          <SelectItem value="all">All Members</SelectItem>
                          <SelectItem value="admins">Admins Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Send Messages</p>
                        <p className="text-xs text-gray-500">Who can send messages</p>
                      </div>
                      <Select value={newGroupSettingsSendMessages} onValueChange={setNewGroupSettingsSendMessages}>
                        <SelectTrigger className="bg-[#0A0C10] border-gray-800 h-10 w-[140px] rounded-lg text-white">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111318] border-gray-800 text-white">
                          <SelectItem value="all">All Members</SelectItem>
                          <SelectItem value="admins">Admins Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Require Approval</p>
                        <p className="text-xs text-gray-500">New members must be approved</p>
                      </div>
                      <Switch checked={newGroupSettingsApproveNew} onCheckedChange={setNewGroupSettingsApproveNew} />
                    </div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" /> {errorMsg}
                  </div>
                )}
                
              </div>
            </div>

            <div className="fixed bottom-16 left-0 right-0 p-4 border-t border-gray-800 bg-[#0A0C10] flex justify-end gap-3 z-20 pb-8 sm:bottom-0 sm:pb-4">
              <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl font-semibold text-gray-400 hover:text-white hover:bg-slate-800 px-6 h-12">
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} className="rounded-xl bg-white text-black hover:bg-gray-200 font-bold px-8 h-12">
                Create Group
              </Button>
            </div>
          </motion.div>
        )}`;

content = content.replace(isCreatingRegex, newIsCreatingUI);

fs.writeFileSync(path, content, "utf8");
console.log("Patched successfully!");
