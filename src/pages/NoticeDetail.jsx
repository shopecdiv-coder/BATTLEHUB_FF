import React, { useState, useEffect } from "react";
import { WinnerNotice } from "@/entities/WinnerNotice";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, FileText, Calendar, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function NoticeDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const noticeId = urlParams.get("id");
  
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotice();
  }, [noticeId]);

  const loadNotice = async () => {
    const notices = await WinnerNotice.filter({ id: noticeId });
    if (notices.length > 0) {
      setNotice(notices[0]);
    }
    setLoading(false);
  };

  const getMediaType = (url) => {
    if (!url) return null;
    if (url.endsWith('.pdf')) return 'pdf';
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    if (url.match(/\.(mp4|webm|mov)$/i)) return 'video';
    return 'unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
          <h3 className="text-xl font-semibold text-gray-300">Notice not found</h3>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("Notices"))}
          className="text-gray-400 hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Notices
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-orange-400" />
                <Badge variant="outline" className="text-orange-400">
                  {format(new Date(notice.date), "PPP")}
                </Badge>
              </div>
              <CardTitle className="text-3xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                {notice.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Description */}
              {notice.description && (
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 text-lg whitespace-pre-wrap">{notice.description}</p>
                </div>
              )}

              {/* Winner Details */}
              {notice.winner_details && (
                <div className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-orange-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-6 h-6 text-[#FFD700]" />
                    <h3 className="text-xl font-bold text-gray-100">Winners</h3>
                  </div>
                  <div className="space-y-3">
                    {notice.winner_details.first_place && (
                      <div className="flex items-center gap-3 p-3 bg-[#FFD700]/10 rounded-lg border border-[#FFD700]/30">
                        <span className="text-2xl">🥇</span>
                        <div>
                          <p className="text-[#FFD700] font-bold">1st Place</p>
                          <p className="text-gray-100">{notice.winner_details.first_place}</p>
                        </div>
                      </div>
                    )}
                    {notice.winner_details.second_place && (
                      <div className="flex items-center gap-3 p-3 bg-[#C0C0C0]/10 rounded-lg border border-[#C0C0C0]/30">
                        <span className="text-2xl">🥈</span>
                        <div>
                          <p className="text-[#C0C0C0] font-bold">2nd Place</p>
                          <p className="text-gray-100">{notice.winner_details.second_place}</p>
                        </div>
                      </div>
                    )}
                    {notice.winner_details.third_place && (
                      <div className="flex items-center gap-3 p-3 bg-[#CD7F32]/10 rounded-lg border border-[#CD7F32]/30">
                        <span className="text-2xl">🥉</span>
                        <div>
                          <p className="text-[#CD7F32] font-bold">3rd Place</p>
                          <p className="text-gray-100">{notice.winner_details.third_place}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Media Gallery */}
              {notice.media_urls && notice.media_urls.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-100">Attachments</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {notice.media_urls.map((url, index) => {
                      const mediaType = getMediaType(url);
                      return (
                        <div key={index} className="rounded-xl overflow-hidden border-2 border-gray-700">
                          {mediaType === 'image' ? (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url}
                                alt={`Media ${index + 1}`}
                                className="w-full h-64 object-cover hover:scale-105 transition-transform"
                              />
                            </a>
                          ) : mediaType === 'pdf' ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center justify-center h-64 bg-gradient-to-br from-red-900/30 to-orange-900/30 hover:from-red-900/40 hover:to-orange-900/40 transition-all"
                            >
                              <FileText className="w-16 h-16 text-orange-400 mb-3" />
                              <p className="text-gray-300 font-semibold">PDF Document</p>
                              <Button className="mt-3 bg-orange-500 hover:bg-orange-600">
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                            </a>
                          ) : mediaType === 'video' ? (
                            <video
                              src={url}
                              controls
                              className="w-full h-64"
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}