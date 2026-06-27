import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, UserPlus, MessageSquare, Users, ChevronDown, CheckCircle2, Star, Edit, Heart, Settings, Download, Bookmark } from 'lucide-react';
import ProfileSettingsDrawer from './ProfileSettingsDrawer';

export default function ProfileHeaderV2({ player, isMe }) {
  // Safe fallbacks
  const ign = player?.ign || "Unknown Player";
  const uid = player?.unique_id || player?.id?.substring(0, 8) || "N/A";
  const avatarUrl = player?.avatar_url || "";
  const bannerUrl = player?.banner_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop";
  const joinDate = player?.created_at ? new Date(player.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "May 2023";
  const isOnline = player?.activity_status === 'Online';
  const points = player?.season_points || 6234;

  return (
    <div className="rounded-2xl overflow-hidden mb-6 border border-gray-800 bg-[#0a0a0c] flex flex-col">
      {/* Top Banner Section (Covers Avatar, Info, and Rank) */}
      <div 
        className="w-full bg-cover bg-center relative p-4 sm:p-6"
        style={{ backgroundImage: `url(${bannerUrl})` }}
      >
        {/* Gradients for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
        <div className="absolute inset-0 bg-black/40" />

        {/* Top Right Settings Button (Only for own profile) */}
        {isMe && (
          <ProfileSettingsDrawer user={player}>
            <button 
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-1.5 sm:p-2 bg-black/50 hover:bg-[#ff5500]/80 rounded-full text-gray-300 hover:text-white backdrop-blur-md transition-all border border-gray-600/50 hover:border-[#ff5500]"
            >
              <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </ProfileSettingsDrawer>
        )}

        <div className="relative z-10 flex flex-row items-center justify-between w-full mt-4 sm:mt-0">
          
          <div className="flex flex-row gap-4 items-center w-full">
            {/* Avatar Container */}
            <div className="relative shrink-0">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-[3px] border-[#ff5500] shadow-[0_0_15px_rgba(255,85,0,0.3)]">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-gray-900 text-white font-bold text-2xl">{ign[0]}</AvatarFallback>
              </Avatar>
              

              {/* Level Badge */}
              <div className="absolute bottom-0 -right-2 bg-[#0a0a0c] border-2 border-[#ff5500] text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-20">
                78
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">{ign}</h1>
                <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20" />
              </div>
              
              <div className="flex flex-col gap-1 text-[12px] sm:text-[13px] text-gray-400 mb-2 font-medium">
                <div className="flex items-center gap-1 cursor-pointer hover:text-white">
                  <span>UID: {uid}</span>
                  <Copy className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2">
                  <span>🇮🇳 India</span>
                  <span className="text-gray-500 text-[8px]">●</span>
                  <span>Joined {joinDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[12px] mt-1">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[#00e676]' : 'bg-gray-500'}`} />
                <span className={isOnline ? 'text-gray-300 font-medium tracking-wide' : 'text-gray-500 tracking-wide'}>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>

          {/* Rank Card (Right aligned) */}
          <div className="hidden sm:flex flex-col items-center justify-center p-3 rounded-xl min-w-[120px] shrink-0">
             <div className="text-6xl mb-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">🌟</div>
             <p className="text-white font-bold text-sm">Conqueror</p>
             <div className="flex items-center gap-1 text-yellow-500 text-sm font-black mt-1">
               <Star className="w-3.5 h-3.5 fill-yellow-500" /> {points}
             </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (Below the banner area) */}
      <div className="px-3 sm:px-6 py-4 flex flex-row items-center justify-between w-full gap-2 border-t border-gray-800/50 bg-[#0a0a0c]">
        <Button className="flex-1 bg-[#ff5500] hover:bg-[#ff5500]/90 text-white font-medium text-[11px] sm:text-[13px] px-2 sm:px-6 h-[34px] rounded-lg truncate">
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" /> <span className="truncate">Download Data</span>
        </Button>
        <Button variant="outline" className="flex-1 bg-[#111115] border-[#2a2a35] text-gray-200 hover:text-white hover:bg-[#1a1a20] font-medium text-[11px] sm:text-[13px] px-2 sm:px-6 h-[34px] rounded-lg truncate">
          <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" /> <span className="truncate">Saved Squads</span>
        </Button>
      </div>

      {/* Social Stats Row */}
      <div className="px-2 sm:px-6 py-3 pb-4 bg-[#0a0a0c] border-t border-gray-800/50">
        <div className="grid grid-cols-4 gap-1 sm:gap-2 w-full">
          {/* Friends */}
          <div className="bg-[#0c0d12] border border-[#1f2029] rounded-lg p-1.5 sm:p-2.5 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-2 text-center sm:text-left">
            <Users className="w-4 h-4 sm:w-6 sm:h-6 text-gray-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[10px] text-gray-400">Friends</span>
              <span className="text-[11px] sm:text-sm font-black text-white">{player?.friends_count || 128}</span>
            </div>
          </div>
          {/* Followers */}
          <div className="bg-[#0c0d12] border border-[#1f2029] rounded-lg p-1.5 sm:p-2.5 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-2 text-center sm:text-left">
            <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[10px] text-gray-400">Followers</span>
              <span className="text-[11px] sm:text-sm font-black text-white">{player?.followers_count || '2.4K'}</span>
            </div>
          </div>
          {/* Following */}
          <div className="bg-[#0c0d12] border border-[#1f2029] rounded-lg p-1.5 sm:p-2.5 flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-2 text-center sm:text-left">
            <UserPlus className="w-4 h-4 sm:w-6 sm:h-6 text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)] shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[10px] text-gray-400">Following</span>
              <span className="text-[11px] sm:text-sm font-black text-white">{player?.following_count || 96}</span>
            </div>
          </div>
          {/* Reputation */}
          <div className="bg-[#0c0d12] border border-[#1f2029] rounded-lg p-1.5 sm:p-2.5 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
            <span className="text-[8px] sm:text-[10px] text-gray-400">Reputation</span>
            <div className="flex items-center gap-1 my-0.5">
              <Star className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-yellow-500 text-yellow-500" />
              <span className="text-[11px] sm:text-sm font-black text-white">{player?.reputation_score || 4.8}</span>
            </div>
            <span className="text-[7px] sm:text-[9px] text-[#00e676] font-medium hidden sm:block">Excellent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
