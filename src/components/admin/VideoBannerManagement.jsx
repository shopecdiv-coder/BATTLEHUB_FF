import React, { useState, useEffect } from "react";
import { VideoBanner } from "@/entities/VideoBanner";
import { AppSettings } from "@/entities/AppSettings";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Upload, X, Eye, EyeOff, Trash2, Youtube, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VideoBannerManagement({ banners = [], onUpdate }) {
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("direct");
  const [youtubeId, setYoutubeId] = useState("");
  const [bannerText, setBannerText] = useState("Welcome to Battle Hub FF");
  const [savingText, setSavingText] = useState(false);

  useEffect(() => {
    AppSettings.filter({ setting_key: "video_banner_text" }).then(s => {
      if (s.length > 0 && s[0].setting_value) setBannerText(s[0].setting_value);
    }).catch(() => {});
  }, []);

  const saveBannerText = async () => {
    setSavingText(true);
    try {
      const existing = await AppSettings.filter({ setting_key: "video_banner_text" });
      if (existing.length > 0) {
        await AppSettings.update(existing[0].id, { setting_value: bannerText });
      } else {
        await AppSettings.create({ setting_key: "video_banner_text", setting_value: bannerText, is_enabled: true });
      }
      alert("✅ Banner text updated!");
    } catch { alert("Failed to save"); }
    setSavingText(false);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert("Please upload a valid video file");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert("Video file is too large. Maximum allowed size is 100MB.");
      return;
    }

    setUploadingVideo(true);
    try {
      const { file_url } = await UploadFile({ file });
      setVideoUrl(file_url);
    } catch (error) {
      console.error("Error uploading video:", error);
      alert(`Failed to upload video: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleCreateBanner = async () => {
    const finalUrl = videoType === "youtube" ? youtubeId : videoUrl;
    if (!finalUrl) {
      alert(videoType === "youtube" ? "Please enter YouTube video ID" : "Please upload a video first");
      return;
    }

    try {
      // Deactivate all existing banners first
      for (const banner of banners) {
        await VideoBanner.update(banner.id, { active: false });
      }

      // Create new active banner
      await VideoBanner.create({
        video_url: finalUrl,
        video_type: videoType,
        active: true
      });

      setVideoUrl("");
      setYoutubeId("");
      onUpdate();
      alert("Video banner set successfully!");
    } catch (error) {
      console.error("Error creating banner:", error);
      alert("Failed to create video banner");
    }
  };

  const toggleActive = async (banner) => {
    try {
      // Deactivate all other banners
      for (const b of banners) {
        if (b.id !== banner.id) {
          await VideoBanner.update(b.id, { active: false });
        }
      }

      // Toggle this banner
      await VideoBanner.update(banner.id, { active: !banner.active });
      onUpdate();
    } catch (error) {
      console.error("Error toggling banner:", error);
      alert("Failed to update banner");
    }
  };

  const deleteBanner = async (id) => {
    if (confirm("Delete this video banner?")) {
      try {
        await VideoBanner.delete(id);
        onUpdate();
        alert("Video banner deleted successfully!");
      } catch (error) {
        console.error("Error deleting banner:", error);
        alert("Failed to delete banner");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Text Editor */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-100 text-base">
            ✏️ Video Banner Text (Homepage)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={bannerText}
            onChange={(e) => setBannerText(e.target.value)}
            placeholder="e.g. Welcome to Battle Hub FF"
            className="bg-gray-800 border-gray-700 text-white text-lg"
          />
          <Button onClick={saveBannerText} disabled={savingText} className="w-full bg-cyan-600 hover:bg-cyan-700">
            {savingText ? "Saving..." : "Save Banner Text"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-100">
            <Video className="w-5 h-5 text-purple-400" />
            Upload New Video Banner for Homepage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              type="button"
              onClick={() => setVideoType("direct")}
              variant={videoType === "direct" ? "default" : "outline"}
              className={videoType === "direct" ? "bg-purple-600" : "border-gray-700"}
            >
              <Video className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
            <Button
              type="button"
              onClick={() => setVideoType("url")}
              variant={videoType === "url" ? "default" : "outline"}
              className={videoType === "url" ? "bg-cyan-600" : "border-gray-700"}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Direct Video URL (MP4)
            </Button>
            <Button
              type="button"
              onClick={() => setVideoType("youtube")}
              variant={videoType === "youtube" ? "default" : "outline"}
              className={videoType === "youtube" ? "bg-red-600" : "border-gray-700"}
            >
              <Youtube className="w-4 h-4 mr-2" />
              YouTube Link
            </Button>
          </div>

          {videoType === "youtube" ? (
            <div className="space-y-3">
              <Label className="text-gray-300">YouTube Video Link or ID</Label>
              <Input
                value={youtubeId}
                onChange={(e) => {
                  const input = e.target.value.trim();
                  // Extract video ID from various YouTube URL formats
                  let videoId = input;
                  
                  // Check if it's a full URL
                  if (input.includes('youtube.com') || input.includes('youtu.be')) {
                    try {
                      const url = new URL(input);
                      if (url.hostname.includes('youtu.be')) {
                        videoId = url.pathname.slice(1);
                      } else if (url.hostname.includes('youtube.com')) {
                        videoId = url.searchParams.get('v') || '';
                      }
                    } catch {
                      // Not a valid URL, use as-is
                    }
                  }
                  
                  setYoutubeId(videoId);
                }}
                placeholder="Paste YouTube link or video ID"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">Paste full YouTube link or just the video ID</p>
              {youtubeId && (
                <div className="aspect-video rounded-lg overflow-hidden border-2 border-red-500/50">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}`}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          ) : videoType === "url" ? (
            <div className="space-y-3">
              <Label className="text-gray-300">Direct Video URL (.mp4 / .webm)</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value.trim())}
                placeholder="https://example.com/my-video.mp4"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">Paste a direct link to an MP4 video file hosted online</p>
              {videoUrl && (
                <div className="relative">
                  <video
                    src={videoUrl}
                    className="w-full h-48 object-cover rounded-lg border-2 border-cyan-500/50"
                    controls
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {videoUrl ? (
                <div className="relative group">
                  <video
                    src={videoUrl}
                    className="w-full h-48 object-cover rounded-lg border-2 border-purple-500/50"
                    controls
                  />
                  <button
                    type="button"
                    onClick={() => setVideoUrl("")}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-700 hover:border-purple-500/50 rounded-lg p-8 text-center transition-colors">
                    {uploadingVideo ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        <p className="text-sm text-gray-400">Uploading video...</p>
                      </div>
                    ) : (
                      <>
                        <Video className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                        <p className="text-sm text-gray-400 mb-1">Click to upload video banner</p>
                        <p className="text-xs text-gray-500">MP4, WebM, or OGG (Max 50MB recommended)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                    disabled={uploadingVideo}
                  />
                </label>
              )}
            </div>
          )}

          <Button
            onClick={handleCreateBanner}
            disabled={((videoType === "direct" || videoType === "url") && !videoUrl) || (videoType === "youtube" && !youtubeId) || uploadingVideo}
            className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
          >
            <Upload className="w-4 h-4 mr-2" />
            Set as Active Homepage Banner
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-100">Existing Video Banners</h3>
        {banners.length === 0 ? (
          <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
            <Video className="w-16 h-16 mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Video Banners</h3>
            <p className="text-gray-500">Upload your first video banner to get started</p>
          </Card>
        ) : (
          banners.map((banner, index) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {banner.video_type === "youtube" ? (
                      <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
                        <Youtube className="w-8 h-8 text-red-500" />
                      </div>
                    ) : (
                      <video
                        src={banner.video_url}
                        className="w-32 h-20 object-cover rounded-lg"
                        muted
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={banner.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                          {banner.active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {banner.video_type === "youtube" ? "YouTube" : "Direct"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {banner.video_type === "youtube" ? `ID: ${banner.video_url}` : 'Video File'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Uploaded: {new Date(banner.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(banner)}
                        className={banner.active ? "border-gray-700" : "border-green-500/50 text-green-400"}
                      >
                        {banner.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteBanner(banner.id)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}