import { auth } from "@/api/firebaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://battlehub-ten.vercel.app/api';

/**
 * A generalized secure API client for communicating with the backend.
 * Automatically attaches the Firebase ID token for authorization.
 */
export async function secureFetch(endpoint, options = {}) {
  const currentUser = auth.currentUser;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (currentUser) {
    const idToken = await currentUser.getIdToken(true);
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = 'API request failed';
    try {
      const errData = await response.json();
      errorMsg = errData.message || errData.error || errorMsg;
    } catch (e) {
      errorMsg = await response.text();
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
