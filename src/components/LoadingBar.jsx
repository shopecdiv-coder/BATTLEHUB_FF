import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

// Keep track of visited routes to avoid showing skeleton again
const visitedRoutes = new Set();

export default function LoadingBar() {
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (visitedRoutes.has(location.pathname)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Fast splash screen to hide rendering flashes on first visit
    const timer = setTimeout(() => {
      setLoading(false);
      visitedRoutes.add(location.pathname);
    }, 350); 

    return () => {
      clearTimeout(timer);
    };
  }, [location.pathname]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col p-4 animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8 mt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
          <div className="w-32 h-6 rounded bg-gray-800 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
        </div>
      </div>

      {/* Main Content Skeleton (YouTube like cards) */}
      <div className="space-y-6 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col gap-3">
            <div className="w-full h-48 rounded-xl bg-gray-800 animate-pulse" />
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse shrink-0" />
              <div className="space-y-2 flex-1 pt-1">
                <div className="w-3/4 h-4 rounded bg-gray-800 animate-pulse" />
                <div className="w-1/2 h-3 rounded bg-gray-800 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}