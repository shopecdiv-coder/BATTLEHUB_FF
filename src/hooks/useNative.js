/**
 * useNativeFeatures Hook
 * Provides easy access to Capacitor native features in React components
 * Works transparently on both web and Android
 */

import { useCallback } from 'react';
import { nativeShare, nativeCopy, hapticImpact, hapticNotification } from '@/lib/nativeBridge';
import { toast } from 'sonner';

export function useNative() {

  const share = useCallback(async ({ title, text, url }) => {
    const success = await nativeShare({ title, text, url });
    if (!success) {
      // Fallback: copy to clipboard
      await nativeCopy(url || text);
      toast.success('Link copied to clipboard!');
    }
  }, []);

  const copy = useCallback(async (text, successMessage = 'Copied!') => {
    const success = await nativeCopy(text);
    if (success) {
      await hapticNotification('success');
      toast.success(successMessage);
    } else {
      toast.error('Failed to copy');
    }
    return success;
  }, []);

  const vibrate = useCallback(async (style = 'medium') => {
    await hapticImpact(style);
  }, []);

  const notify = useCallback(async (type = 'success') => {
    await hapticNotification(type);
  }, []);

  return { share, copy, vibrate, notify };
}
