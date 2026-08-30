import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = import.meta.env.VITE_AWS_REGION;
const BUCKET_NAME = import.meta.env.VITE_AWS_BUCKET_NAME;

// Initialize conditionally so it doesn't crash if env vars are missing
let s3Client;
if (REGION && import.meta.env.VITE_AWS_ACCESS_KEY_ID) {
  s3Client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
  });
}

export const uploadFileToAWS = async (file, onProgress, signal) => {
  if (!file) throw new Error("No file provided");
  
  if (!s3Client) {
    throw new Error("AWS S3 is not configured. Missing environment variables.");
  }

  try {
    const fileExtension = file.name ? file.name.split('.').pop() : 'bin';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    
    // Step 1: Generate a Presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      ContentType: file.type || 'application/octet-stream',
    });
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Step 2: Use XMLHttpRequest to upload the raw File object directly
    // This provides perfect real-time progress events and doesn't crash the browser's memory
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
          const cloudFrontDomain = import.meta.env.VITE_AWS_CLOUDFRONT_DOMAIN;
          if (cloudFrontDomain) {
            resolve(`https://${cloudFrontDomain}/${fileName}`);
          } else {
            resolve(`https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${fileName}`);
          }
        } else {
          const errorMsg = `AWS Upload failed (Status ${xhr.status}): ${xhr.responseText}`;
          console.error(errorMsg);
          safeReject(new Error(errorMsg));
        }
      };
      
      xhr.onerror = () => {
        console.error("Network error during AWS S3 Upload");
        safeReject(new Error("Network error during AWS S3 Upload. Check CORS settings."));
      };

      xhr.send(file);
    });

  } catch (error) {
    console.error("Error uploading file to AWS S3:", error);
    throw error;
  }
};
