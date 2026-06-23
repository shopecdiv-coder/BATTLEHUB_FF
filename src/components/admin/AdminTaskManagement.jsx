import React, { useState, useEffect } from "react";
import { AdminTask } from "@/entities/AdminTask";
import { TaskSubmission } from "@/entities/TaskSubmission";
import { PhotoLibrary } from "@/entities/PhotoLibrary";
import { UploadFile } from "@/integrations/Core";
import { Diamond } from "@/entities/Diamond";
import { Notification } from "@/entities/Notification";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Upload, Trash2, Check, X, Eye, Image, FileText } from "lucide-react";
import { format } from "date-fns";

export default function AdminTaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    task_title: "",
    task_description: "",
    diamond_reward: 0,
    submission_type: "Link",
    task_image_url: "",
    is_active: true
  });
  const [uploading, setUploading] = useState(false);
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
  const [photoLibrary, setPhotoLibrary] = useState([]);
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allTasks, allSubmissions, photos] = await Promise.all([
      AdminTask.list("-created_date"),
      TaskSubmission.list("-created_date"),
      PhotoLibrary.list()
    ]);
    setTasks(allTasks || []);
    setSubmissions(allSubmissions || []);
    setPhotoLibrary(photos || []);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData({ ...formData, task_image_url: file_url });
    } catch (error) {
      alert("Upload failed");
    }
    setUploading(false);
  };

  const handleCreateTask = async () => {
    if (!formData.task_title || !formData.task_description || formData.diamond_reward <= 0) {
      alert("Please fill all required fields");
      return;
    }
    try {
      await AdminTask.create(formData);
      setFormData({
        task_title: "",
        task_description: "",
        diamond_reward: 0,
        submission_type: "Link",
        task_image_url: "",
        is_active: true
      });
      setShowForm(false);
      loadData();
    } catch (error) {
      alert("Failed to create task");
    }
  };

  const deleteTask = async (id) => {
    if (confirm("Delete this task?")) {
      try {
        await AdminTask.delete(id);
        loadData();
      } catch (error) {
        alert("Failed to delete task");
      }
    }
  };

  const approveSubmission = async (submission) => {
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      
      // Credit diamonds to user
      const accounts = await Diamond.filter({ user_id: submission.user_id });
      if (accounts.length > 0) {
        await Diamond.update(accounts[0].id, {
          diamond_balance: (accounts[0].diamond_balance || 0) + submission.diamond_reward,
          transactions: [
            ...(accounts[0].transactions || []),
            {
              type: "Diamond Earned",
              coin_type: "Diamond",
              amount: submission.diamond_reward,
              description: `Task completed: ${submission.task_title}`,
              timestamp: now
            }
          ]
        });
      } else {
        await Diamond.create({
          user_id: submission.user_id,
          user_ign: submission.user_ign,
          diamond_balance: submission.diamond_reward,
          bh_coin_balance: 0,
          transactions: [{
            type: "Diamond Earned",
            coin_type: "Diamond",
            amount: submission.diamond_reward,
            description: `Task completed: ${submission.task_title}`,
            timestamp: now
          }]
        });
      }

      await TaskSubmission.update(submission.id, {
        status: "Approved",
        admin_notes: adminNote || "Task approved!",
        reviewed_at: now
      });

      await Notification.create({
        recipient_id: submission.user_id,
        type: "Prize Distributed",
        title: "💎 Task Approved!",
        message: `You earned ${submission.diamond_reward} Diamonds for: ${submission.task_title}`,
        link: createPageUrl("Wallet"),
        priority: "High",
        dismissable: true,
        created_at: now
      });

      alert("✅ Task approved & diamonds credited!");
      setViewingSubmission(null);
      setAdminNote("");
      loadData();
    } catch (error) {
      alert("Failed to approve");
    }
    setProcessing(false);
  };

  const rejectSubmission = async (submission) => {
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      await TaskSubmission.update(submission.id, {
        status: "Rejected",
        admin_notes: adminNote || "Task rejected",
        reviewed_at: now
      });

      await Notification.create({
        recipient_id: submission.user_id,
        type: "App Update",
        title: "❌ Task Rejected",
        message: `Your submission for "${submission.task_title}" was rejected. ${adminNote || ''}`,
        link: createPageUrl("EarnCoins"),
        priority: "Medium",
        dismissable: true,
        created_at: now
      });

      alert("Task rejected");
      setViewingSubmission(null);
      setAdminNote("");
      loadData();
    } catch (error) {
      alert("Failed to reject");
    }
    setProcessing(false);
  };

  const pendingSubmissions = submissions.filter(s => s.status === "Pending");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-100">Task Management</h3>
          <p className="text-sm text-gray-400">Create tasks for users to earn diamonds</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-purple-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {showForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="text-gray-300">Task Title</Label>
              <Input
                value={formData.task_title}
                onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
                placeholder="e.g., Upload BattleHub gameplay video"
                className="bg-gray-900 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={formData.task_description}
                onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                placeholder="Describe what user needs to do..."
                className="bg-gray-900 border-gray-700 text-white"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300">Diamond Reward</Label>
                <Input
                  type="number"
                  value={formData.diamond_reward}
                  onChange={(e) => setFormData({ ...formData, diamond_reward: parseInt(e.target.value) || 0 })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Submission Type</Label>
                <Select value={formData.submission_type} onValueChange={(v) => setFormData({ ...formData, submission_type: v })}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Link">Link</SelectItem>
                    <SelectItem value="Text">Text</SelectItem>
                    <SelectItem value="Image">Image</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Task Banner (Optional)</Label>
              {formData.task_image_url ? (
                <div className="relative">
                  <img src={formData.task_image_url} className="w-full h-32 object-cover rounded" />
                  <Button size="sm" onClick={() => setFormData({ ...formData, task_image_url: "" })} className="mt-2">Remove</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-700 rounded p-4 text-center">
                      {uploading ? "Uploading..." : <><Upload className="w-6 h-6 mx-auto text-gray-500" /><p className="text-xs text-gray-400">Upload Image</p></>}
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <Button onClick={() => setShowPhotoLibrary(true)} variant="outline" className="w-full">
                    <Image className="w-4 h-4 mr-2" />
                    Choose from Library
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={handleCreateTask} className="flex-1 bg-purple-600">Create Task</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h4 className="font-semibold text-white mb-3">Pending Submissions ({pendingSubmissions.length})</h4>
        <div className="space-y-3">
          {pendingSubmissions.map((sub) => (
            <Card key={sub.id} className="bg-gray-800 border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-white">{sub.task_title}</p>
                    <p className="text-sm text-gray-400">{sub.user_ign}</p>
                    <p className="text-xs text-yellow-400">💎 {sub.diamond_reward} Diamonds</p>
                  </div>
                  <Button size="sm" onClick={() => setViewingSubmission(sub)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {pendingSubmissions.length === 0 && (
            <p className="text-gray-500 text-center py-4">No pending submissions</p>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-white mb-3">Active Tasks ({tasks.filter(t => t.is_active).length})</h4>
        <div className="space-y-3">
          {tasks.filter(t => t.is_active).map((task) => (
            <Card key={task.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-white">{task.task_title}</p>
                    <p className="text-sm text-gray-400">{task.task_description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className="bg-purple-500/20 text-purple-400">💎 {task.diamond_reward}</Badge>
                      <Badge className="bg-cyan-500/20 text-cyan-400">{task.submission_type}</Badge>
                      <Badge className="bg-gray-500/20 text-gray-400">{task.total_submissions || 0} submissions</Badge>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => deleteTask(task.id)} variant="outline" className="border-red-500/50 text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {showPhotoLibrary && (
        <Dialog open={true} onOpenChange={setShowPhotoLibrary}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl">
            <h3 className="text-xl font-bold text-white mb-4">Photo Library</h3>
            <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {photoLibrary.map((photo) => (
                <div key={photo.id} onClick={() => {
                  setFormData({ ...formData, task_image_url: photo.photo_url });
                  setShowPhotoLibrary(false);
                }} className="cursor-pointer hover:opacity-75">
                  <img src={photo.photo_url} className="w-full h-24 object-cover rounded" />
                  <p className="text-xs text-gray-400 mt-1 truncate">{photo.title}</p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {viewingSubmission && (
        <Dialog open={true} onOpenChange={() => setViewingSubmission(null)}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Review Submission</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-800 rounded">
                <p className="text-sm text-gray-400">Task</p>
                <p className="font-bold text-white">{viewingSubmission.task_title}</p>
                <p className="text-sm text-purple-400 mt-1">💎 Reward: {viewingSubmission.diamond_reward} Diamonds</p>
              </div>
              <div className="p-4 bg-gray-800 rounded">
                <p className="text-sm text-gray-400">Submitted by</p>
                <p className="text-white">{viewingSubmission.user_ign}</p>
                <p className="text-xs text-gray-500">{format(new Date(viewingSubmission.created_date), "PPP p")}</p>
              </div>
              <div className="p-4 bg-gray-800 rounded">
                <p className="text-sm text-gray-400 mb-2">Submission</p>
                {viewingSubmission.submission_text && (
                  <p className="text-white break-all">{viewingSubmission.submission_text}</p>
                )}
                {viewingSubmission.submission_file_url && (
                  <img src={viewingSubmission.submission_file_url} className="w-full max-h-64 object-contain rounded" />
                )}
              </div>
              <div>
                <Label className="text-gray-300">Admin Notes</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Optional message to user..."
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => approveSubmission(viewingSubmission)} disabled={processing} className="flex-1 bg-green-600">
                  <Check className="w-4 h-4 mr-2" />
                  Approve & Credit
                </Button>
                <Button onClick={() => rejectSubmission(viewingSubmission)} disabled={processing} variant="outline" className="flex-1 border-red-500/50 text-red-400">
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}