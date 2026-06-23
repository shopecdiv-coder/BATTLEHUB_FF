import React, { useState } from "react";
import { Report } from "@/entities/Report";
import { BanRecord } from "@/entities/BanRecord";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Check, X, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function ReportsManagement({ reports, onUpdate }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [banSeverity, setBanSeverity] = useState("Warning");
  const [banDuration, setBanDuration] = useState("7");
  const [processing, setProcessing] = useState(false);

  const handleResolve = async (report, action) => {
    setProcessing(true);
    try {
      if (action === "ban") {
        const currentUser = await User.me();
        const durationDays = banSeverity === "Permanent" ? 0 : parseInt(banDuration);
        const startDate = new Date();
        const endDate = durationDays > 0 ? new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000) : null;

        await BanRecord.create({
          user_id: report.reported_user_id,
          user_ign: report.reported_ign,
          reason: report.reason + " - " + report.description,
          severity: banSeverity,
          duration_days: durationDays,
          start_date: startDate.toISOString(),
          end_date: endDate?.toISOString(),
          evidence_urls: report.evidence_urls,
          banned_by: currentUser.id
        });

        if (banSeverity === "Permanent" || durationDays > 0) {
          await User.update(report.reported_user_id, {
            is_banned: true,
            ban_reason: report.reason,
            ban_until: endDate?.toISOString()
          });
        }
      }

      await Report.update(report.id, {
        status: action === "dismiss" ? "Dismissed" : "Resolved",
        admin_notes: adminNotes
      });

      setSelectedReport(null);
      setAdminNotes("");
      await onUpdate();
    } catch (error) {
      console.error("Error resolving report:", error);
    }
    setProcessing(false);
  };

  const pendingReports = reports.filter(r => r.status === "Pending" || r.status === "Under Investigation");

  return (
    <div className="space-y-6">
      {pendingReports.length === 0 ? (
        <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
          <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">All Clear!</h3>
          <p className="text-gray-500">No pending reports to review</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {pendingReports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-red-500/50 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-gray-100">
                        {report.reported_ign}
                      </CardTitle>
                      <p className="text-sm text-gray-400">by {report.reporter_ign}</p>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400">
                      {report.reason}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-300">{report.description}</p>
                  
                  {report.evidence_urls && report.evidence_urls.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-purple-400">
                      <ImageIcon className="w-4 h-4" />
                      <span>{report.evidence_urls.length} evidence files</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Reported {format(new Date(report.created_date), "MMM d, yyyy")}
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedReport(report);
                      setAdminNotes(report.admin_notes || "");
                    }}
                    className="w-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Review Report
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-gray-100 mb-4">Review Report</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-gray-400">Reported Player</p>
                  <p className="text-lg font-semibold text-gray-100">{selectedReport.reported_ign}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Reason</p>
                  <Badge className="bg-red-500/20 text-red-400">{selectedReport.reason}</Badge>
                </div>

                <div>
                  <p className="text-sm text-gray-400">Description</p>
                  <p className="text-gray-300">{selectedReport.description}</p>
                </div>

                {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Evidence</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedReport.evidence_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-32 object-cover rounded border border-gray-700 hover:border-purple-500/50" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Ban Severity</label>
                  <Select value={banSeverity} onValueChange={setBanSeverity}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Warning">Warning (No Ban)</SelectItem>
                      <SelectItem value="Temporary">Temporary Ban</SelectItem>
                      <SelectItem value="Permanent">Permanent Ban</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {banSeverity === "Temporary" && (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Ban Duration (Days)</label>
                    <Select value={banDuration} onValueChange={setBanDuration}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                        <SelectItem value="365">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-gray-100"
                    placeholder="Add notes about your decision..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleResolve(selectedReport, "dismiss")}
                  disabled={processing}
                  className="border-gray-700 text-gray-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Dismiss
                </Button>
                <Button
                  onClick={() => handleResolve(selectedReport, "ban")}
                  disabled={processing}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {banSeverity === "Warning" ? "Resolve with Warning" : "Issue Ban"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}