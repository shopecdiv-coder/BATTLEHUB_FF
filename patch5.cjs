const fs = require("fs");
const path = "src/components/profile/UserGroupsPanel.jsx";
let content = fs.readFileSync(path, "utf8");

// We need to replace the isCreating modal structure
const regex = /\{isCreating && typeof document !== "undefined" && createPortal\([\s\S]*?document\.body\s*\)\}/;

const newUI = `{isCreating && typeof document !== "undefined" && createPortal(
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[230] bg-[#0A0C10] flex flex-col h-[100dvh] w-screen overflow-hidden"
          >
            {/* Header for Create Group - Fixed at top */}
            <div className="flex-none p-4 border-b border-gray-800 flex items-center gap-4 bg-[#0A0C10]">
              <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-white rounded-full bg-gray-900/50 hover:bg-gray-800 transition-colors">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </Button>
              <h2 className="text-lg font-bold text-white">Create New Group</h2>
            </div>
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 md:p-6 max-w-2xl mx-auto w-full">
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

                <div className="space-y-6 pb-6">
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
            </div>

            {/* Footer Action Bar - Fixed at bottom of modal */}
            <div className="flex-none p-4 border-t border-gray-800 bg-[#0A0C10] flex justify-end gap-3 pb-24 sm:pb-8">
              <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl font-semibold text-gray-400 hover:text-white hover:bg-slate-800 px-6 h-12">
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} className="rounded-xl bg-white text-black hover:bg-gray-200 font-bold px-8 h-12">
                Create Group
              </Button>
            </div>
          </motion.div>,
          document.body
        )}`;

content = content.replace(regex, newUI);

fs.writeFileSync(path, content, "utf8");
console.log("Patched successfully!");
