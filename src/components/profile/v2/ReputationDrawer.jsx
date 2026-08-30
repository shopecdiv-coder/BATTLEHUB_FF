import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { ReputationLog, User } from '@/api/entities';
import { Star, ChevronLeft, TrendingUp, TrendingDown, ShieldAlert, Heart, MessageSquareWarning, ZapOff } from 'lucide-react';
import { db } from '@/api/firebaseClient';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const REASON_ICONS = {
  'Toxic Behavior': <MessageSquareWarning className="w-4 h-4 text-orange-500" />,
  'AFK': <ZapOff className="w-4 h-4 text-orange-500" />,
  'Cheating': <ShieldAlert className="w-4 h-4 text-red-500" />,
  'Good Teammate': <Heart className="w-4 h-4 text-green-500" />,
  'Default_Negative': <TrendingDown className="w-4 h-4 text-red-500" />,
  'Default_Positive': <TrendingUp className="w-4 h-4 text-green-500" />,
};

export default function ReputationDrawer({ children, user, isMe }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user?.id) return;

    setLoading(true);
    
    // Fetch Reputation Logs
    const qLogs = query(
      collection(db, 'reputation_logs'),
      where('user_id', '==', user.id)
    );

    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const parsedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(parsedLogs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reputation logs:", error);
      setLoading(false);
    });

    // Fetch Pending/Dismissed Reports
    const qReports = query(
      collection(db, 'reports'),
      where('reported_user_id', '==', user.id),
      where('type', '==', 'reputation')
    );

    const unsubReports = onSnapshot(qReports, (snap) => {
      const parsedReports = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(parsedReports.filter(r => r.status !== 'Resolved'));
    }, (error) => {
      console.error("Error fetching reports:", error);
    });

    return () => {
      unsubLogs();
      unsubReports();
    };
  }, [open, user?.id]);

  const combinedItems = [...logs, ...reports].sort((a, b) => {
    const dateA = new Date(a.timestamp || a.created_date || 0);
    const dateB = new Date(b.timestamp || b.created_date || 0);
    return dateB - dateA;
  });

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-slate-950 border-l border-slate-800 flex flex-col h-full overflow-hidden [&>button]:hidden pt-16">
        <SheetHeader className="p-4 sm:p-5 border-b border-slate-800/60 bg-[#0c0d12]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SheetClose asChild>
                <button className="p-2 -ml-2 rounded-full hover:bg-slate-800/80 transition-colors text-gray-400 focus:outline-none">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </SheetClose>
              <SheetTitle className="text-white flex items-center gap-2 text-lg">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                Reputation
              </SheetTitle>
            </div>
          </div>
          
          <div className="mt-5 flex flex-row items-center justify-between bg-gradient-to-r from-slate-900 to-slate-900/50 rounded-xl p-4 border border-slate-800/60 shadow-sm">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Current Score</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white leading-none tracking-tight">{user?.reputation_score?.toFixed(1) || '5.0'}</span>
              <span className="text-gray-500 text-sm font-semibold">/ 5.0</span>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-slate-800">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-start gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                  <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-800 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-slate-800 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : combinedItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <Star className="w-12 h-12 text-slate-800 mb-4" />
              <h3 className="text-gray-300 font-bold mb-1">{isMe ? "Clean Record" : "No History"}</h3>
              <p className="text-sm text-gray-500">
                {isMe ? "You have no reputation logs yet. Keep up the good work!" : "This player has no reputation logs."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {combinedItems.map(item => {
                const isReport = item.type === 'reputation';
                const isPositive = !isReport && item.type === 'positive';
                const Icon = isReport ? <ShieldAlert className={`w-4 h-4 ${item.status === 'Dismissed' ? 'text-gray-400' : 'text-orange-500'}`} /> : (REASON_ICONS[item.reason] || (isPositive ? REASON_ICONS['Default_Positive'] : REASON_ICONS['Default_Negative']));
                
                return (
                  <div 
                    key={item.id} 
                    className="flex items-start gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-green-500/10' : (isReport ? (item.status === 'Dismissed' ? 'bg-gray-500/10' : 'bg-orange-500/10') : 'bg-red-500/10')}`}>
                      {Icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-200 text-sm">
                          {isReport ? `Reported: ${item.reason}` : item.reason}
                        </span>
                        <span className={`text-xs font-bold ${isPositive ? 'text-green-500' : (isReport ? (item.status === 'Dismissed' ? 'text-gray-500' : 'text-orange-500') : 'text-red-500')}`}>
                          {isReport ? item.status : `${isPositive ? '+' : ''}${item.change_amount}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-500">
                          {formatDate(item.timestamp || item.created_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
