import React from "react";
import { Trophy, Users, Target, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCards({ tournaments }) {
  const stats = [
    {
      icon: Trophy,
      label: "Active Tournaments",
      value: tournaments.length,
      color: "cyan",
      gradient: "from-[#00FFFF] to-[#0088FF]"
    },
    {
      icon: Users,
      label: "Total Players",
      value: tournaments.reduce((sum, t) => sum + (t.current_teams || 0), 0),
      color: "red",
      gradient: "from-[#FF004C] to-[#FF0088]"
    },
    {
      icon: Target,
      label: "Prize Pool",
      value: `₹${tournaments.reduce((sum, t) => sum + (t.prize_pool || 0), 0).toLocaleString()}`,
      color: "gold",
      gradient: "from-[#FFD700] to-[#FF8800]"
    },
    {
      icon: Zap,
      label: "Live Matches",
      value: tournaments.filter(t => t.status === "Live").length,
      color: "cyan",
      gradient: "from-[#00FFFF] to-[#0088FF]"
    }
  ];

  const getGlowClass = (color) => {
    if (color === 'cyan') return 'neon-glow';
    if (color === 'red') return 'neon-glow-red';
    if (color === 'gold') return 'neon-glow-gold';
    return 'neon-glow';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.05, y: -5 }}
        >
          <Card className={`glass-card border-2 border-${stat.color === 'cyan' ? '[#00FFFF]' : stat.color === 'red' ? '[#FF004C]' : '[#FFD700]'}/30 p-6 hover-glow transition-all duration-300 relative overflow-hidden group`}>
            {/* Animated background glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center ${getGlowClass(stat.color)} transform group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className={`text-3xl md:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r ${stat.gradient} mb-1`}>
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-[#A0A0A0] font-semibold">{stat.label}</div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}