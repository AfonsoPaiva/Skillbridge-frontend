import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const grecaptcha: any;

/**
 * RecaptchaService
 *
 * Manages the Google reCAPTCHA v3 lifecycle:
 *  - Loads the reCAPTCHA v3 script lazily (only once per app session).
 *  - Provides `getToken(action)` which executes reCAPTCHA and resolves with
 *    a short-lived token that must be sent to the backend for verification.
 *
 * Usage in a component:
 *
 *   constructor(private recaptcha: RecaptchaService) {}
 *
 *   async submit(): Promise<void> {
 *     const token = await this.recaptcha.getToken('recruiter_apply');
 *     this.myService.apply({ ...formValue, recaptcha_token: token }).subscribe(…);
 *   }
 *
 * Note: The site key is read from `environment.recaptchaSiteKey`.
 * If the key is empty (dev mode), `getToken` returns an empty string so the
 * backend skips validation transparently.
 */
@Injectable({ providedIn: 'root' })
export class RecaptchaService {
  private scriptLoaded = false;
  private loadPromise: Promise<void> | null = null;

  /** Ensure the reCAPTCHA v3 API script is loaded exactly once. */
  private loadScript(): Promise<void> {
    if (this.scriptLoaded) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    const siteKey = environment.recaptchaSiteKey;
    if (!siteKey) {
      // Dev mode: no key configured — resolve immediately.
      this.scriptLoaded = true;
      return Promise.resolve();
    }

    this.loadPromise = new Promise<void>((resolve, reject) => {
      // Avoid duplicating the script if it was already injected externally.
      if (document.querySelector(`script[src*="recaptcha/api.js"]`)) {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('reCAPTCHA script failed to load'));
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  /**
   * Execute reCAPTCHA v3 and return a token for the given action.
   *
   * @param action  A descriptive string (e.g. 'recruiter_apply', 'login').
   *                Used by Google's risk analysis and visible in the dashboard.
   * @returns       A Promise that resolves with the token string.
   *                Returns '' (empty) when the site key is not configured.
   */
  async getToken(action: string): Promise<string> {
    const siteKey = environment.recaptchaSiteKey;
    if (!siteKey) {
      return '';
    }

    await this.loadScript();

    return new Promise<string>((resolve, reject) => {
      // grecaptcha.ready ensures the API is fully initialised before executing.
      grecaptcha.ready(() => {
        grecaptcha.execute(siteKey, { action })
          .then((token: string) => resolve(token))
          .catch(reject);
      });
    });
  }
}
