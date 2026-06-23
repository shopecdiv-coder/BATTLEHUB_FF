import React, { useState, useEffect } from "react";
import { Announcement } from "@/entities/Announcement";
import { Bell, X, Megaphone } from "lucide-react";
import { cacheGet, cacheSet } from "@/lib/cache";

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const CACHE_KEY = 'announcements_home';
      const cached = cacheGet(CACHE_KEY);
      if (cached) {
        setAnnouncements(cached);
        return;
      }
      const data = await Announcement.filter({ active: true, show_on_home: true }, "-created_date", 3).catch(() => []);
      const formatted = data || [];
      cacheSet(CACHE_KEY, formatted, 5 * 60 * 1000);
      setAnnouncements(formatted);
    } catch (error) {
      // Silent fail
    }
  };

  const visibleAnnouncements = announcements; // Show all announcements, no dismiss

  if (visibleAnnouncements.length === 0) return null;

  const priorityStyles = {
    Urgent: "bg-gradient-to-r from-red-600 via-red-500 to-orange-500 border-red-400",
    High: "bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 border-orange-400",
    Medium: "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 border-blue-400",
    Low: "bg-gradient-to-r from-gray-600 via-gray-500 to-gray-400 border-gray-400"
  };

  return (
    <div className="space-y-1">
      {visibleAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={`relative ${priorityStyles[announcement.priority] || priorityStyles.Medium} border-b-2 py-3 px-4`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white text-sm md:text-base">
                  📢 {announcement.title}
                </p>
                <p className="text-white/90 text-xs md:text-sm whitespace-normal break-words">
                  {announcement.message}
                </p>
                {announcement.link && (
                  <a 
                    href={announcement.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white underline text-xs mt-1 inline-block hover:text-yellow-200"
                  >
                    🔗 Open Link
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      ))}
    </div>
  );
}