import React from 'react';

const matches = [
  { id: 1, type: "Squad", map: "Erangel", kills: 25, damage: 3254, points: "+125", time: "2h ago", placement: 1, img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600" },
  { id: 2, type: "Duo", map: "Miramar", kills: 12, damage: 1420, points: "+65", time: "1h ago", placement: 3, img: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=600" },
  { id: 3, type: "Squad", map: "Sanhok", kills: 8, damage: 980, points: "+15", time: "3h ago", placement: 7, img: "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=600" },
  { id: 4, type: "Solo", map: "Livik", kills: 15, damage: 1760, points: "+95", time: "5h ago", placement: 1, img: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600" },
];

export default function RecentMatchesV2() {
  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-white">Recent Matches</h3>
        <button className="text-[#ff5500] text-xs font-bold hover:underline">View All</button>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {matches.map((m) => (
          <div 
            key={m.id} 
            className="snap-start shrink-0 w-64 h-36 rounded-2xl relative overflow-hidden group cursor-pointer border border-gray-800 hover:border-[#ff5500]/50 transition-colors"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: `url(${m.img})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/60 to-transparent" />
            
            <div className="absolute inset-0 p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-white font-black text-sm border border-gray-700">
                  <span className={m.placement === 1 ? 'text-yellow-400' : m.placement <= 3 ? 'text-blue-400' : 'text-gray-300'}>#{m.placement}</span>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-black text-sm">{m.points}</p>
                </div>
              </div>
              
              <div>
                <p className="text-white font-bold text-sm">{m.type}</p>
                <p className="text-xs text-gray-400 mb-2">{m.map}</p>
                
                <div className="flex justify-between items-center text-xs">
                  <p><span className="text-white font-bold">{m.kills}</span> <span className="text-gray-500">Kills</span></p>
                  <p className="text-gray-500">{m.time}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
