import React, { useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PAGES = [
  createPageUrl("Home"),
  createPageUrl("Tournaments"),
  createPageUrl("GlobalChat"),
  createPageUrl("Wallet"),
  createPageUrl("Menu"),
];

export default function SwipeNavigation({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const currentIndex = PAGES.indexOf(location.pathname);

  useEffect(() => {
    if (location.pathname === createPageUrl("GlobalChat")) return;

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);

      // Only horizontal swipes (more horizontal than vertical, threshold 60px)
      if (Math.abs(dx) < 60 || dy > Math.abs(dx)) return;
      if (currentIndex === -1) return;

      if (dx < 0 && currentIndex < PAGES.length - 1) {
        // Swipe left → next page
        navigate(PAGES[currentIndex + 1]);
      } else if (dx > 0 && currentIndex > 0) {
        // Swipe right → prev page
        navigate(PAGES[currentIndex - 1]);
      }
      touchStartX.current = null;
      touchStartY.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [currentIndex, navigate]);

  return <>{children}</>;
}