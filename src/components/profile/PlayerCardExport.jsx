import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Share2, Download, Star, Shield, Target, Skull, Swords, Zap, CheckCircle2, Copy, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerCardExport({ player = {}, stats = {}, inline = false }) {
  const cardRef = useRef(null);
  const containerRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [scale, setScale] = useState(1);
  const [cardHeight, setCardHeight] = useState(450);
  const [isOpen, setIsOpen] = useState(false);

  // Smooth scroll-to-scale animation linked exactly to page scroll
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 95%", "center center"]
  });
  
  const scrollScale = useTransform(scrollYProgress, [0, 1], [0.65, 1]);

  useEffect(() => {
    if (!inline || !containerRef.current) return;
    
    // Initial measurement
    if (cardRef.current) {
      setCardHeight(cardRef.current.offsetHeight);
    }

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Calculate scale to fit 800px card into container width
        const width = entry.contentRect.width;
        setScale(Math.min(width / 800, 1));
        
        // Ensure height is always accurate
        if (cardRef.current) {
          setCardHeight(cardRef.current.offsetHeight);
        }
      }
    });
    observer.observe(containerRef.current);
    
    // Also observe the card itself in case its content changes height
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    
    return () => observer.disconnect();
  }, [inline]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    toast.info("Generating Signature Card...");
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // High quality
        useCORS: true,
        backgroundColor: '#0a0a0c',
        logging: false
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `BattleHub_${player.ign || 'Player'}_Card.png`;
      link.click();
      toast.success("Card downloaded successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate card");
    }
    setDownloading(false);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    toast.info("Preparing card for sharing...");
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0a0a0c',
        logging: false
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to generate image.");
          return;
        }
        const file = new File([blob], `BattleHub_${player.ign || 'Card'}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'My Profile Card',
            text: 'this is my battlehub ff card see my profile',
            files: [file],
          });
        } else {
          toast.error("Your device doesn't support sharing files. Try downloading instead!");
        }
      }, 'image/png');
    } catch (e) {
      console.error(e);
      toast.error("Failed to share card");
    }
  };


  const cardElement = (
    <div 
      ref={cardRef} 
      className="w-[800px] relative p-[3px] rounded-[32px] drop-shadow-[0_0_25px_rgba(251,146,60,0.3)]"
    >
      {/* Gradient Border Wrapper */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#fb923c] via-[#fdba74] to-[#fb923c] rounded-[32px] opacity-100 z-0" />
      
      {/* Main Card Background */}
      <div 
        className="w-full h-full relative z-10 p-8 flex flex-col gap-6 bg-[#0a0a0c] bg-cover bg-center rounded-[29px]"
        style={{ 
          backgroundImage: `linear-gradient(to bottom right, rgba(10,10,12,0.95), rgba(0,0,0,0.98), rgba(251,146,60,0.08)), url('YOUR_IMAGE_URL_HERE')` 
        }}
      >
        
        {/* Top Section */}
        <div className="flex justify-between items-start">
          
          {/* Left: Avatar & Info */}
          <div className="flex gap-8">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-b from-white to-[#fb923c]">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#0a0a0c] bg-black">
                  {player.avatar_url ? (
                    <img src={player.avatar_url} alt="Avatar" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#fb923c] to-orange-600 text-4xl font-black text-white">
                      {(player.ign?.[0] || player.username?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              {/* Level Badge (replaces Rank) */}
              <div className="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 bg-[#fb923c] text-white text-[11px] font-black px-3 py-1 rounded-full shadow-[0_0_15px_rgba(251,146,60,0.6)] whitespace-nowrap border-2 border-[#0a0a0c] flex items-center gap-1 z-20">
                <Star className="w-3 h-3 fill-white" />
                LVL {player.level || '125'}
              </div>
            </div>

            {/* Player Info */}
            <div className="flex flex-col justify-center pt-2">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-4xl font-black text-white">{player.ign || player.username || 'GUEST_PLAYER'}</h2>
                <CheckCircle2 className="w-6 h-6 text-[#fb923c] fill-[#fb923c]/20" />
              </div>
              <div className="flex items-center gap-2 mb-4 mt-3">
                <span className="text-white/80 font-mono text-sm">BATTLEHUB ID: {player.unique_id || player.id?.substring(0,8) || 'BH7X9K2M1'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🇮🇳</span>
                <span className="text-white font-medium">India</span>
                <span className="text-white/40 text-[8px] mx-1">●</span>
                <span className="text-white/80 font-medium text-sm">Joined {player?.created_at ? new Date(player.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "May 2023"}</span>
              </div>
            </div>
          </div>

          {/* Right: Logo */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-white italic">BATTLEHUB <span className="text-[#fb923c]">FF</span></span>
            </div>
          </div>
        </div>

        {/* Middle Section: Stats Grid */}
        <div className="grid grid-cols-5 gap-4 border border-[#fb923c]/20 rounded-2xl p-5 bg-black/40 backdrop-blur-sm mt-2">
          {/* Followers */}
          <div className="border-r border-white/10 pr-4">
            <p className="text-white/80 text-[10px] font-bold mb-3">FOLLOWERS</p>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#fb923c]" />
              <span className="text-xl font-black text-white">{player.followers_count || '2.45K'}</span>
            </div>
          </div>
          {/* Reputation */}
          <div className="border-r border-white/10 pr-4">
            <p className="text-white/80 text-[10px] font-bold mb-3">REPUTATION</p>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#fb923c] fill-[#fb923c]" />
              <span className="text-xl font-black text-white">{player.reputation_score || '4.8'}</span>
            </div>
          </div>
          {/* Win Rate */}
          <div className="border-r border-white/10 pr-4">
            <p className="text-white/80 text-[10px] font-bold mb-3">WIN RATE</p>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#fb923c]" />
              <span className="text-xl font-black text-white">{stats?.winRate || '30.6'}%</span>
            </div>
          </div>
          {/* Total Kills */}
          <div className="border-r border-white/10 pr-4">
            <p className="text-white/80 text-[10px] font-bold mb-3">TOTAL KILLS</p>
            <div className="flex items-center gap-2">
              <Skull className="w-5 h-5 text-[#fb923c]" />
              <span className="text-xl font-black text-white">{stats?.kd || '8,540'}</span>
            </div>
          </div>
          {/* Total Matches */}
          <div>
            <p className="text-white/80 text-[10px] font-bold mb-3">TOTAL MATCHES</p>
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-[#fb923c]" />
              <span className="text-xl font-black text-white">{stats?.matches || '842'}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex justify-between items-end border border-[#fb923c]/20 rounded-2xl p-5 bg-black/60 backdrop-blur-sm relative overflow-hidden">
          {/* Background image for bottom section */}
          <div 
            className="absolute inset-0 opacity-10 bg-cover bg-center" 
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop)' }} 
          />
          
          <div className="relative z-10 max-w-md">
            <p className="text-white/80 text-[10px] font-bold mb-2">PLAYING STYLE</p>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-6 h-6 text-[#fb923c] fill-[#fb923c]" />
              <span className="text-2xl font-black text-white">RUSHER</span>
            </div>
            <p className="text-sm text-white/90 leading-relaxed font-medium">
              {player.bio || 'Aggressive player who loves to take fights and lead the way to victory.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="w-full mt-2 mb-4" ref={containerRef}>
        <div className="flex flex-col items-center justify-center w-full relative">
          <div className="flex justify-center w-full relative z-10">
            <div 
              className="origin-top"
              style={{ transform: `scale(${scale})`, height: `${cardHeight * scale}px` }}
            >
              {cardElement}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="w-full bg-[#fb923c] hover:bg-[#fb923c]/90 text-white shadow-lg font-bold">
          <Share2 className="w-4 h-4 mr-2" /> Share Card
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-[#0a0a0c] border-gray-800 text-white outline-none">
        <DrawerHeader className="text-center pt-6 pb-2">
          <DrawerTitle className="text-2xl font-black italic tracking-wider text-white/40 uppercase">MY CARD</DrawerTitle>
          <DrawerDescription className="text-white/80 text-sm mt-2 font-medium">
            this is my battlehub ff card see my profile
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex justify-center my-6 overflow-hidden w-full">
          <div 
            className="origin-top"
            style={{ transform: 'scale(0.42)', marginBottom: '-260px' }}
          >
            {cardElement}
          </div>
        </div>

        <DrawerFooter className="flex-row justify-center gap-4 px-6 pb-10">
          <Button 
            onClick={handleDownload} 
            disabled={downloading}
            className="flex-1 bg-transparent border border-white/20 hover:bg-white/10 text-white font-bold h-12 rounded-xl text-[15px]"
          >
            {downloading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
            ) : (
              <Download className="w-5 h-5 mr-2" />
            )}
            {downloading ? 'Saving...' : 'Download'}
          </Button>
          <Button className="flex-1 bg-transparent border border-white/20 hover:bg-white/10 text-white font-bold h-12 rounded-xl text-[15px]">
            <Share2 className="w-5 h-5 mr-2" /> Share
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
