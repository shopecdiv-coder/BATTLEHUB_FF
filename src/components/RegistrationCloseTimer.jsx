import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function RegistrationCloseTimer({ closingDate }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const close = new Date(closingDate);
      
      // CRITICAL FIX: Now considers BOTH date AND time
      const diff = close.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Registration Closed");
        return false;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
      return true;
    };

    calculateTimeLeft();
    const interval = setInterval(() => {
      if (!calculateTimeLeft()) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [closingDate]);

  return (
    <div className="flex items-center gap-2 text-orange-400 font-semibold">
      <Clock className="w-4 h-4" />
      <span>{timeLeft}</span>
    </div>
  );
}