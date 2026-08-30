import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function CustomScanner({ onScan, onError }) {
  const qrcodeRegionId = "html5qr-code-full-region";
  const scannerRef = useRef(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(qrcodeRegionId);
    scannerRef.current = html5QrCode;

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      // Removed aspectRatio: 1.0 to prevent forced stretching/cropping
    };
    
    html5QrCode.start(
      { 
        facingMode: "environment"
      },
      config,
      (decodedText, decodedResult) => {
        if (onScan) {
          onScan([{ rawValue: decodedText }]);
        }
      },
      (errorMessage) => {
        // Ignore normal scan failures
      }
    ).catch((err) => {
      console.error("Failed to start scanner", err);
      if (onError) onError(err);
    });

    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
              scannerRef.current.clear();
            }).catch(e => console.error(e));
          } else {
            scannerRef.current.clear();
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [onScan, onError]);

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden">
      <div id={qrcodeRegionId} className="w-full h-full" />
      <style>{`
        #html5qr-code-full-region video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}
