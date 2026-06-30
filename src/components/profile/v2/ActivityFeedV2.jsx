import React from 'react';
import { Play } from 'lucide-react';

const activities = [
  {
    id: 1,
    type: 'tournament',
    user: 'MortalPlays',
    action: 'won the tournament',
    context: 'BattleHub Cup Season 7',
    time: '2m ago',
    avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
    avatarStyle: 'ring-2 ring-red-500',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop'
  },
  {
    id: 2,
    type: 'rank',
    user: 'ScoutOP',
    action: 'reached Conqueror rank',
    context: 'Season 7',
    time: '3h ago',
    avatar: 'https://cdn-icons-png.flaticon.com/512/5499/5499092.png', // Fallback rank icon
    avatarStyle: 'p-1',
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 3,
    type: 'mvp',
    user: 'JonathanGaming',
    action: 'achieved MVP',
    context: 'in BattleHub Cup',
    time: '1d ago',
    avatar: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png', // Fallback mvp/shield icon
    avatarStyle: 'p-1',
    thumbnail: 'https://images.unsplash.com/photo-1579208031575-c54d31835bc3?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 4,
    type: 'reel',
    user: 'PayalGaming',
    action: 'added a new reel',
    context: 'Watch now',
    time: '2d ago',
    avatar: 'https://cdn-icons-png.flaticon.com/512/8254/8254413.png', // Fallback play/reel icon
    avatarStyle: 'bg-purple-900/30 p-2 ring-1 ring-purple-500/50',
    thumbnail: 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?q=80&w=1986&auto=format&fit=crop'
  }
];

export default function ActivityFeedV2({ player, limit, onViewAll, hideHeader }) {
  // If we wanted to use actual player name, we could use player?.ign
  const playerName = player?.ign || 'ShivamPlays';

  const displayActivities = limit ? activities.slice(0, limit) : activities;

  return (
    <div className={`w-full ${hideHeader ? 'mt-4' : 'mt-8 mb-8'} bg-[#0c0d12] border border-[#1f2029] rounded-2xl flex flex-col overflow-hidden`}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex justify-between items-center px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
          <h3 className="font-bold text-white text-[13px] sm:text-sm uppercase tracking-widest">Following Updates</h3>
          <button 
            onClick={onViewAll}
            className="text-[#ff5500] hover:text-[#ff5500]/80 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            View All
          </button>
        </div>
      )}

      {/* Feed Container */}
      <div className="flex flex-col">
        {displayActivities.map((activity, index) => (
          <div 
            key={activity.id}
            className={`p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#111115] transition-colors cursor-pointer ${
              index !== displayActivities.length - 1 ? 'border-b border-[#1f2029]' : ''
            }`}
          >
            {/* Left side: Avatar and Text */}
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 bg-[#1a1a20] flex items-center justify-center ${activity.avatarStyle}`}>
                <img 
                  src={activity.avatar} 
                  alt="icon" 
                  className={activity.type === 'tournament' ? "w-full h-full object-cover" : "w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md"}
                />
              </div>
              
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-[13px] sm:text-[15px] text-gray-300 leading-tight truncate">
                  <span className="font-bold text-white mr-1">{activity.user}</span> 
                  {activity.action}
                </p>
                {activity.type === 'reel' ? (
                  <p className="text-[12px] sm:text-[13px] text-blue-500 font-medium mt-1 truncate">
                    {activity.context}
                  </p>
                ) : (
                  <p className="text-[12px] sm:text-[13px] text-gray-400 mt-1 truncate">
                    {activity.context}
                  </p>
                )}
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-1">
                  {activity.time}
                </p>
              </div>
            </div>

            {/* Right side: Thumbnail */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-gray-800">
              <img 
                src={activity.thumbnail} 
                alt="thumbnail" 
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
