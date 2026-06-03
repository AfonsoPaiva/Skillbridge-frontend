import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Recruiter, RecruiterApplyInput, Vacancy } from '../models/models';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RecruiterService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private authHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Public endpoints ──────────────────────────────

  /** Submit recruiter application (public — no auth required) */
  apply(data: RecruiterApplyInput): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/recruiters/apply`, data);
  }

  /** Request login link for approved recruiters (public) */
  requestLoginLink(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/recruiters/request-link`, { email });
  }

  /** Verify a recruiter access token and get a Firebase custom token */
  verifyToken(token: string): Observable<{ custom_token: string; recruiter: { id: string; full_name: string; company_name: string; email: string } }> {
    return this.http.post<{ custom_token: string; recruiter: { id: string; full_name: string; company_name: string; email: string } }>(
      `${this.base}/recruiters/verify-token`, { token }
    );
  }

  /** List active vacancies (public — for students) */
  listPublicVacancies(tag?: string, type?: string): Observable<{ vacancies: Vacancy[]; count: number }> {
    let url = `${this.base}/vacancies`;
    const params: string[] = [];
    if (tag) params.push(`tag=${encodeURIComponent(tag)}`);
    if (type) params.push(`type=${encodeURIComponent(type)}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<{ vacancies: Vacancy[]; count: number }>(url);
  }

  /** Get a single active vacancy (public) */
  getPublicVacancy(id: string): Observable<{ vacancy: Vacancy }> {
    return this.http.get<{ vacancy: Vacancy }>(`${this.base}/vacancies/${id}`);
  }

  // ── Authenticated recruiter endpoints ─────────────

  /** Get authenticated recruiter's profile */
  getProfile(): Observable<Recruiter> {
    return this.http.get<Recruiter>(`${this.base}/recruiter/profile`, {
      headers: this.authHeaders()
    });
  }

  updateProfile(data: { logo_url?: string; company_url?: string }): Observable<Recruiter> {
    return this.http.put<Recruiter>(`${this.base}/recruiter/profile`, data, {
      headers: this.authHeaders()
    });
  }


  uploadLogo(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ url: string }>(`${this.base}/upload/image?type=logo`, formData, {
      headers: this.authHeaders()
    });
  }

  /** List recruiter's own vacancies */
  listMyVacancies(): Observable<{ vacancies: Vacancy[]; count: number }> {
    return this.http.get<{ vacancies: Vacancy[]; count: number }>(`${this.base}/recruiter/vacancies`, {
      headers: this.authHeaders()
    });
  }

  /** Create a new vacancy */
  createVacancy(data: Partial<Vacancy>): Observable<{ vacancy: Vacancy }> {
    return this.http.post<{ vacancy: Vacancy }>(`${this.base}/recruiter/vacancies`, data, {
      headers: this.authHeaders()
    });
  }

  /** Update an existing vacancy */
  updateVacancy(id: string, data: Partial<Vacancy>): Observable<{ vacancy: Vacancy }> {
    return this.http.put<{ vacancy: Vacancy }>(`${this.base}/recruiter/vacancies/${id}`, data, {
      headers: this.authHeaders()
    });
  }

  /** Archive a vacancy */
  deleteVacancy(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/recruiter/vacancies/${id}`, {
      headers: this.authHeaders()
    });
  }
}
