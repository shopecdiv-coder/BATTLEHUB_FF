import React, { useState, useEffect, useRef } from "react";
import { Banner } from "@/entities/Banner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cacheGet, cacheSet } from "@/lib/cache";

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 3000);
      return () => clearInterval(intervalRef.current);
    }
  }, [banners]);

  const loadBanners = async () => {
    const CACHE_KEY = 'banners_active';
    const cached = cacheGet(CACHE_KEY);
    if (cached) {
      setBanners(cached);
      setLoading(false);
      return;
    }
    const activeBanners = await Banner.filter({ active: true }, "order").catch(() => []);
    cacheSet(CACHE_KEY, activeBanners, 10 * 60 * 1000);
    setBanners(activeBanners);
    setLoading(false);
  };

  const goTo = (idx) => {
    setCurrentIndex(idx);
    // Reset timer
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (banners.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 3000);
    }
  };

  const handlePrevious = () => goTo((currentIndex - 1 + banners.length) % banners.length);
  const handleNext = () => goTo((currentIndex + 1) % banners.length);

  if (loading || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden border-2 border-cyan-500/30">
      {/* All banners stacked, only current one visible - NO animation, instant switch */}
      <div className="relative w-full h-full">
        {banners.map((banner, idx) => (
          <div
            key={banner.id}
            className="absolute inset-0"
            style={{ opacity: idx === currentIndex ? 1 : 0, transition: "none" }}
          >
            {banner.redirect_url ? (
              <a href={banner.redirect_url} className="block w-full h-full">
                <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
              </a>
            ) : (
              <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
            )}
          </div>
        ))}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A1A] via-transparent to-transparent pointer-events-none z-10" />

        {/* Caption */}
        {currentBanner.caption && (
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
            <h3 className="text-2xl font-bold text-white mb-1">{currentBanner.title}</h3>
            <p className="text-gray-300">{currentBanner.caption}</p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {banners.length > 1 && (
        <>
          <button onClick={handlePrevious} className="absolute left-3 top-1/2 -translate-y-1/2 z-30 bg-black/50 p-2 rounded-full hover:bg-black/70">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button onClick={handleNext} className="absolute right-3 top-1/2 -translate-y-1/2 z-30 bg-black/50 p-2 rounded-full hover:bg-black/70">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`h-1.5 rounded-full ${idx === currentIndex ? "w-6 bg-cyan-400" : "w-1.5 bg-white/40"}`}
                style={{ transition: "none" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}