import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function LoadingBar() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    setLoading(true);
    setProgress(15);

    const timer1 = setTimeout(() => setProgress(50), 150);
    const timer2 = setTimeout(() => setProgress(80), 400);
    const timer3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setLoading(false), 300);
    }, 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gray-900">
      <div
        className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-yellow-400 shadow-lg shadow-orange-500/50"
        style={{ width: `${progress}%`, transition: "width 0.3s ease-out" }}
      />
    </div>
  );
}