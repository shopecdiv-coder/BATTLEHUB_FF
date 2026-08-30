import React, { useState, useEffect } from "react";
import { FAQ } from "@/entities/FAQ";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Trophy, Gamepad2, Coins, Sword, AlertCircle, ArrowLeft, Search, ChevronRight } from "lucide-react";

export default function FAQs() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      const allFAQs = await FAQ.filter({ is_active: true }, "order");
      setFaqs(allFAQs || []);
    } catch (error) {
      console.error("Error loading FAQs:", error);
    }
    setLoading(false);
  };

  const categories = [
    { name: "Prizes", icon: Trophy, label: "Prizes & Rewards", desc: "Withdrawals, prize pools & history" },
    { name: "Gameplay", icon: Gamepad2, label: "Gameplay & Rules", desc: "Tournaments, disconnects & rules" },
    { name: "Coins", icon: Coins, label: "Coins & Wallet", desc: "BH Coins, diamonds & wallet help" },
    { name: "Matches", icon: Sword, label: "Matches & Rooms", desc: "Joining rooms, codes & squads" },
    { name: "Support", icon: AlertCircle, label: "Support & Accounts", desc: "Account setup, bans & tickets" }
  ];

  const getCategoryIcon = (categoryName) => {
    const cat = categories.find(c => c.name === categoryName);
    return cat ? cat.icon : HelpCircle;
  };

  // Filter FAQs by search query globally
  const searchedFAQs = faqs.filter(faq => {
    return (
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Filter FAQs for active category (when not searching)
  const categoryFAQs = faqs.filter(faq => faq.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-3 pb-16 ">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-3 pt-1 pb-1">
             <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse" />
             <div className="h-5 w-24 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="h-12 w-full bg-white/5 rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[1, 2, 3, 4].map(i => (
               <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 h-28 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="h-4 w-16 bg-white/10 rounded" />
               </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 1. Render Search Results View (when user is typing)
  if (searchQuery.trim() !== "") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-3 pb-16 ">
        <div className="max-w-xl mx-auto space-y-4">
          
          {/* Header Row with title and clear button */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setSearchQuery("")}
                variant="ghost"
                className="text-slate-400 hover:text-white px-2.5 h-9 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 transition-all rounded-xl text-xs font-bold"
              >
                Clear Search
              </Button>
              <h1 className="text-base font-black text-white tracking-wide uppercase">
                Search Results
              </h1>
            </div>
            <span className="text-[10px] font-mono text-slate-500 font-bold">
              {searchedFAQs.length} Found
            </span>
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-slate-900/30 border-slate-900 rounded-2xl text-slate-200 placeholder:text-slate-500 focus:border-orange-600/30 focus:bg-slate-900/50 transition-all text-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          </div>

          <div className="pt-1">
            {searchedFAQs.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/10 border border-slate-900 rounded-2xl">
                <HelpCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-medium">No results found for "{searchQuery}"</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {searchedFAQs.map((faq, index) => (
                  <AccordionItem 
                    key={faq.id} 
                    value={`search-item-${index}`}
                    className="bg-slate-900/20 rounded-xl border border-slate-900/60 px-3 transition-all duration-300 hover:border-slate-800/40 hover:bg-slate-900/30 data-[state=open]:bg-slate-900/40 data-[state=open]:border-slate-800/60"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-3">
                      <div className="flex flex-col gap-1 pr-2 flex-1">
                        <p className="text-slate-200 font-bold text-xs tracking-wide leading-relaxed">
                          {faq.question}
                        </p>
                        <span className="self-start text-[8px] uppercase tracking-wider font-extrabold text-orange-500/80">
                          {faq.category}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-400 text-xs leading-relaxed pt-1 pb-3 whitespace-pre-wrap border-t border-slate-900/50 mt-1">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Category-Specific View
  if (activeCategory) {
    const ActiveIcon = getCategoryIcon(activeCategory);
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-3 pb-16 ">
        <div className="max-w-xl mx-auto space-y-4">
          
          {/* Compact Header Row */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setActiveCategory(null)}
                variant="ghost"
                className="text-slate-400 hover:text-white px-2.5 h-9 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 transition-all rounded-xl text-xs font-bold"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back
              </Button>
              <h1 className="text-base font-black text-white tracking-wide uppercase">
                {activeCategory}
              </h1>
            </div>
            <div className="flex items-center gap-1 bg-orange-600/5 border border-orange-600/10 px-2 py-0.5 rounded-lg">
              <ActiveIcon className="w-3 h-3 text-orange-500" />
              <span className="text-[9px] uppercase tracking-widest font-black text-orange-500 font-mono">
                Topic
              </span>
            </div>
          </div>

          {/* Accordion Questions List */}
          {categoryFAQs.length === 0 ? (
            <div className="p-6 text-center bg-slate-900/10 border border-slate-900 rounded-2xl">
              <HelpCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-xs font-medium">No questions in this category yet.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {categoryFAQs.map((faq, index) => (
                <AccordionItem 
                  key={faq.id} 
                  value={`cat-item-${index}`}
                  className="bg-slate-900/20 rounded-xl border border-slate-900/60 px-3 transition-all duration-300 hover:border-slate-800/40 hover:bg-slate-900/30 data-[state=open]:bg-slate-900/40 data-[state=open]:border-slate-800/60"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-3">
                    <p className="text-slate-200 font-bold text-xs tracking-wide leading-relaxed pr-2">
                      {faq.question}
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-400 text-xs leading-relaxed pt-1 pb-3 whitespace-pre-wrap border-t border-slate-900/50 mt-1">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    );
  }

  // 3. Render Main Categories Grid (Default view)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 pb-16 ">
      <div className="max-w-xl mx-auto space-y-4">
        
        {/* Top Header Row with Title */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              className="text-slate-400 hover:text-white px-2.5 h-9 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 transition-all rounded-xl text-xs font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back
            </Button>
            <h1 className="text-lg font-black text-white tracking-wide uppercase">
              FAQs
            </h1>
          </div>
          <span className="text-[9px] uppercase tracking-widest font-black text-slate-600 font-mono">
            Help Center
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-slate-900/30 border-slate-900 rounded-2xl text-slate-200 placeholder:text-slate-500 focus:border-orange-600/30 focus:bg-slate-900/50 transition-all text-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        </div>

        {/* Categories Grid layout */}
        <div className="grid grid-cols-1 gap-2.5 pt-1">
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            const count = faqs.filter(f => f.category === cat.name).length;
            
            return (
              <Card 
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className="bg-slate-900/20 hover:bg-slate-900/30 border-slate-900/60 hover:border-slate-800 transition-all duration-300 rounded-xl cursor-pointer group shadow-sm active:scale-[0.99]"
              >
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      <CatIcon className="w-4 h-4 text-orange-500 group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                        {cat.label}
                      </h3>
                      <p className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {count > 0 && (
                      <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-850 text-slate-550 text-slate-500">
                        {count}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-800 group-hover:text-slate-500 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
