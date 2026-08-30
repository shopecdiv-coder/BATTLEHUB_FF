import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, X, ArrowLeft, Share2, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import html2canvas from 'html2canvas';

const LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5NzMxNiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJIPC90ZXh0Pjwvc3ZnPg==";
const SIGNATURE_BASE64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iODAiPjx0ZXh0IHg9IjEwMCIgeT0iNTAiIGZvbnQtZmFtaWx5PSInQnJ1c2ggU2NyaXB0IE1UJywgY3Vyc2l2ZSIgZm9udC1zaXplPSIzNSIgZmlsbD0iYmxhY2siIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNoaXZhbSBLdW1hcjwvdGV4dD48L3N2Zz4=";

export default function RegistrationInvoiceDownload({ registration, tournament, className, variant, size }) {
  const containerRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const generateInvoice = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current) return;
    setGenerating(true);
    
    try {
      await new Promise(r => setTimeout(r, 200));
      
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      setPreviewImage(imgData);
      setGenerating(false);
    } catch (err) {
      console.error("Image generation failed:", err);
      alert("Failed to generate invoice image.");
      setGenerating(false);
    }
  };

  const invoiceNo = `REG-${registration.id?.slice(-8).toUpperCase() || "UNKNOWN"}`;

  const handleSaveToPhotos = () => {
    if (!previewImage) return;
    const fileName = `${invoiceNo}.jpg`;
    
    if (window.AndroidBridge && window.AndroidBridge.downloadBase64) {
      window.AndroidBridge.downloadBase64(previewImage, "image/jpeg", fileName);
    } else {
      const link = document.createElement("a");
      link.href = previewImage;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShareReceipt = async () => {
    if (!previewImage) return;

    const fileName = `${invoiceNo}.jpg`;
    const shareTitle = `BattleHub Receipt - ${invoiceNo}`;
    const shareText = `Check out my BattleHub Tournament Registration Receipt (${invoiceNo})! 🔥`;

    // 1. Android App WebBridge integration (if running inside Android app wrapper)
    if (window.AndroidBridge) {
      if (typeof window.AndroidBridge.shareBase64 === 'function') {
        window.AndroidBridge.shareBase64(previewImage, "image/jpeg", fileName);
        return;
      }
      if (typeof window.AndroidBridge.shareImage === 'function') {
        window.AndroidBridge.shareImage(previewImage);
        return;
      }
      if (typeof window.AndroidBridge.shareText === 'function') {
        window.AndroidBridge.shareText(shareText);
        return;
      }
    }

    // 2. Native System Web Share API with image file (Supported on Chrome Mobile, Safari iOS, etc.)
    try {
      const res = await fetch(previewImage);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText,
        });
        return;
      }
    } catch (err) {
      console.log("File share fallback triggered:", err);
    }

    // 3. Fallback to basic Web Share (Text & URL) if file sharing isn't permitted by browser security
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err) {
        console.log("Share cancelled or unsupported:", err);
      }
    }

    // 4. Fallback: Save to photos if Web Share API is completely unavailable
    handleSaveToPhotos();
  };

  const entryFee = tournament?.entry_fee || "Free";
  const members = registration.team_members || [];

  // Format Leader BH ID
  const rawLeaderId = registration.team_leader_id || registration.user_id || "";
  const battlehubId = rawLeaderId 
    ? (String(rawLeaderId).toUpperCase().startsWith("BH") ? String(rawLeaderId).toUpperCase() : `BH${String(rawLeaderId).slice(-7).toUpperCase()}`)
    : "BH9552822";

  return (
    <>
      <div onClick={(e) => e.stopPropagation()}>
        <Button
          size={size || "sm"}
          variant={variant || "outline"}
          onClick={generateInvoice}
          disabled={generating}
          className={className || "border-purple-500/50 text-purple-400 hover:bg-purple-500/10 gap-1 mt-2"}
          title="Download Registration Receipt"
        >
          {generating ? <Download className="w-3.5 h-3.5 animate-bounce" /> : <FileText className="w-3.5 h-3.5" />}
          {generating ? "Generating..." : "Download Receipt"}
        </Button>
      </div>

      {/* Hidden Render Container */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -9999, opacity: 0, pointerEvents: 'none' }}>
        <div ref={containerRef} style={{ width: '750px', backgroundColor: '#ffffff', color: '#0f172a', padding: '40px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
          
          {/* Diagonal Background Dim Watermark */}
          <div style={{ position: 'absolute', top: '48%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: '110px', fontWeight: '900', color: '#0f172a', opacity: 0.05, pointerEvents: 'none', zIndex: 0, letterSpacing: '14px', userSelect: 'none', whiteSpace: 'nowrap' }}>
            BATTLEHUB
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Header Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f172a', paddingBottom: '16px', marginBottom: '22px' }}>
              <div>
                <div style={{ margin: '0 0 6px 0' }}>
                  <span style={{ backgroundColor: '#f59e0b', color: '#0f172a', fontWeight: '900', padding: '6px 14px', borderRadius: '8px', fontSize: '20px', letterSpacing: '1.5px', display: 'inline-block' }}>
                    BATTLEHUB
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Official Tournament Registration E-Receipt</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>Support: helpbattlehub@gmail.com</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ backgroundColor: '#10b98115', border: '1px solid #10b98150', color: '#047857', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-block', marginBottom: '8px' }}>
                  ✓ PAYMENT SUCCESSFUL
                </div>
                <p style={{ margin: '0', fontSize: '13px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>{invoiceNo}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>Issued: {format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'flex', gap: '18px', marginBottom: '22px' }}>
              {/* Squad Info Card */}
              <div style={{ flex: '1', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>SQUAD INFORMATION</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {registration.team_logo ? (
                    <img src={registration.team_logo} alt="Logo" style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }} crossOrigin="anonymous" />
                  ) : (
                    <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: '#64748b' }}>🏆</div>
                  )}
                  <div>
                    <h3 style={{ margin: '0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{registration.team_name}</h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#0f172a', fontWeight: '700' }}>
                      BattleHub ID: <span style={{ fontFamily: 'monospace', color: '#d97706' }}>{battlehubId}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Info Card */}
              <div style={{ flex: '1', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>TOURNAMENT & PAYMENT</p>
                <p style={{ margin: '0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{tournament?.title || registration.tournament_title || "Free Fire Tournament"}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>Entry Fee Paid:</span>
                  <span style={{ fontWeight: '800', color: '#d97706' }}>{entryFee === "Free" ? "FREE" : `${entryFee} BH Coins`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>Payment Status:</span>
                  <span style={{ fontWeight: '700', color: '#047857' }}>PAID & CONFIRMED</span>
                </div>
              </div>
            </div>

            {/* Player Roster Table */}
            <div style={{ marginBottom: '22px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px' }}>REGISTERED PLAYER ROSTER</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700' }}>#</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700' }}>In-Game Name (IGN)</th>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700' }}>Free Fire UID</th>
                    <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: '11px', fontWeight: '700' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length > 0 ? members.map((m, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '9px 12px', fontSize: '11px', fontWeight: '600', color: '#64748b' }}>{i + 1}</td>
                      <td style={{ padding: '9px 12px', fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>{m.ign || "Unknown"}</td>
                      <td style={{ padding: '9px 12px', fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: '#334155' }}>{m.uid || "-"}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: '10px' }}>
                        {m.isLeader ? (
                          <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontWeight: '800', border: '1px solid #fde68a' }}>CAPTAIN 👑</span>
                        ) : (
                          <span style={{ color: '#64748b', fontWeight: '600' }}>PLAYER</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>No player details recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Terms */}
            <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '16px', marginTop: '20px', fontSize: '10px', color: '#64748b', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>OFFICIAL TOURNAMENT TERMS</p>
              <p style={{ margin: '0' }}>• Match Room ID & Password will be published 10 minutes prior to match start.</p>
              <p style={{ margin: '0' }}>• In-Game Name & UID must strictly match your registered Free Fire profile.</p>
              <p style={{ margin: '0' }}>• Use of hacks, emulators, or third-party tools leads to instant ban without refund.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal Overlay (Option 1: Modern Bottom Floating Action Bar) */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/95 z-[99999] flex flex-col items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          {/* Top Bar - Back Button */}
          <div className="w-full max-w-md flex items-center justify-between mb-3 px-1">
            <button 
              onClick={() => setPreviewImage(null)} 
              className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs border border-slate-700/80 transition-all shadow-lg active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Back</span>
            </button>

            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
              Registration Receipt
            </span>
          </div>

          {/* Receipt Image Card */}
          <div className="max-w-md w-full max-h-[72vh] overflow-y-auto rounded-2xl border border-slate-800 shadow-2xl bg-white mb-4">
            <img 
              src={previewImage} 
              alt="Receipt Preview" 
              className="w-full h-auto object-contain block" 
            />
          </div>

          {/* Bottom Floating Glass Action Bar */}
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex items-center justify-center gap-3">
            {/* Download Button */}
            <button
              onClick={handleSaveToPhotos}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs py-3 px-4 rounded-xl shadow-lg shadow-amber-500/25 active:scale-95 transition-all border border-amber-300/40"
              title="Save to Photos / Gallery"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download Receipt</span>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShareReceipt}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-black text-xs py-3 px-4 rounded-xl border border-amber-500/30 active:scale-95 transition-all shadow-md"
              title="Share via Apps"
            >
              <Share2 className="w-4 h-4 text-amber-400 stroke-[2.5]" />
              <span>Share Receipt</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
