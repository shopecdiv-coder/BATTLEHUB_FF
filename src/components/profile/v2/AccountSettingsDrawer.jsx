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
        className="w-full h-[60vh] sm:h-[50vh] bg-[#0a0a0c] border-t border-[#1f2029] rounded-t-3xl p-0 flex flex-col z-50 overflow-hidden [&>button]:bg-[#111115] [&>button]:text-white [&>button]:p-2 [&>button]:rounded-lg [&>button]:border [&>button]:border-[#2a2a35] [&>button:hover]:bg-[#ff5500] [&>button:hover]:border-[#ff5500] [&>button]:transition-all [&>button]:right-6 [&>button]:top-6 [&>button]:shadow-lg"
      >
        <SheetHeader className="p-6 border-b border-[#1f2029] bg-[#0c0d12]">
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase text-left pr-10">
            Account Settings
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8">
          
          {/* Privacy & Data Section */}
          <div className="space-y-4">
            <h4 className="text-[#ff5500] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4" /> Privacy & Data
            </h4>
            
            <div className="space-y-4 bg-[#111115] border border-[#1f2029] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 pr-4">
                  <label className="text-sm text-white font-semibold uppercase tracking-wider">Private Account</label>
                  <p className="text-xs text-gray-500">Hide your friends, followers, and following list from other users.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_private: !prev.is_private }))}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${formData.is_private ? 'bg-[#ff5500]' : 'bg-gray-700'}`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full absolute transition-transform ${formData.is_private ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
              
              <div className="pt-4 border-t border-[#1f2029]">
                <div className="space-y-1 mb-3">
                  <label className="text-sm text-white font-semibold uppercase tracking-wider">Download My Data</label>
                  <p className="text-xs text-gray-500">Get a PDF report containing all your Battlehub account data and history.</p>
                </div>
                <button
                  onClick={downloadMyData}
                  disabled={generatingPdf}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1a20] hover:bg-[#2a2a35] border border-[#2a2a35] text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                >
                  {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
                  {generatingPdf ? 'Generating PDF...' : 'Download Data'}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-6 border-t border-[#1f2029] bg-[#0c0d12] flex gap-4">
          <button 
            onClick={() => setOpen(false)}
            className="flex-1 py-3 bg-[#111115] border border-[#2a2a35] hover:bg-[#1a1a20] rounded-xl text-white font-bold transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-[#ff5500] hover:bg-[#ff6600] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-black flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,85,0,0.3)]"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null} 
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        
      </SheetContent>
    </Sheet>
  );
}
