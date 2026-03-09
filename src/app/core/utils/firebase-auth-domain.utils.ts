import { environment } from '../../../environments/environment';

export function getFirebaseAuthDomain(): string {
  if (typeof window === 'undefined') {
    return environment.firebaseAuthDomain;
  }

  const hostname = window.location.hostname;
  if (!environment.production || !hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return environment.firebaseAuthDomain;
  }

  return hostname;
}
