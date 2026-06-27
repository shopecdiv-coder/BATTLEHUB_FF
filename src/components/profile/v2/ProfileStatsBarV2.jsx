import React from 'react';
import { Target, Trophy, Swords, Crosshair, Award, Flame } from 'lucide-react';

export default function ProfileStatsBarV2({ stats }) {
  const statItems = [
    { label: 'Matches', value: stats?.matches || 124, icon: Target, color: 'text-blue-400' },
    { label: 'Wins', value: stats?.wins || 38, icon: Trophy, color: 'text-yellow-400' },
    { label: 'Win Rate', value: `${stats?.winRate || 30.6}%`, icon: Crosshair, color: 'text-green-400' },
    { label: 'Kills', value: stats?.kills || '1,245', icon: Flame, color: 'text-red-400' },
  ];

  return (
    <div className="w-full overflow-x-auto scrollbar-hide mb-6 border-b border-gray-800 pb-4">
      <div className="flex items-center gap-6 md:gap-12 min-w-max px-2">
        {statItems.map((stat, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gray-900 border border-gray-800 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">{stat.label}</p>
              <p className="text-xl font-black text-white leading-none">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
