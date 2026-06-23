import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Flame, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function HeroSection({ user }) {
  return (
    <div className="relative overflow-hidden glass-card border-2 border-[#00FFFF]/30 rounded-3xl mb-12">
      {/* Animated background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00FFFF]/10 via-[#0A0A1A] to-[#FF004C]/10"></div>
      <div className="absolute top-10 right-10 w-64 h-64 bg-[#00FFFF]/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#FF004C]/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      
      <div className="max-w-7xl mx-auto px-8 py-20 md:py-32 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-8"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-card border-2 border-[#00FFFF]/30 text-[#00FFFF] text-sm font-bold mb-6">
            <Flame className="w-5 h-5 animate-pulse" />
            <span className="tracking-wider">FREE FIRE TOURNAMENT PLATFORM</span>
            <Zap className="w-5 h-5 animate-pulse" />
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFFF] via-[#00CCFF] to-[#FF004C] animate-gradient">
              SURVIVE. FIGHT. CONQUER.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-[#A0A0A0] max-w-3xl mx-auto font-medium leading-relaxed">
            Join India's most competitive Free Fire tournament platform.<br />
            <span className="text-[#00FFFF]">Fair play guaranteed</span>, <span className="text-[#FFD700]">real prizes</span>, <span className="text-[#00FF88]">anti-cheat protection</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            {user ? (
              <>
                <Link to={createPageUrl("Tournaments")}>
                  <Button size="lg" className="bg-gradient-to-r from-[#00FFFF] to-[#0088FF] hover:from-[#00CCFF] hover:to-[#0066CC] text-white font-bold px-10 py-6 text-lg rounded-xl hover-lift">
                    <Trophy className="w-6 h-6 mr-3" />
                    Browse Tournaments
                  </Button>
                </Link>
                {user.role === 'admin' && (
                  <Link to={createPageUrl("CreateTournament")}>
                    <Button size="lg" className="glass-card border-2 border-[#00FFFF]/50 text-[#00FFFF] hover:bg-[#00FFFF]/10 px-10 py-6 text-lg font-bold rounded-xl hover-lift">
                      <Plus className="w-6 h-6 mr-3" />
                      Create Tournament
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <Link to="/auth/login">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-[#00FFFF] to-[#0088FF] hover:from-[#00CCFF] hover:to-[#0066CC] text-white font-bold px-10 py-6 text-lg rounded-xl hover-lift"
                >
                  <Flame className="w-6 h-6 mr-3" />
                  Get Started
                </Button>
              </Link>
            )}
          </div>

          {/* Stats preview */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-12 flex justify-center gap-12 text-sm flex-wrap"
          >
            <div className="text-center group">
              <div className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00FFFF] to-[#0088FF] group-hover:scale-110 transition-transform">500+</div>
              <div className="text-[#A0A0A0] font-semibold mt-1">Active Players</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF004C] to-[#FF0088] group-hover:scale-110 transition-transform">50+</div>
              <div className="text-[#A0A0A0] font-semibold mt-1">Tournaments</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF8800] group-hover:scale-110 transition-transform">₹1L+</div>
              <div className="text-[#A0A0A0] font-semibold mt-1">Prize Pool</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}