import React, { useState, useEffect } from "react";
import { AdminTask } from "@/entities/AdminTask";
import { TaskSubmission } from "@/entities/TaskSubmission";
import { User } from "@/entities/User";
import { uploadFileToAWS } from '@/utils/awsStorage';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Upload, Clock, CheckCircle, XCircle, Coins,
  FileText, ArrowLeft, Info, Sparkles, ChevronRight, Image as ImageIcon
} from "lucide-react";
import { format } from "date-fns";

export default function EarnDiamonds() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [diamondBalance, setDiamondBalance] = useState(0);
  const [activeTab, setActiveTab] = useState("tasks");
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      const [activeTasks, allSubmissions, diamonds] = await Promise.all([
        AdminTask.filter({ is_active: true }, "-created_date"),
        TaskSubmission.filter({ user_id: currentUser.id }, "-created_date"),
        base44.entities.Diamond.filter({ user_id: currentUser.id })
      ]);
      
      setTasks(activeTasks || []);
      setMySubmissions(allSubmissions || []);
      setDiamondBalance(diamonds[0]?.diamond_balance || 0);
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const file_url = await uploadFileToAWS(file);
      setSubmissionFile(file_url);
    } catch (error) {
      alert("Upload failed");
    }
    setUploading(false);
  };

  const submitTask = async (task) => {
    if (!submissionText && !submissionFile) {
      alert("Please provide submission");
      return;
    }
    
    setSubmitting(true);
    try {
      await TaskSubmission.create({
        task_id: task.id,
        task_title: task.task_title,
        user_id: user.id,
        user_ign: user.ign || user.full_name,
        submission_text: submissionText,
        submission_file_url: submissionFile,
        status: "Pending",
        diamond_reward: task.diamond_reward
      });

      await AdminTask.update(task.id, {
        total_submissions: (task.total_submissions || 0) + 1
      });

      alert("Task submitted! Admin will review within 24-48 hours.");
      setShowSubmitModal(null);
      setSubmissionText("");
      setSubmissionFile("");
      loadData();
    } catch (error) {
      alert("Failed to submit");
    }
    setSubmitting(false);
  };

  const hasSubmitted = (taskId) => {
    return mySubmissions.some(s => s.task_id === taskId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] pb-24 bg-slate-950 text-slate-100 overflow-y-auto custom-scrollbar">
      
      {/* Premium Header */}
      <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-2xl border-b border-white/[0.05]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 -ml-2">
            <Button
              onClick={() => window.history.back()}
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-[15px] font-bold text-white tracking-wide">Earn BH Coins</h1>
          </div>
          <Button 
            onClick={() => setShowInfoModal(true)}
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-slate-400 hover:text-white transition-colors"
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        
        {/* Industry-Standard Digital Asset Card */}
        <div className="relative rounded-3xl p-6 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Balance</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-white tracking-tight">{diamondBalance}</span>
                <span className="text-sm font-bold text-amber-400 mb-1.5">BH Coins</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner backdrop-blur-md">
              <Coins className="w-6 h-6 text-amber-400 drop-shadow-lg" />
            </div>
          </div>
        </div>

        {/* Integrated Pill Tabs */}
        <Tabs defaultValue="tasks" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-1 h-12 mb-5">
            <TabsTrigger value="tasks" className="flex-1 rounded-lg text-[13px] font-bold data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all h-full">
              Available ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 rounded-lg text-[13px] font-bold data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all h-full">
              History ({mySubmissions.length})
            </TabsTrigger>
          </TabsList>
          
          {/* Tasks Feed */}
          <TabsContent value="tasks" className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-300">No tasks right now</p>
                <p className="text-[12px] text-slate-500 mt-1">Check back later for new opportunities!</p>
              </div>
            ) : (
              tasks.map((task) => {
                const submitted = hasSubmitted(task.id);
                const submission = mySubmissions.find(s => s.task_id === task.id);
                
                return (
                  <div 
                    key={task.id} 
                    onClick={() => !submitted && setSelectedTask(task)}
                    className={`group relative bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 transition-all duration-300 ${!submitted ? 'cursor-pointer hover:border-white/10 hover:bg-white/[0.04]' : 'opacity-90'}`}
                  >
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-800 border border-white/5 relative">
                        {task.task_image_url ? (
                          <img src={task.task_image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-purple-500/10 text-purple-400">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                        {submitted && (
                          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center">
                            {submission.status === "Approved" ? <CheckCircle className="w-6 h-6 text-emerald-400 drop-shadow-md" /> :
                             submission.status === "Rejected" ? <XCircle className="w-6 h-6 text-rose-400 drop-shadow-md" /> :
                             <Clock className="w-6 h-6 text-amber-400 drop-shadow-md" />}
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-center">
                        <div className="flex justify-between items-start gap-3 mb-1">
                          <h3 className="text-[14px] font-bold text-slate-100 leading-tight truncate">{task.task_title}</h3>
                          {!submitted && (
                            <div className="shrink-0 flex items-center bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              <span className="text-[10px] font-black text-amber-400">+{task.diamond_reward}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[12px] text-slate-400 line-clamp-1 leading-relaxed pr-2">{task.task_description}</p>
                        
                        {/* Status / Hint */}
                        {submitted ? (
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              submission.status === "Approved" ? "text-emerald-400" :
                              submission.status === "Rejected" ? "text-rose-400" :
                              "text-amber-400"
                            }`}>
                              {submission.status}
                            </span>
                            {submission.admin_notes && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-[10px] text-slate-500 truncate">{submission.admin_notes}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Tap to view</span>
                            <ChevronRight className="w-3 h-3 text-purple-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* History Feed */}
          <TabsContent value="history" className="space-y-3">
            {mySubmissions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-300">No history yet</p>
                <p className="text-[12px] text-slate-500 mt-1">Complete a task to see it here.</p>
              </div>
            ) : (
              mySubmissions.map((sub) => (
                <div key={sub.id} className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-4 transition-colors">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border bg-slate-900 ${
                    sub.status === "Approved" ? "border-emerald-500/20 text-emerald-400" :
                    sub.status === "Rejected" ? "border-rose-500/20 text-rose-400" :
                    "border-amber-500/20 text-amber-400"
                  }`}>
                    {sub.status === "Approved" ? <CheckCircle className="w-5 h-5" /> :
                     sub.status === "Rejected" ? <XCircle className="w-5 h-5" /> :
                     <Clock className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-bold text-slate-200 truncate">{sub.task_title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">{format(new Date(sub.created_date), "MMM d, yyyy")}</p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-black text-amber-400">+{sub.diamond_reward}</p>
                    <p className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${
                      sub.status === "Approved" ? "text-emerald-400" :
                      sub.status === "Rejected" ? "text-rose-400" :
                      "text-amber-400"
                    }`}>{sub.status}</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Details Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent side="right" hideClose={true} className="bg-slate-900 border-white/10 p-0 sm:max-w-md w-full sm:w-[400px] flex flex-col h-full shadow-2xl z-[100]">
          {selectedTask && (
            <div className="flex flex-col h-full w-full">
              
              {/* Professional Sheet Header */}
              <div className="shrink-0 h-14 border-b border-white/5 flex items-center px-2 bg-slate-950/90 backdrop-blur-xl z-20">
                <Button 
                  onClick={() => setSelectedTask(null)}
                  variant="ghost" 
                  size="icon" 
                  className="w-10 h-10 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <span className="font-bold text-white text-[14px] ml-1 tracking-wide">Task Details</span>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                
                {selectedTask.task_image_url && (
                  <div className="w-full h-56 shrink-0 bg-slate-950 relative border-b border-white/5">
                    <img src={selectedTask.task_image_url} alt="Task" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                  </div>
                )}
                
                <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-4 mb-5">
                  <SheetTitle className="text-xl font-black text-white leading-tight">{selectedTask.task_title}</SheetTitle>
                  <div className="bg-amber-500/10 text-amber-400 shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-lg border border-amber-500/20 flex items-center shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                    +{selectedTask.diamond_reward} Coins
                  </div>
                </div>
                
                <div className="space-y-6 flex-1">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Details</p>
                    <p className="text-[14px] text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedTask.task_description}</p>
                  </div>
                  
                  <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Upload className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Requirement</p>
                      <p className="text-[13px] text-slate-200 font-medium">Upload a {selectedTask.submission_type}</p>
                    </div>
                  </div>
                </div>

                {/* Submit Button (End of Scrollable Content) */}
                <div className="mt-8 pb-12">
                  <Button 
                    onClick={() => {
                      setShowSubmitModal(selectedTask);
                      setSelectedTask(null);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-14 rounded-2xl text-[14px] transition-all shadow-[0_4px_20px_rgba(168,85,247,0.3)] active:scale-[0.98]"
                  >
                    Submit Proof
                  </Button>
                </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Submit Form Modal */}
      {showSubmitModal && (
        <Dialog open={true} onOpenChange={() => setShowSubmitModal(null)}>
          <DialogContent className="bg-slate-900 border-white/10 max-w-sm rounded-[24px] p-6 shadow-2xl">
            <DialogTitle className="text-base font-bold text-white leading-tight">Complete Task</DialogTitle>
            <p className="text-[12px] text-slate-400 -mt-2 leading-relaxed">Provide the required {showSubmitModal.submission_type.toLowerCase()} for verification.</p>
            
            <div className="space-y-5 mt-4">
              {showSubmitModal.submission_type === "Link" && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paste Link</Label>
                  <Input
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10 text-white rounded-xl h-12 text-[13px] focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                  />
                </div>
              )}

              {showSubmitModal.submission_type === "Text" && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Your Response</Label>
                  <Textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Type your response here..."
                    className="bg-white/5 border-white/10 text-white rounded-xl text-[13px] focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none p-3"
                    rows={4}
                  />
                </div>
              )}

              {(showSubmitModal.submission_type === "Image" || showSubmitModal.submission_type === "PDF") && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upload {showSubmitModal.submission_type}</Label>
                  {submissionFile ? (
                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span className="text-[13px] font-bold text-emerald-400">File uploaded</span>
                      </div>
                      <button onClick={() => setSubmissionFile("")} className="text-[11px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-wider">Remove</button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="border border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/[0.04] transition-colors bg-white/[0.01]">
                        {uploading ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent mx-auto"></div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                              <Upload className="w-5 h-5 text-slate-400" />
                            </div>
                            <p className="text-[12px] font-bold text-slate-300">Tap to upload file</p>
                            <p className="text-[10px] text-slate-500 mt-1">Supported: {showSubmitModal.submission_type === "Image" ? "JPG, PNG, WEBP" : "PDF files"}</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept={showSubmitModal.submission_type === "Image" ? "image/*" : ".pdf"}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              <Button
                onClick={() => submitTask(showSubmitModal)}
                disabled={submitting || (!submissionText && !submissionFile)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-12 rounded-xl text-[13px] transition-colors shadow-lg shadow-purple-500/20"
              >
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <Dialog open={true} onOpenChange={() => setShowInfoModal(false)}>
          <DialogContent className="bg-slate-900 border-white/10 max-w-sm rounded-[24px] p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white leading-tight">About BH Coins</DialogTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">How task rewards work</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-[12px] text-slate-300 leading-relaxed font-medium">Complete tasks to earn BH Coins. Each task has a fixed reward amount.</p>
              </div>
              <div className="flex gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-[12px] text-slate-300 leading-relaxed font-medium">Use BH Coins directly for tournament entry fees to participate.</p>
              </div>
              <div className="flex gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <p className="text-[12px] text-slate-300 leading-relaxed font-medium">Coins cannot be purchased with cash, withdrawn, or transferred.</p>
              </div>
            </div>
            
            <Button onClick={() => setShowInfoModal(false)} className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl h-11 text-[13px] font-bold mt-6 transition-colors">
              Got it
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}