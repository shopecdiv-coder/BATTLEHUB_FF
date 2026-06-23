import React, { useState, useEffect, useRef } from "react";
import { VideoBanner as VideoBannerEntity } from "@/entities/VideoBanner";
import { AppSettings } from "@/entities/AppSettings";
import { Volume2, VolumeX, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const getYouTubeId = (url) => {
  if (!url) return null;
  if (!url.includes('/') && !url.includes('?')) return url;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : url;
};

export default function VideoBanner() {
  const [videoBanner, setVideoBanner] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [bannerText, setBannerText] = useState("Welcome to Battle Hub FF");
  const videoRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    loadVideoBanner();
    AppSettings.filter({ setting_key: "video_banner_text" }).then(s => {
      if (s.length > 0 && s[0].setting_value) setBannerText(s[0].setting_value);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const loadVideoBanner = async () => {
    const banners = await VideoBannerEntity.filter({ active: true }).catch(() => []);
    if (banners.length > 0) {
      setVideoBanner(banners[0]);
    }
  };

  if (!videoBanner || !videoBanner.video_url) {
    return null;
  }

  const isYouTube = videoBanner.video_type === 'youtube';
  const ytVideoId = isYouTube ? getYouTubeId(videoBanner.video_url) : null;
  const youtubeWatchUrl = ytVideoId ? `https://www.youtube.com/watch?v=${ytVideoId}` : `https://www.youtube.com/${videoBanner.video_url}`;
  const youtubeEmbedUrl = isYouTube
    ? `https://www.youtube.com/embed/${ytVideoId || videoBanner.video_url}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${ytVideoId || videoBanner.video_url}&controls=1&modestbranding=1`
    : null;

  return (
    <div className="px-4 md:px-8 mb-6">
      <div className="relative w-full rounded-2xl overflow-hidden border-2 border-cyan-500/30 bg-gray-900">
        <div className="relative h-[250px] md:h-[350px] lg:h-[450px]">
          {isYouTube ? (
            <iframe
              ref={iframeRef}
              key={`${ytVideoId}-${isMuted}`}
              src={youtubeEmbedUrl}
              className="w-full h-full object-cover"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              loop
              muted={isMuted}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(err => console.log("Video autoplay failed:", err));
                }
              }}
            >
              <source src={videoBanner.video_url} type="video/mp4" />
            </video>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent pointer-events-none"></div>
          
          {/* Controls */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {isYouTube && (
              <a
                href={youtubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1.5 bg-red-600/80 backdrop-blur-md border border-red-400/30 hover:bg-red-600 rounded-lg text-white text-xs font-semibold"
                title="Watch on YouTube"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden md:inline">YouTube</span>
              </a>
            )}
            <Button
              onClick={() => setIsMuted(!isMuted)}
              className="bg-black/50 backdrop-blur-md border border-white/20 hover:bg-black/70"
              size="icon"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </Button>
          </div>
          
          {/* Welcome Text at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-red-500">
              {bannerText}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}