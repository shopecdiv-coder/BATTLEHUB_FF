import React, { useState, useEffect } from "react";
import { AppNotice } from "@/entities/AppNotice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Megaphone, Calendar, Trophy, Bell, Wrench, Wallet, Sparkles, Gift } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = [
  { value: "announcement", label: "🔔 Announcements", icon: Megaphone, color: "from-red-500 to-orange-500" },
  { value: "upcoming_event", label: "📆 Upcoming Events", icon: Calendar, color: "from-blue-500 to-cyan-500" },
  { value: "winners", label: "🏅 Winners", icon: Trophy, color: "from-yellow-500 to-orange-500" },
  { value: "rule_change", label: "⚠️ Rule Changes", icon: Bell, color: "from-orange-500 to-red-500" },
  { value: "maintenance", label: "🛠️ Maintenance", icon: Wrench, color: "from-gray-500 to-gray-600" },
  { value: "wallet_update", label: "💰 Wallet", icon: Wallet, color: "from-green-500 to-emerald-500" },
  { value: "new_feature", label: "✨ New Features", icon: Sparkles, color: "from-purple-500 to-pink-500" },
  { value: "offer", label: "🎁 Offers", icon: Gift, color: "from-pink-500 to-rose-500" }
];

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    const allNotices = await AppNotice.filter({ is_active: true }, "-priority");
    setNotices(allNotices);
    setLoading(false);
  };

  const filteredNotices = searchQuery 
    ? notices.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notices;

  const getCategoryConfig = (category) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 flex items-center gap-3">
            📢 App Notices
          </h1>
          <p className="text-gray-400 mt-1">Important updates, events, winners, and announcements</p>
        </motion.div>

        {/* Search and Filter */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search notices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-gray-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notices by Category */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : filteredNotices.length === 0 ? (
          <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
            <Bell className="w-16 h-16 mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Notices Found</h3>
            <p className="text-gray-500">Check back later for updates</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map(category => {
              const categoryNotices = filteredNotices.filter(n => n.category === category.value);
              if (categoryNotices.length === 0) return null;

              const Icon = category.icon;

              return (
                <motion.div
                  key={category.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-100">{category.label}</h3>
                          <p className="text-sm text-gray-400">{categoryNotices.length} notice{categoryNotices.length > 1 ? 's' : ''}</p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categoryNotices.map((notice, index) => (
                        <motion.div
                          key={notice.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 bg-gray-800/50 rounded-lg border-2 border-gray-700 hover:border-orange-500/50 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-gray-100 mb-2">{notice.title}</h4>
                              <p className="text-gray-300 text-sm whitespace-pre-wrap">{notice.content}</p>
                            </div>
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 flex-shrink-0">
                              Priority {notice.priority}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}