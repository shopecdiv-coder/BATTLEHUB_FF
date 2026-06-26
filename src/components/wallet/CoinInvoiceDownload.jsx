import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5NzMxNiIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkJIPC90ZXh0Pjwvc3ZnPg==";
const SIGNATURE_BASE64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iODAiPjx0ZXh0IHg9IjEwMCIgeT0iNTAiIGZvbnQtZmFtaWx5PSInQnJ1c2ggU2NyaXB0IE1UJywgY3Vyc2l2ZSIgZm9udC1zaXplPSIzNSIgZmlsbD0iYmxhY2siIHRleHQtYW5jaG9yPSJtaWRkbGUiPlNoaXZhbSBLdW1hcjwvdGV4dD48L3N2Zz4=";


export default function CoinInvoiceDownload({ paymentRequest, user }) {
  const containerRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const generateInvoice = async () => {
    if (!containerRef.current) return;
    setGenerating(true);
    
    try {
      // Small delay to ensure any fonts/images are loaded if we rely on external ones
      await new Promise(r => setTimeout(r, 200));
      
      const req = paymentRequest;
      const invoiceNo = `BHFF-INV-${req.id?.slice(-8).toUpperCase() || Math.random().toString(36).slice(-8).toUpperCase()}`;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const canvas = await html2canvas(containerRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.6);
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      const blob = pdf.output('blob');
      const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      
      pdf.save(`BHFF-Invoice-${invoiceNo}.pdf`);
      
      setGenerating(false);
      setTimeout(() => alert(`✅ PDF Generated! File Size: ${sizeMB} MB`), 300);
      return;
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("Failed to generate PDF invoice.");
      setGenerating(false);
    }
  };

  const req = paymentRequest;
  const invoiceNo = `BHFF-INV-${req.id?.slice(-8).toUpperCase() || "UNKNOWN"}`;
  const paidAmt = req.inr_amount || req.diamond_amount || 0;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={generateInvoice}
        disabled={generating}
        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 gap-1 mt-2"
        title="Download Invoice"
      >
        {generating ? <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        {generating ? "Generating..." : "Invoice"}
      </Button>

      {generating && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Generating Invoice...</h2>
        </div>
      )}

      {/* Hidden PDF Template */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -9999 }}>
        <div ref={containerRef} style={{ width: '794px', minHeight: '1123px', backgroundColor: 'white', color: '#111827', padding: '40px', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
            <div>
              <img src={LOGO_BASE64} alt="BattleHub Logo" style={{ height: '60px', marginBottom: '10px' }} />
              <p style={{ margin: '0', fontSize: '12px', color: '#4b5563' }}>Greater Noida, Gautam Buddha Nagar</p>
              <p style={{ margin: '0', fontSize: '12px', color: '#4b5563' }}>Uttar Pradesh, India</p>
              <p style={{ margin: '0', fontSize: '12px', color: '#4b5563' }}>Email: helpbattlehub@gmail.com</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#1f2937', textTransform: 'uppercase', letterSpacing: '2px' }}>TAX INVOICE</h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', fontWeight: 'bold' }}>Invoice No: {invoiceNo}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '14px' }}>Date: {format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
            </div>
          </div>

          {/* Details Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
            <div style={{ width: '48%' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px' }}>Bill To:</h3>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold' }}>{user?.full_name || req.user_ign || "Customer"}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}>IGN: {req.user_ign || "-"}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}>Email: {user?.email || "-"}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}>Phone: {user?.mobile_number || user?.phone || "-"}</p>
            </div>
            <div style={{ width: '48%' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px' }}>Payment Details:</h3>
              <p style={{ margin: '0', fontSize: '14px' }}><strong>Method:</strong> {req.payment_app || "UPI"}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Txn ID:</strong> {req.transaction_id || "N/A"}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Status:</strong> {req.status === "Verified" ? "PAID / SUCCESS" : req.status.toUpperCase()}</p>
              <p style={{ margin: '2px 0', fontSize: '14px' }}><strong>Payment Date:</strong> {req.created_date ? format(new Date(req.created_date), "dd MMM yyyy, hh:mm a") : "-"}</p>
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'left', fontSize: '14px' }}>Description</th>
                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '14px' }}>Qty</th>
                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '14px' }}>Unit Price (₹)</th>
                <th style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '14px' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px', border: '1px solid #e5e7eb', fontSize: '14px' }}>
                  <strong>BattleHub FF Coins Pack</strong><br/>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Digital Goods - {req.diamond_amount} BH Coins</span>
                </td>
                <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '14px' }}>1</td>
                <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '14px' }}>{paidAmt.toFixed(2)}</td>
                <td style={{ padding: '12px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '14px' }}>{paidAmt.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '50px' }}>
            <div style={{ width: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '14px' }}>
                <span>Subtotal:</span>
                <span>₹{paidAmt.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '14px', borderBottom: '1px solid #e5e7eb' }}>
                <span>Discount / GST (Exempt):</span>
                <span>₹0.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '18px', fontWeight: 'bold' }}>
                <span>{req.status === "Verified" ? "Total Paid:" : req.status === "Rejected" ? "Total (Rejected):" : "Total (Pending):"}</span>
                <span>₹{paidAmt.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer & Signature */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '50px' }}>
            <div style={{ width: '60%', fontSize: '12px', color: '#6b7280' }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#374151' }}>Terms & Conditions</p>
              <p style={{ margin: '0' }}>1. All sales of digital goods (Coins) are final and non-refundable.</p>
              <p style={{ margin: '0' }}>2. For disputes, contact helpbattlehub@gmail.com within 24 hours.</p>
              <p style={{ margin: '0' }}>3. This is a computer-generated invoice and requires physical signature only if requested.</p>
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
    </>
  );
}