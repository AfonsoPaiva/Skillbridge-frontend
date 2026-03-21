import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { getFirebaseAuthDomain } from '../utils/firebase-auth-domain.utils';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private static readonly PROMPTED_KEY = 'sb_push_permission_prompted';
  private static readonly TOKEN_KEY = 'sb_push_token';

  private initialized = false;
  private syncing = false;

  private isNonFatalPushError(error: unknown): boolean {
    const errorName = (error as any)?.name || '';
    const errorCode = (error as any)?.code || '';
    const errorMessage = ((error as any)?.message || '').toString().toLowerCase();

    return (
      errorName === 'AbortError'
      || errorName === 'NotAllowedError'
      || errorCode === 'messaging/token-subscribe-failed'
      || errorCode === 'messaging/permission-blocked'
      || errorMessage.includes('registration failed - push service error')
      || errorMessage.includes('push service error')
    );
  }

  async initializeForLoggedUser(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;

    try {
      if (!this.canUsePush()) return;
      if (!this.isFirebaseMessagingConfigured()) return;

      if (Notification.permission === 'default') {
        const prompted = localStorage.getItem(PushNotificationService.PROMPTED_KEY) === '1';
        if (!prompted) {
          localStorage.setItem(PushNotificationService.PROMPTED_KEY, '1');
          await Notification.requestPermission();
        }
      }

      if (Notification.permission !== 'granted') return;

      const [{ getApps, initializeApp }, { getMessaging, getToken, onMessage, isSupported }] = await Promise.all([
        import('firebase/app'),
        import('firebase/messaging')
      ]);

      if (!(await isSupported())) return;

      const app = getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            apiKey: environment.firebaseApiKey,
            authDomain: getFirebaseAuthDomain(),
            projectId: environment.firebaseProjectId,
            messagingSenderId: environment.firebaseMessagingSenderId,
            appId: environment.firebaseAppId
          });

      const trustedScriptUrlFactory = (window as any).__skillbridgeTrustedScriptURL;
      const serviceWorkerUrl = typeof trustedScriptUrlFactory === 'function'
        ? trustedScriptUrlFactory('/firebase-messaging-sw.js')
        : '/firebase-messaging-sw.js';

      const registration = await (navigator.serviceWorker as any).register(serviceWorkerUrl, {
        scope: '/firebase-cloud-messaging-push-scope'
      });

      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: environment.firebaseVapidKey,
        serviceWorkerRegistration: registration
      });

      if (!token) return;

      await new Promise<void>((resolve) => {
        this.api.registerPushToken(token, this.detectPlatform()).subscribe({
          next: () => {
            localStorage.setItem(PushNotificationService.TOKEN_KEY, token);
            resolve();
          },
          error: () => resolve()
        });
      });

      if (!this.initialized) {
        onMessage(messaging, (payload) => {
          if (Notification.permission !== 'granted') return;

          const title = payload.notification?.title || 'Nova mensagem';
          const body = payload.notification?.body || 'Recebeu uma nova mensagem no SkillBridge.';
          const url = payload.data?.['url'] || '/messages';

          const notification = new Notification(title, {
            body,
            icon: '/assets/favicon-192.png',
            badge: '/assets/favicon-192.png',
            data: { url }
          });

          notification.onclick = () => {
            window.focus();
            window.location.href = url;
          };
        });
      }

      this.initialized = true;
    } catch (error) {
      if (this.isNonFatalPushError(error)) {
        console.warn('Push notifications unavailable for this browser/session:', error);
        return;
      }

      console.error('Failed to initialize push notifications:', error);
    } finally {
      this.syncing = false;
    }
  }

  private canUsePush(): boolean {
    return typeof window !== 'undefined'
      && 'Notification' in window
      && 'PushManager' in window
      && 'serviceWorker' in navigator
      && window.isSecureContext;
  }

  private isFirebaseMessagingConfigured(): boolean {
    return !!(
      environment.firebaseApiKey &&
      environment.firebaseProjectId &&
      environment.firebaseMessagingSenderId &&
      environment.firebaseAppId &&
      environment.firebaseVapidKey
    );
  }

  private detectPlatform(): 'web' | 'android' | 'ios' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    return 'web';
  }

  constructor(private api: ApiService) {}
}
