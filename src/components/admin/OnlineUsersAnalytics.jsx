import React, { useState, useEffect } from "react";
import { ActiveUser } from "@/entities/ActiveUser";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function OnlineUsersAnalytics() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const activeRecords = await ActiveUser.list("-last_active", 200);
    const now = new Date();
    const online = activeRecords.filter(a => {
      const lastActive = new Date(a.last_active);
      return (now - lastActive) < 60000; // 1 minute
    });

    const userIds = online.map(a => a.user_id);
    const users = await User.list("-created_date", 200);
    const onlineUserDetails = users.filter(u => userIds.includes(u.id));

    setOnlineUsers(onlineUserDetails.map(u => {
      const activeRecord = activeRecords.find(a => a.user_id === u.id);
      return { ...u, last_active: activeRecord?.last_active };
    }));
    setLoading(false);
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-100">
          <Users className="w-5 h-5 text-green-500" />
          Online Users Now: {onlineUsers.length}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div></div>
        ) : onlineUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No users online</p>
        ) : (
          <div className="space-y-3">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-100">{user.full_name}</p>
                  <p className="text-sm text-gray-400">{user.ign || "No IGN"}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-500/20 text-green-400">Online</Badge>
                  {user.last_active && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(user.last_active), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}