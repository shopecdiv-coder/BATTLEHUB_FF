import React from 'react';
import { Users, Heart, UserPlus, Star } from 'lucide-react';

export default function SocialGridV2({ player }) {
  const items = [
    { label: 'Friends', value: player?.friends_count || 128, icon: Users, color: 'text-blue-400' },
    { label: 'Followers', value: player?.followers_count || '2.4K', icon: Heart, color: 'text-pink-400' },
    { label: 'Following', value: player?.following_count || 96, icon: UserPlus, color: 'text-purple-400' },
    { label: 'Reputation', value: player?.reputation_score || 4.8, icon: Star, color: 'text-yellow-400', sub: 'Excellent', subColor: 'text-green-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
      {items.map((item, i) => (
        <div key={i} className="bg-[#0a0a0c] border border-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:border-gray-700 transition-colors cursor-pointer">
          <item.icon className={`w-6 h-6 mb-2 ${item.color}`} />
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{item.label}</p>
          <div className="flex items-center gap-1">
            {item.icon === Star && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
            <p className="text-xl font-black text-white">{item.value}</p>
          </div>
          {item.sub && <p className={`text-[10px] mt-1 ${item.subColor}`}>{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}
