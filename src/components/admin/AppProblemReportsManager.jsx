import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppProblemReport, Notification } from '@/api/entities';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import moment from 'moment';
import { cacheInvalidateAll } from '@/lib/cache';

export default function AppProblemReportsManager() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      cacheInvalidateAll();
      const data = await AppProblemReport.filter({}, '-created_date', 100);
      setReports(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const markResolved = async (report) => {
    try {
      await AppProblemReport.update(report.id, { status: 'resolved' });
      setReports(reports.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
      
      if (report.user_id) {
        await Notification.create({
          recipient_id: report.user_id,
          title: 'Problem Resolved ✅',
          message: 'The issue you reported has been reviewed and resolved by our team. Thanks for helping us improve!',
          type: 'system',
          is_read: false
        });
      }
    } catch (e) {
      alert("Failed to update status");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#0ea5e9]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase text-white tracking-wider flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-[#0ea5e9]" />
            Report Problem in App
          </h2>
          <p className="text-gray-400 mt-1">Issues reported by users from Account Settings.</p>
        </div>
        <button 
          onClick={loadReports}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {reports.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No problems reported yet.</div>
        ) : (
          reports.map(report => (
            <Card key={report.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-800 px-3 py-1 rounded text-xs font-bold text-[#0ea5e9]">
                      UID: {report.user_uid || 'N/A'}
                    </span>
                    <span className="text-sm font-semibold text-gray-300">
                      {report.ign || 'Unknown Player'}
                    </span>
                    <span className="text-xs text-gray-600">
                      {moment(report.created_date).fromNow()}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-700 text-gray-300 text-sm whitespace-pre-wrap">
                    {report.message}
                  </div>
                </div>
                
                <div className="flex flex-col justify-center sm:items-end gap-2 shrink-0">
                  {report.status === 'resolved' ? (
                    <div className="flex items-center gap-1 text-green-500 text-sm font-bold bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                      <CheckCircle2 className="w-4 h-4" /> Resolved
                    </div>
                  ) : (
                    <button 
                      onClick={() => markResolved(report)}
                      className="bg-slate-800 hover:bg-green-600/20 border border-slate-700 hover:border-green-500/50 text-gray-400 hover:text-green-500 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
