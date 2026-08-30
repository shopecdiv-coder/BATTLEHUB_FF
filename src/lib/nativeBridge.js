/**
 * Capacitor Native Bridge
 * Provides native Android features: Push Notifications, Share, Haptics, StatusBar, etc.
 * This file is the bridge between our React web app and Android native APIs.
 */

let isNative = false;

// Detect if running inside Capacitor (Android/iOS)
const tryLoadCapacitor = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    isNative = Capacitor.isNativePlatform();
    return Capacitor;
  } catch {
    return null;
  }
};

// ─── Status Bar ────────────────────────────────────────────────────────────────
export const setupStatusBar = async () => {
  try {
    const cap = await tryLoadCapacitor();
    if (!cap || !isNative) return;
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a0c' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (e) {
    console.warn('StatusBar plugin not available:', e);
  }
};

// ─── Splash Screen ─────────────────────────────────────────────────────────────
export const hideSplashScreen = async () => {
  try {
    const cap = await tryLoadCapacitor();
    if (!cap || !isNative) return;
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn('SplashScreen plugin not available:', e);
  }
};

// ─── Push Notifications ────────────────────────────────────────────────────────
export const setupPushNotifications = async () => {
  try {
    const cap = await tryLoadCapacitor();
    if (!cap || !isNative) return;
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }

    PushNotifications.addListener('registration', (token) => {
      console.log('FCM Token:', token.value);
      localStorage.setItem('fcm_token', token.value);
      window.dispatchEvent(new CustomEvent('fcmTokenReceived', { detail: token.value }));
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('FCM registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
      window.dispatchEvent(new CustomEvent('pushNotificationReceived', { detail: notification }));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action:', action);
      window.dispatchEvent(new CustomEvent('pushNotificationActionPerformed', { detail: action }));
    });
  } catch (e) {
    console.warn('PushNotifications plugin not available:', e);
  }
};

// ─── Share ─────────────────────────────────────────────────────────────────────
export const nativeShare = async ({ title, text, url }) => {
  try {
    const cap = await tryLoadCapacitor();
    if (!cap || !isNative) {
      // Fallback to Web Share API
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return true;
      }
      return false;
    }
    const { Share } = await import('@capacitor/share');
    await Share.share({ title, text, url, dialogTitle: title });
    return true;
  } catch (e) {
    console.warn('Share failed:', e);
    return false;
  }
};

// ─── Clipboard ─────────────────────────────────────────────────────────────────
export const nativeCopy = async (text) => {
  try {
    const cap = await tryLoadCapacitor();
    if (!cap || !isNative) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const { Clipboard } = await import('@capacitor/clipboard');
    await Clipboard.write({ string: text });
    return true;
  } catch (e) {
    console.warn('Clipboard copy failed:', e);
    return false;
  }
};

// ─── Haptics ───────────────────────────────────────────────────────────────────
export const hapticImpact = async (style = 'medium') => {
  try {
    const cap = await tryLoadCapacitor();
    if (!cap || !isNative) return;
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: styleMap[style] || ImpactStyle.Medium });
  } catch (e) {
    // silently fail — haptics are optional
  }
};

export const hapticNotification = async (type = 'success') => {
  try {
    const cap = await tryLoadCapacitor();
    if (!cap || !isNative) return;
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    await Haptics.notification({ type: typeMap[type] || NotificationType.Success });
  } catch (e) {
    // silently fail
  }
};

// ─── App (Back button, State) ──────────────────────────────────────────────────
export const setupAppListeners = async () => {
  try {
    const cap = await tryLoadCapacitor();
    if (!cap || !isNative) return;
    const { App } = await import('@capacitor/app');

    App.addListener('backButton', ({ canGoBack }) => {
      // Check if there are any open modals/drawers (Radix UI or Vaul)
      const openModals = document.querySelectorAll('[role="dialog"][data-state="open"], [data-vaul-drawer][data-state="open"]');
      
      if (openModals.length > 0) {
        // Dispatch Escape key to close the topmost modal
        const escEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          which: 27,
          bubbles: true
        });
        document.dispatchEvent(escEvent);
        return; // Do not navigate back
      }

      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    App.addListener('appStateChange', ({ isActive }) => {
      window.dispatchEvent(new CustomEvent('appStateChange', { detail: { isActive } }));
    });
  } catch (e) {
    console.warn('App plugin not available:', e);
  }
};

// ─── Keyboard ─────────────────────────────────────────────────────────────────
export const setupKeyboard = async () => {
  try {
    const cap = await tryLoadCapacitor();
    if (!cap || !isNative) return;
    const { Keyboard } = await import('@capacitor/keyboard');

    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      document.body.classList.add('keyboard-open');
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-open');
    });
  } catch (e) {
    console.warn('Keyboard plugin not available:', e);
  }
};

// ─── Initialize all native features ───────────────────────────────────────────
export const initializeNativeFeatures = async () => {
  await setupStatusBar();
  await setupPushNotifications();
  await setupAppListeners();
  await setupKeyboard();
  // Small delay then hide splash
  setTimeout(hideSplashScreen, 800);
};

export { isNative };
