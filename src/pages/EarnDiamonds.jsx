import React, { useState, useEffect } from "react";
import { AdminTask } from "@/entities/AdminTask";
import { TaskSubmission } from "@/entities/TaskSubmission";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Gem, Upload, Clock, CheckCircle, XCircle, Link as LinkIcon, 
  FileText, Image, AlertCircle, Trophy, Sparkles, ChevronDown, ChevronUp
} from "lucide-react";
import { format } from "date-fns";

export default function EarnDiamonds() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFile, setSubmissionFile] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [diamondBalance, setDiamondBalance] = useState(0);
  const [expandedTask, setExpandedTask] = useState(null);

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
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
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

      alert("✅ Task submitted! Admin will review within 24-48 hours.");
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

  const nextMilestone = Math.ceil((diamondBalance + 1) / 5) * 5;
  const progress = ((diamondBalance % 5) / 5) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto">
            <Gem className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Earn Diamonds
          </h1>
          <p className="text-gray-400 text-lg">Complete simple tasks, earn Diamonds, and use them for tournament entry</p>
        </div>

        {/* Diamond Info Card */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-2 border-purple-500/40">
          <CardContent className="p-6">
            <h3 className="font-bold text-white text-xl mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              What are Diamonds?
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2 text-gray-300">
                <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Diamonds are task-based reward coins</p>
                <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Earned only by completing admin tasks</p>
                <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Used for tournament registration</p>
                <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> 1 Diamond = 1 BH Coin (entry value)</p>
              </div>
              <div className="space-y-2 text-gray-300">
                <p className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /> Cannot be purchased with money</p>
                <p className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /> Cannot be withdrawn to bank</p>
                <p className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /> Cannot be transferred to others</p>
                <p className="flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" /> Only for tournament entries!</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance & Progress */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-purple-500/30">
            <CardContent className="p-6 text-center">
              <Gem className="w-12 h-12 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Your Diamond Balance</p>
              <p className="text-5xl font-black text-purple-400 my-2">{diamondBalance} 💎</p>
              <p className="text-sm text-gray-500">Entry Value: ≈ {diamondBalance} BH Coins</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">Progress to Next Milestone</p>
                <Badge className="bg-yellow-500/20 text-yellow-400">
                  {diamondBalance % 5}/5
                </Badge>
              </div>
              <Progress value={progress} className="h-3 mb-2" />
              <p className="text-xs text-gray-500 mb-4">
                Earn {5 - (diamondBalance % 5)} more to reach {nextMilestone} 💎
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                <p className="text-yellow-400 font-semibold text-center text-sm">
                  🎯 Keep earning to unlock more tournament entries!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Tasks */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" />
            Available Tasks
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {tasks.length === 0 ? (
              <Card className="bg-gray-900/50 border-gray-800 p-12 text-center col-span-full">
                <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No tasks available right now</p>
                <p className="text-xs text-gray-600 mt-1">Check back later for new tasks!</p>
              </Card>
            ) : (
              tasks.map((task) => {
                const submitted = hasSubmitted(task.id);
                const submission = mySubmissions.find(s => s.task_id === task.id);
                
                return (
                  <Card key={task.id} className="bg-gray-900/70 border-gray-700 hover:border-purple-500/50 transition-all">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-white flex-1">{task.task_title}</h3>
                        <Badge className="bg-purple-500/20 text-purple-400 text-base font-bold ml-2">
                          +{task.diamond_reward} 💎
                        </Badge>
                      </div>
                      
                      <Button
                        onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        variant="ghost"
                        className="w-full justify-between text-gray-400 hover:text-white mb-3 px-0"
                      >
                        <span className="text-sm">{expandedTask === task.id ? 'Hide Details' : 'View Full Details'}</span>
                        {expandedTask === task.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      
                      {expandedTask === task.id && (
                        <div className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
                          {task.task_image_url && (
                            <img src={task.task_image_url} className="w-full h-40 object-cover rounded" />
                          )}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Full Description:</p>
                            <p className="text-gray-300 text-sm whitespace-pre-wrap">{task.task_description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {task.submission_type === "Link" && <LinkIcon className="w-3 h-3 mr-1" />}
                              {task.submission_type === "Image" && <Image className="w-3 h-3 mr-1" />}
                              {task.submission_type === "Text" && <FileText className="w-3 h-3 mr-1" />}
                              Submit: {task.submission_type}
                            </Badge>
                            <Badge className="bg-gray-700 text-gray-300 text-xs">
                              {task.total_submissions || 0} submissions
                            </Badge>
                          </div>
                        </div>
                      )}
                      
                      {submitted ? (
                        <div className={`p-3 rounded-lg border-2 ${
                          submission.status === "Approved" ? "bg-green-500/10 border-green-500/40" :
                          submission.status === "Rejected" ? "bg-red-500/10 border-red-500/40" :
                          "bg-yellow-500/10 border-yellow-500/40"
                        }`}>
                          <div className="flex items-center gap-2">
                            {submission.status === "Approved" ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                             submission.status === "Rejected" ? <XCircle className="w-5 h-5 text-red-400" /> :
                             <Clock className="w-5 h-5 text-yellow-400" />}
                            <p className={`font-semibold text-sm ${
                              submission.status === "Approved" ? "text-green-400" :
                              submission.status === "Rejected" ? "text-red-400" : "text-yellow-400"
                            }`}>
                              {submission.status === "Approved" ? "✓ Approved!" :
                               submission.status === "Rejected" ? "✗ Rejected" : "⏳ Under Review"}
                            </p>
                          </div>
                          {submission.admin_notes && (
                            <p className="text-xs text-gray-400 mt-2 ml-7">{submission.admin_notes}</p>
                          )}
                        </div>
                      ) : (
                        <Button 
                          onClick={() => setShowSubmitModal(task)} 
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Submit Task
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* My Task History */}
        {mySubmissions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">My Task History</h2>
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 text-gray-400 text-sm">Task</th>
                        <th className="text-center py-2 text-gray-400 text-sm">Diamonds</th>
                        <th className="text-center py-2 text-gray-400 text-sm">Status</th>
                        <th className="text-right py-2 text-gray-400 text-sm">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mySubmissions.map((sub) => (
                        <tr key={sub.id} className="border-b border-gray-800">
                          <td className="py-3 text-white text-sm">{sub.task_title}</td>
                          <td className="py-3 text-center text-purple-400 font-bold">+{sub.diamond_reward} 💎</td>
                          <td className="py-3 text-center">
                            <Badge className={
                              sub.status === "Approved" ? "bg-green-500/20 text-green-400" :
                              sub.status === "Rejected" ? "bg-red-500/20 text-red-400" :
                              "bg-yellow-500/20 text-yellow-400"
                            }>
                              {sub.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right text-gray-400 text-xs">
                            {format(new Date(sub.created_date), "dd MMM yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Submit Task Modal */}
      {showSubmitModal && (
        <Dialog open={true} onOpenChange={() => setShowSubmitModal(null)}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Submit Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <p className="font-bold text-white mb-1">{showSubmitModal.task_title}</p>
                <p className="text-sm text-gray-400 mb-2">{showSubmitModal.task_description}</p>
                <Badge className="bg-purple-500/30 text-purple-300">
                  Reward: +{showSubmitModal.diamond_reward} 💎
                </Badge>
              </div>

              {showSubmitModal.submission_type === "Link" && (
                <div>
                  <Label className="text-gray-300">Paste Link</Label>
                  <Input
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="https://..."
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              )}

              {showSubmitModal.submission_type === "Text" && (
                <div>
                  <Label className="text-gray-300">Your Response</Label>
                  <Textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Type your response..."
                    className="bg-gray-800 border-gray-700 text-white"
                    rows={4}
                  />
                </div>
              )}

              {(showSubmitModal.submission_type === "Image" || showSubmitModal.submission_type === "PDF") && (
                <div>
                  <Label className="text-gray-300">Upload {showSubmitModal.submission_type}</Label>
                  {submissionFile ? (
                    <div className="p-4 bg-gray-800 rounded-lg">
                      {showSubmitModal.submission_type === "Image" && (
                        <img src={submissionFile} className="w-full h-40 object-contain mb-2" />
                      )}
                      <p className="text-green-400 text-sm">✓ File uploaded</p>
                      <Button size="sm" onClick={() => setSubmissionFile("")} variant="outline" className="mt-2">
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-purple-500/50 transition">
                        {uploading ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                        ) : (
                          <>
                            <Upload className="w-10 h-10 mx-auto text-gray-500 mb-2" />
                            <p className="text-gray-400 text-sm">Click to upload {showSubmitModal.submission_type}</p>
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

              <div className="flex gap-2 pt-2">
                <Button onClick={() => setShowSubmitModal(null)} variant="outline" className="flex-1 border-gray-700">
                  Cancel
                </Button>
                <Button
                  onClick={() => submitTask(showSubmitModal)}
                  disabled={submitting || (!submissionText && !submissionFile)}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}