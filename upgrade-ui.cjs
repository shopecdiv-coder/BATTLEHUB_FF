const fs = require('fs');

const file = 'e:\\BATTLEHUB  3.0\\src\\pages\\CreateTournament.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Upgrade main backgrounds and cards
content = content.replace(/bg-slate-950/g, 'bg-[#050505]'); // True premium dark background
content = content.replace(/bg-slate-900/g, 'bg-[#0f0f0f]'); // Card backgrounds
content = content.replace(/border-slate-800/g, 'border-white/[0.08]'); // Subtle borders
content = content.replace(/shadow-xl/g, 'shadow-2xl shadow-black/50'); // Deeper shadows

// 2. Upgrade text colors
content = content.replace(/text-slate-400/g, 'text-zinc-400');
content = content.replace(/text-slate-300/g, 'text-zinc-300');
content = content.replace(/text-slate-200/g, 'text-zinc-200');
content = content.replace(/text-slate-100/g, 'text-zinc-100');
content = content.replace(/text-slate-500/g, 'text-zinc-500');

// 3. Upgrade inputs & buttons
// Make inputs taller and borders more premium
content = content.replace(/className="bg-\[\#050505\] border-white\/\[0.08\] text-zinc-100 h-11/g, 'className="bg-black/50 border-white/[0.1] text-zinc-100 h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 hover:bg-black/80 transition-colors');
content = content.replace(/className="bg-\[\#050505\] border-white\/\[0.08\] text-zinc-100 h-12/g, 'className="bg-black/50 border-white/[0.1] text-zinc-100 h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500/50 hover:bg-black/80 transition-colors');
content = content.replace(/className="bg-\[\#050505\] border-indigo-500\/50 text-zinc-100 h-11/g, 'className="bg-black/50 border-indigo-500/50 text-zinc-100 h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500/50 hover:bg-black/80 transition-colors');

// Taller select triggers
content = content.replace(/className="bg-\[\#050505\] border-white\/\[0.08\] text-zinc-200 h-11/g, 'className="bg-black/50 border-white/[0.1] text-zinc-200 h-12 rounded-xl hover:bg-black/80 transition-colors');
content = content.replace(/className="bg-\[\#050505\] border-white\/\[0.08\] text-zinc-200 h-11 w-44 shrink-0/g, 'className="bg-black/50 border-white/[0.1] text-zinc-200 h-12 w-44 rounded-xl shrink-0 hover:bg-black/80 transition-colors');
content = content.replace(/className="bg-\[\#050505\] border-white\/\[0.08\] text-zinc-200 h-11 w-full font-medium/g, 'className="bg-black/50 border-white/[0.1] text-zinc-200 h-12 w-full font-medium rounded-xl hover:bg-black/80 transition-colors');

// 4. Specifically overhaul Step 1 Screen completely for a massive WOW effect
const step1Regex = /\/\/ STEP 1: Format Selection Screen[\s\S]*?(?=\/\/ STEP 2: Concise Form Fill Screen)/;
const premiumStep1 = `// STEP 1: Format Selection Screen
  if (selectedFormat === null) {
    return (
      <div className="min-h-screen bg-[#030303] p-4 md:p-8 font-sans text-zinc-200 selection:bg-indigo-500/30 flex items-center justify-center relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
          
          <div className="text-center space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(createPageUrl("Tournaments"))} 
              className="text-zinc-500 hover:text-white bg-transparent hover:bg-white/5 mb-4 rounded-full h-8 px-4 text-xs font-medium inline-flex items-center gap-2 border border-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Tournaments
            </Button>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              Create Tournament
            </h1>
            <p className="text-sm md:text-base text-zinc-400 max-w-lg mx-auto font-medium">
              Select a format to start setting up your esports tournament. Our smart wizard will guide you through the setup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 px-4">
            <button
              type="button"
              onClick={() => selectFormatAndProceed("single")}
              className="group relative p-8 rounded-[2rem] bg-[#0a0a0a] border border-white/[0.05] hover:border-indigo-500/50 text-left transition-all duration-500 overflow-hidden shadow-2xl hover:shadow-indigo-500/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col gap-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                  ⚡
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-white tracking-tight mb-2">Single Match</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                    1 Direct Custom Room match. Perfect for quick scrims, daily practices, or instant cash matches.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectFormatAndProceed("multi")}
              className="group relative p-8 rounded-[2rem] bg-[#0a0a0a] border border-white/[0.05] hover:border-amber-500/50 text-left transition-all duration-500 overflow-hidden shadow-2xl hover:shadow-amber-500/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex flex-col gap-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                  🏆
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-white tracking-tight mb-2">Multi-Group League</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                    Massive scale tournaments. Host 48 to 10,000+ teams with automated parallel hosts and multi-stage qualifiers.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  `;
content = content.replace(step1Regex, premiumStep1);

// 5. Overhaul Step 2 Header
const step2Regex = /<motion\.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-white\/\[0\.08\]">[\s\S]*?(?=<\/motion\.div>)/;
const premiumStep2Header = `<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSelectedFormat(null)} 
              className="text-zinc-400 hover:text-white bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.08] shrink-0 h-12 w-12 rounded-xl transition-colors"
              title="Change Format"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Setup {selectedFormat === "single" ? "Single Match" : "Multi-Group League"}
              </h1>
              <button 
                type="button" 
                onClick={() => setSelectedFormat(null)} 
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                ← Switch Format
              </button>
            </div>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting || uploadingBanner}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold px-8 h-12 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] transition-all shrink-0 w-full sm:w-auto text-sm"
          >
            {submitting ? "Publishing..." : "Publish Tournament 🚀"}
          </Button>`;
content = content.replace(step2Regex, premiumStep2Header);


fs.writeFileSync(file, content);
console.log("Premium UI upgrade complete.");
