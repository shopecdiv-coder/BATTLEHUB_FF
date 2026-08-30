import React, { useState, useRef } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Shield, Download as DownloadIcon, Loader2 } from 'lucide-react';
import { User } from '@/entities/User';
import { AppProblemReport } from '@/api/entities';
import DataReportGenerator from "@/components/profile/DataReportGenerator";

export default function AccountSettingsDrawer({ children, user }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Safe fallbacks for form fields
  const [formData, setFormData] = useState({
    is_private: user?.is_private || false
  });

  const pdfRef = useRef(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [problemText, setProblemText] = useState("");
  const [submittingProblem, setSubmittingProblem] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  const handleSubmitProblem = async () => {
    if (!problemText.trim()) return;
    setSubmittingProblem(true);
    try {
      await AppProblemReport.create({
        user_id: user?.id,
        user_uid: user?.unique_id,
        ign: user?.ign,
        message: problemText,
        status: 'pending'
      });
      alert('Report submitted successfully! Thank you.');
      setProblemText("");
      setShowReportForm(false);
    } catch(err) {
      alert('Failed to submit report');
    } finally {
      setSubmittingProblem(false);
    }
  };

  const downloadMyData = async () => {
    if (!pdfRef.current) return;
    setGeneratingPdf(true);
    const success = await pdfRef.current.generatePDF();
    setGeneratingPdf(false);
    if (success) {
      alert('✅ PDF Downloaded Successfully!');
    } else {
      alert('❌ Failed to generate PDF');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await User.updateMyUserData(formData);
      setOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      <DataReportGenerator ref={pdfRef} />
      <SheetContent 
        side="bottom" 
        className="w-full h-[60vh] sm:h-[50vh] bg-slate-950 border-t border-slate-800 rounded-t-3xl p-0 flex flex-col z-[100] pb-16 sm:pb-0 overflow-hidden [&>button]:bg-slate-900 [&>button]:text-white [&>button]:p-2 [&>button]:rounded-lg [&>button]:border [&>button]:border-slate-700 [&>button:hover]:bg-[#0ea5e9] [&>button:hover]:border-[#0ea5e9] [&>button]:transition-all [&>button]:right-6 [&>button]:top-6 [&>button]:shadow-lg"
      >
        <SheetHeader className="p-6 border-b border-slate-800 bg-[#0c0d12]">
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase text-left pr-10">
            Account Settings
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8">


          {/* Privacy & Data Section */}
          <div className="space-y-4">
            <h4 className="text-[#0ea5e9] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4" /> Privacy & Data
            </h4>
            
            <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 pr-4">
                  <label className="text-sm text-white font-semibold uppercase tracking-wider">Private Account</label>
                  <p className="text-xs text-gray-500">Hide your profile picture, friends, followers, and following list from other users.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_private: !prev.is_private }))}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${formData.is_private ? 'bg-[#0ea5e9]' : 'bg-gray-700'}`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full absolute transition-transform ${formData.is_private ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
              
              <div className="pt-4 border-t border-slate-800">
                <div className="space-y-1 mb-3">
                  <label className="text-sm text-white font-semibold uppercase tracking-wider">Download My Data</label>
                  <p className="text-xs text-gray-500">Get a PDF report containing all your Battlehub account data and history.</p>
                </div>
                <button
                  onClick={downloadMyData}
                  disabled={generatingPdf}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-[#2a2a35] border border-slate-700 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                  {generatingPdf ? 'Generating PDF...' : 'Download Data'}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="space-y-1 mb-3">
                  <label className="text-sm text-[#0ea5e9] font-semibold uppercase tracking-wider">Report A Problem</label>
                  <p className="text-xs text-gray-500">Found a bug or issue in the app? Let us know below.</p>
                </div>
                {!showReportForm ? (
                  <button
                    onClick={() => setShowReportForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-[#2a2a35] border border-slate-700 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    Report an Issue
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea 
                      value={problemText}
                      onChange={(e) => setProblemText(e.target.value)}
                      placeholder="Describe the issue..."
                      className="w-full bg-slate-900 border border-slate-700 focus:border-[#0ea5e9] rounded-lg p-3 text-sm text-white resize-none outline-none h-20"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowReportForm(false);
                          setProblemText("");
                        }}
                        disabled={submittingProblem}
                        className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitProblem}
                        disabled={submittingProblem || !problemText.trim()}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 text-[#0ea5e9] border border-[#0ea5e9]/20 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                      >
                        {submittingProblem ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {submittingProblem ? 'Submitting...' : 'Submit Report'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-800 bg-[#0c0d12] flex gap-4">
          <button 
            onClick={() => setOpen(false)}
            className="flex-1 py-3 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-xl text-white font-bold transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-[#0ea5e9] hover:bg-[#38bdf8] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-black flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,85,0,0.3)]"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null} 
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        
      </SheetContent>
    </Sheet>
  );
}
