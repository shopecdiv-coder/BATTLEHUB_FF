import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download, X, Image as ImageIcon } from "lucide-react";
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

  const handleSaveToPhotos = () => {
    const reg = registration;
    const invoiceNo = `BHFF-REG-${reg.id?.slice(-8).toUpperCase() || "UNKNOWN"}`;
    const fileName = `${invoiceNo}.jpg`;
    
    if (window.AndroidBridge && window.AndroidBridge.downloadBase64) {
      window.AndroidBridge.downloadBase64(previewImage, "image/jpeg", fileName);
      alert("Saving to photos...");
    } else {
      const link = document.createElement("a");
      link.href = previewImage;
      link.download = fileName;
      link.click();
    }
  };

  const invoiceNo = `REG-${registration.id?.slice(-8).toUpperCase() || "UNKNOWN"}`;
  const entryFee = tournament?.entry_fee || "Free";
  const members = registration.team_members || [];

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

      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -9999, opacity: 0, pointerEvents: 'none' }}>
        <div ref={containerRef} style={{ width: '794px', minHeight: '1123px', backgroundColor: 'white', color: '#111827', padding: '40px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0', textDecoration: 'underline', color: '#111827' }}>BATTLEHUB FF</h1>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
            <div>
              <p style={{ margin: '0', fontSize: '12px', color: '#4b5563', fontWeight: 'bold' }}>Greater Noida, Gautam Buddha Nagar</p>
              <p style={{ margin: '0', fontSize: '12px', color: '#4b5563' }}>Uttar Pradesh, India</p>
              <p style={{ margin: '0', fontSize: '12px', color: '#4b5563' }}>Email: helpbattlehub@gmail.com</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#1f2937', textTransform: 'uppercase', letterSpacing: '2px' }}>REGISTRATION RECEIPT</h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', fontWeight: 'bold' }}>Receipt No: {invoiceNo}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '14px' }}>Date: {format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
            <div style={{ width: '48%' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px' }}>Team Details:</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                {registration.team_logo ? (
                  <img src={registration.team_logo} alt="Team Logo" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} crossOrigin="anonymous" />
                ) : (
                  <div style={{ width: '50px', height: '50px', borderRadius: '8px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>No Logo</div>
                )}
                <div>
                  <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>{registration.team_name}</p>
                  <p style={{ margin: '2px 0', fontSize: '14px' }}>Leader ID: {registration.team_leader_id}</p>
                </div>
              </div>
            </div>
            <div style={{ width: '48%' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px' }}>Tournament Details:</h3>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold' }}>{registration.tournament_title}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Status:</strong> {registration.status}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Registered On:</strong> {registration.created_date ? format(new Date(registration.created_date), "dd MMM yyyy, hh:mm a") : "-"}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Entry Fee Paid:</strong> {entryFee === "Free" ? "Free" : `${entryFee} 💎`}</p>
            </div>
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px' }}>Registered Members:</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px' }}>#</th>
                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px' }}>In-Game Name (IGN)</th>
                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px' }}>Game UID</th>
                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '14px' }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {members.length > 0 ? members.map((m, i) => (
                <tr key={i}>
                  <td style={{ padding: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }}>{i + 1}</td>
                  <td style={{ padding: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }}>{m.ign || "Unknown"}</td>
                  <td style={{ padding: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }}>{m.uid || "-"}</td>
                  <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '14px' }}>
                    {m.isLeader ? "Captain 👑" : "Player"}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '14px' }}>No members details found.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '50px' }}>
            <div style={{ width: '60%', fontSize: '12px', color: '#6b7280' }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#374151' }}>Tournament Rules</p>
              <p style={{ margin: '0' }}>1. Ensure all members join the room 10 minutes before the match time.</p>
              <p style={{ margin: '0' }}>2. Hackers, emulators (if restricted), and abusers will be disqualified immediately.</p>
              <p style={{ margin: '0' }}>3. Present this receipt to admins if there is any registration dispute.</p>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <img src="/signature.png" alt="Authorized Signatory" style={{ height: '60px', objectFit: 'contain', marginBottom: '5px' }} onError={(e) => { e.target.onerror = null; e.target.src = SIGNATURE_BASE64; }} />
              <div style={{ borderTop: '1px solid #111827', paddingTop: '5px', fontSize: '14px', fontWeight: 'bold' }}>Authorized Signatory</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '50px', borderTop: '2px solid #e5e7eb', paddingTop: '15px', fontSize: '12px', fontWeight: 'bold', color: '#9ca3af', letterSpacing: '1px' }}>
            THANK YOU FOR CHOOSING BATTLEHUB FF!
          </div>
        </div>
      </div>

      {previewImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: '15px', left: '15px', right: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100000 }}>
             <button onClick={() => setPreviewImage(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
               <X size={24} />
             </button>
             <Button onClick={handleSaveToPhotos} style={{ backgroundColor: '#f97316', color: 'white', fontWeight: 'bold' }}>
               <ImageIcon size={18} style={{ marginRight: '8px' }} />
               Save to Photos
             </Button>
          </div>
          <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '70px 10px 20px 10px' }}>
            <img src={previewImage} alt="Invoice Preview" style={{ maxWidth: '100%', maxHeight: 'none', objectFit: 'contain', backgroundColor: 'white' }} />
          </div>
        </div>
      )}
    </>
  );
}
