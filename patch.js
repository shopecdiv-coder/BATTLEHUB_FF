const fs = require("fs");
const path = "src/components/profile/UserGroupsPanel.jsx";
let content = fs.readFileSync(path, "utf8");

if (!content.includes("createPortal")) {
  content = content.replace(
    /import React, { useState, useEffect } from "react";/,
    `import React, { useState, useEffect } from "react";\nimport { createPortal } from "react-dom";\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";\nimport { Switch } from "@/components/ui/switch";`
  );
}

// 1. Portal the Group Chat view
content = content.replace(
  /return \(\s*<motion\.div[\s\S]*?className="fixed inset-0 z-\[300\] bg-slate-950 flex flex-col shadow-2xl"[\s\S]*?<\/motion\.div>\s*\);/,
  match => {
    return `return typeof document !== "undefined" ? createPortal(\n      ${match.replace(/return \(/, "(").replace(/;\s*$/, "")},\n      document.body\n    ) : null;`;
  }
);

// 2. Portal and Redesign the Create Group view
content = content.replace(
  /\{isCreating && \([\s\S]*?<\/motion\.div>\s*\)\}/,
  `{isCreating && typeof document !== "undefined" && createPortal(
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
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center bg-gray-900/50 overflow-hidden mb-4">
                  {newGroupDp ? <img src={newGroupDp} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-gray-500" />}
                </div>
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
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Group Tag (Optional)</label>
                    <Input 
                      value={newGroupTag} 
                      onChange={e => setNewGroupTag(e.target.value)} 
                      placeholder="e.g. SNIP" 
                      maxLength={4}
                      className="bg-[#0A0C10] border-gray-800 text-white uppercase focus-visible:ring-[#00FFFF]/50 h-12 rounded-xl placeholder:text-gray-600 font-mono"
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
                  
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avatar URL (Optional)</label>
                    <Input 
                      value={newGroupDp} 
                      onChange={e => setNewGroupDp(e.target.value)} 
                      placeholder="https://..." 
                      className="bg-[#0A0C10] border-gray-800 text-white focus-visible:ring-[#00FFFF]/50 h-12 rounded-xl placeholder:text-gray-600"
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

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Playstyle</label>
                      <Select value={newGroupPlaystyle} onValueChange={setNewGroupPlaystyle}>
                        <SelectTrigger className="bg-[#0A0C10] border-gray-800 h-12 rounded-xl text-white">
                          <SelectValue placeholder="Select playstyle" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111318] border-gray-800 text-white">
                          <SelectItem value="Casual">Casual / Fun</SelectItem>
                          <SelectItem value="Rank Push">Rank Push</SelectItem>
                          <SelectItem value="Competitive">Competitive</SelectItem>
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

            <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-[#0A0C10] flex justify-end gap-3 z-20">
              <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl font-semibold text-gray-400 hover:text-white hover:bg-slate-800 px-6 h-12">
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} className="rounded-xl bg-white text-black hover:bg-gray-200 font-bold px-8 h-12">
                Create Group
              </Button>
            </div>
          </motion.div>,
          document.body
        )}`
);

fs.writeFileSync(path, content, "utf8");
console.log("Patched successfully!");
