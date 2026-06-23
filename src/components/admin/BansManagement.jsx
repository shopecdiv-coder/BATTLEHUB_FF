import React from "react";
import { User } from "@/entities/User";
import { BanRecord } from "@/entities/BanRecord";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ban, Calendar, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function BansManagement({ bans, onRefresh }) {
  const [unbanning, setUnbanning] = React.useState(null);

  const handleUnban = async (ban) => {
    if (!confirm(`Unban ${ban.user_ign}?`)) return;
    setUnbanning(ban.user_id);
    try {
      // Update user to unban
      await User.update(ban.user_id, {
        is_banned: false,
        ban_reason: null,
        ban_until: null
      });
      
      // Also update the ban record to mark as inactive/expired
      await BanRecord.update(ban.id, {
        end_date: new Date().toISOString(),
        appeal_status: "Approved"
      });
      
      alert(`✅ ${ban.user_ign} has been unbanned successfully!`);
      if (onRefresh) await onRefresh();
    } catch (e) {
      console.error("Error:", e);
      alert("❌ Failed to unban user. Please try again.");
    }
    setUnbanning(null);
  };
  const activeBans = bans.filter(b => {
    if (b.severity === "Permanent") return true;
    if (b.end_date) {
      return new Date(b.end_date) > new Date();
    }
    return false;
  });

  if (activeBans.length === 0) {
    return (
      <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
        <Ban className="w-16 h-16 mx-auto text-gray-700 mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Active Bans</h3>
        <p className="text-gray-500">All players are in good standing</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activeBans.map((ban, index) => (
        <motion.div
          key={ban.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-gray-100">{ban.user_ign}</CardTitle>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-400">
                      <span className="text-red-400 font-semibold">Reason:</span> {ban.reason}
                    </p>
                    {ban.user_uid && (
                      <p className="text-gray-400">
                        <span className="text-cyan-400 font-semibold">Game UID:</span> {ban.user_uid}
                      </p>
                    )}
                    {ban.user_id && (
                      <p className="text-gray-400">
                        <span className="text-purple-400 font-semibold">User ID:</span> {ban.user_id.substring(0, 8)}...
                      </p>
                    )}
                    {ban.banned_by && (
                      <p className="text-gray-400">
                        <span className="text-yellow-400 font-semibold">Banned by:</span> Admin
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={
                  ban.severity === "Permanent" 
                    ? "bg-red-500/20 text-red-400" 
                    : ban.severity === "Temporary"
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }>
                  {ban.severity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <div>
                    <p className="text-xs text-gray-500">Banned On</p>
                    <p className="text-gray-300">{format(new Date(ban.start_date), "MMM d, yyyy")}</p>
                  </div>
                </div>
                {ban.end_date && ban.severity !== "Permanent" && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <div>
                      <p className="text-xs text-gray-500">Expires On</p>
                      <p className="text-gray-300">{format(new Date(ban.end_date), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {ban.evidence_urls && ban.evidence_urls.length > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">Evidence:</p>
                  <div className="flex gap-2 flex-wrap">
                    {ban.evidence_urls.map((url, i) => (
                      <a 
                        key={i} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:underline"
                      >
                        Evidence {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <Button
                onClick={() => handleUnban(ban)}
                disabled={unbanning === ban.user_id}
                className="w-full bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {unbanning === ban.user_id ? "Unbanning..." : "Unban User"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}