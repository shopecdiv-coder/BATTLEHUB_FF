import React, { useState } from "react";
import { Report } from "@/entities/Report";
import { UserGroup } from "@/api/entities";
import { BanRecord } from "@/entities/BanRecord";
import { Notification } from "@/entities/Notification";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/api/firebaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function AppealsManagement({ reports, onUpdate }) {
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const appeals = reports.filter(r => r.type === "group_appeal" || r.type === "media_appeal");
  const pendingAppeals = appeals.filter(r => r.status === "Pending" || r.status === "Under Investigation");

  const handleResolve = async (appeal, action) => {
    setProcessing(true);
    try {
      if (appeal.type === "media_appeal") {
        if (action === "approve") {
          await updateDoc(doc(db, 'media_posts', appeal.target_id), {
            status: 'published',
            ban_reason: null
          });
          if (appeal.reporter_id) {
            await Notification.create({
              recipient_id: appeal.reporter_id,
              title: "Appeal Approved",
              message: "Your appeal was approved and your video has been restored.",
              type: "system",
              read: false,
              created_date: new Date().toISOString()
            });
          }
        } else if (action === "reject") {
          if (appeal.reporter_id) {
            await Notification.create({
              recipient_id: appeal.reporter_id,
              title: "Appeal Rejected",
              message: `Your appeal was rejected. Reason: ${adminNotes || 'Decision upheld by admins.'}`,
              type: "system",
              read: false,
              created_date: new Date().toISOString()
            });
          }
        }
      } else {
        if (action === "approve") {
          // Unban the group
          await UserGroup.update(appeal.group_id, {
            is_banned: false,
            ban_reason: null,
            banned_at: null,
            banned_by: null,
            ban_until: null
          });

          // Try to update any ban record
          const activeBans = await BanRecord.list();
          const groupBan = activeBans.find(b => b.target_type === 'group' && b.group_id === appeal.group_id);
          if (groupBan) {
            await BanRecord.update(groupBan.id, {
              end_date: new Date().toISOString(),
              appeal_status: "Approved"
            });
          }
        } else if (action === "reject" && adminNotes) {
          // Append admin notes to the ban reason so users see why it was rejected
          const group = await UserGroup.get(appeal.group_id);
          if (group) {
            await UserGroup.update(appeal.group_id, {
              ban_reason: group.ban_reason.split(" | Admin Reply:")[0] + " | Admin Reply: " + adminNotes
            });
          }
        }
      }

      await Report.update(appeal.id, {
        status: action === "reject" ? "Rejected" : "Approved",
        admin_notes: adminNotes
      });

      setSelectedAppeal(null);
      setAdminNotes("");
      await onUpdate();
    } catch (error) {
      console.error("Error resolving appeal:", error);
    }
    setProcessing(false);
  };

  return (
    <div className="space-y-6">
      {pendingAppeals.length === 0 ? (
        <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
          <ShieldCheck className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Pending Appeals</h3>
          <p className="text-gray-500">All appeals have been reviewed</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingAppeals.map((appeal) => (
            <Card 
              key={appeal.id}
              className={`bg-gray-900 border-gray-800 hover:border-gray-700 transition-all cursor-pointer ${
                selectedAppeal?.id === appeal.id ? 'ring-2 ring-violet-500' : ''
              }`}
              onClick={() => setSelectedAppeal(appeal)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className={`border-violet-500/30 ${appeal.type === 'media_appeal' ? 'text-blue-400' : 'text-violet-400'}`}>
                    {appeal.type === 'media_appeal' ? 'Media Appeal' : 'Group Appeal'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {format(new Date(appeal.created_date || appeal.created_at || Date.now()), "MMM d, yyyy")}
                  </span>
                </div>
                
                <h4 className="font-semibold text-gray-200 truncate mb-1">
                  {appeal.type === 'media_appeal' ? `Post: ${appeal.target_id}` : `Group ID: ${appeal.group_id}`}
                </h4>
                <p className="text-sm text-gray-400 truncate">
                  By: {appeal.reporter_ign}
                </p>
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {appeal.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedAppeal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="border-b border-gray-800 bg-gray-900/50 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-gray-100 flex items-center gap-2">
                      Review Appeal
                    </CardTitle>
                    <p className="text-sm text-gray-400 mt-1">
                      Submitted by {selectedAppeal.reporter_ign}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAppeal(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Appeal Reason</h4>
                      <div className="p-3 bg-gray-950 rounded-lg text-sm text-gray-300">
                        {selectedAppeal.description}
                      </div>
                    </div>
                    
                    {selectedAppeal.evidence_urls?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Evidence / Proof</h4>
                        <div className="flex gap-2 flex-wrap">
                          {selectedAppeal.evidence_urls.map((url, i) => (
                            <a 
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img src={url} alt="Evidence" className="w-24 h-24 object-cover rounded-lg border border-gray-800 hover:border-violet-500 transition-colors" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 bg-gray-950/50 p-4 rounded-xl border border-gray-800">
                    <h4 className="text-sm font-medium text-gray-500">Admin Action</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Admin Notes (Optional)</label>
                        <Textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Internal notes about this decision..."
                          className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
                        />
                      </div>
                      
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleResolve(selectedAppeal, "reject")}
                          disabled={processing}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject Appeal
                        </Button>
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleResolve(selectedAppeal, "approve")}
                          disabled={processing}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve (Unban)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
