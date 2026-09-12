import { auth } from "@/api/firebaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://battlehub-ten.vercel.app/api';

export const uploadFileToAWS = async (file, onProgress, signal) => {
  if (!file) throw new Error("No file provided");

  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Must be logged in to upload files");
    const idToken = await currentUser.getIdToken(true);

    // Step 1: Securely fetch Presigned URL from Backend (Phase 4 Security)
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        fileName: file.name || 'upload.bin',
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to get secure upload URL");
    }

    const { presignedUrl, finalUrl } = data;

    // Step 2: Use XMLHttpRequest to upload the raw File object directly
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      let rejected = false;
      const safeReject = (err) => {
        if (!rejected) {
          rejected = true;
          reject(err);
        }
      };

      if (signal) {
        const onAbort = () => {
          xhr.abort();
          safeReject(new Error("AbortError"));
        };
        if (signal.aborted) {
          xhr.abort();
          safeReject(new Error("AbortError"));
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }

      if (typeof onProgress === 'function') {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(event.loaded, event.total);
          }
        };
      }

      xhr.open("PUT", presignedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || 'application/octet-stream');
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(finalUrl);
        } else {
          const errorMsg = `AWS Upload failed (Status ${xhr.status})`;
          console.error(errorMsg);
          safeReject(new Error(errorMsg));
        }
      };
      
      xhr.onerror = () => {
        safeReject(new Error("Network error during secure AWS S3 Upload."));
      };

      xhr.send(file);
    });

  } catch (error) {
    console.error("Error securely uploading file:", error);
    throw error;
  }
};
