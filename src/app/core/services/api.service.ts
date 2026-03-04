import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  User, Project, ProjectRole, ProjectMember, Review,
  GuestSession, GuestSessionInput, Conversation, Message,
  DonationStats, RegisterInput, FollowCounts, FollowList
} from '../models/models';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private authHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Users ─────────────────────────────────────
  registerUser(data: Pick<RegisterInput, 'name'> & Partial<RegisterInput>): Observable<{ user: User }> {
    return this.http.post<{ user: User }>(`${this.base}/users/register`, data, {
      headers: this.authHeaders()
    });
  }

  getMyProfile(): Observable<User> {
    return this.http.get<User>(`${this.base}/users/me`, { headers: this.authHeaders() });
  }

  getUserById(id: string | number): Observable<User> {
    return this.http.get<User>(`${this.base}/users/${id}`);
  }

  updateProfile(data: Partial<RegisterInput & {
    avatar_url: string;
    contact_links: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      tiktok?: string;
      linkedin?: string;
      github?: string;
      website?: string;
    };
  }>): Observable<{ user: User }> {
    return this.http.put<{ user: User }>(`${this.base}/users/me`, data, {
      headers: this.authHeaders()
    });
  }

  deleteMyAccount(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/users/me`, {
      headers: this.authHeaders()
    });
  }

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/users/password-reset`, { email });
  }

  // ── Skills ────────────────────────────────────
  listSkills(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/skills`);
  }

  addSkill(skill: string): Observable<{ skills: string[] }> {
    return this.http.post<{ skills: string[] }>(`${this.base}/users/me/skills`, { skill }, {
      headers: this.authHeaders()
    });
  }

  // ── Universidades / Cursos ─────────────────────
  listUniversities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/universities`);
  }

  /**
   * Consulta os cursos existentes num estabelecimento específico.
   * O nome deve ser exactamente igual ao valor devolvido por listUniversities().
   */
  listCourses(estabelecimento: string): Observable<string[]> {
    const params = new HttpParams().set('estabelecimento', estabelecimento);
    return this.http.get<string[]>(`${this.base}/universities/courses`, { params });
  }

  removeSkill(skill: string): Observable<{ skills: string[] }> {
    const params = new HttpParams().set('skill', skill);
    return this.http.delete<{ skills: string[] }>(`${this.base}/users/me/skills`, {
      headers: this.authHeaders(), params
    });
  }

  // ── Projects ──────────────────────────────────
  /**
   * Fetch projects from the server.  The backend defaults to `status=open` when no
   * query parameter is provided, which is why a project will "disappear" after its
   * status is changed to `in_progress` or `completed` unless we explicitly request
   * a different state.  Callers can pass `status='all'` to get every project or any
   * of the other valid values (`open`, `in_progress`, `completed`).
   *
   * A `skillId` may also be provided which will be forwarded as the `skill_id` query
   * parameter.  This mirrors the behaviour of the backend handler in
   * `internal/handlers/project_handler.go`.
   */
  listProjects(
    status: 'open' | 'in_progress' | 'completed' | 'all' = 'open',
    skillId?: number
  ): Observable<Project[]> {
    let params = new HttpParams().set('status', status);
    if (skillId != null) {
      params = params.set('skill_id', skillId.toString());
    }
    return this.http.get<Project[]>(`${this.base}/projects`, { params });
  }

  getProject(slugOrId: string | number): Observable<Project> {
    return this.http.get<Project>(`${this.base}/projects/${slugOrId}`);
  }

  createProject(data: Partial<Project>): Observable<Project> {
    return this.http.post<{ project: Project }>(`${this.base}/projects`, data, {
      headers: this.authHeaders()
    }).pipe(map(r => r.project));
  }

  updateProject(slugOrId: string | number, data: Partial<Project>): Observable<Project> {
    return this.http.put<{ project: Project }>(`${this.base}/projects/${slugOrId}`, data, {
      headers: this.authHeaders()
    }).pipe(map(r => r.project));
  }

  deleteProject(slugOrId: string | number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/projects/${slugOrId}`, {
      headers: this.authHeaders()
    });
  }

  addProjectRole(projectSlugOrId: string | number, role: Partial<ProjectRole>): Observable<ProjectRole> {
    return this.http.post<ProjectRole>(`${this.base}/projects/${projectSlugOrId}/roles`, role, {
      headers: this.authHeaders()
    });
  }

  applyToProject(projectSlugOrId: string | number, roleId: number): Observable<ProjectMember> {
    return this.http.post<ProjectMember>(`${this.base}/projects/${projectSlugOrId}/join`, { role_id: roleId }, {
      headers: this.authHeaders()
    });
  }

  getProjectMembers(projectSlugOrId: string | number): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(`${this.base}/projects/${projectSlugOrId}/members`);
  }

  removeProjectMember(projectSlugOrId: string | number, memberId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/projects/${projectSlugOrId}/members/${memberId}`, {
      headers: this.authHeaders()
    });
  }

  getUnreadMessageCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(`${this.base}/messages/unread-count`, {
      headers: this.authHeaders()
    });
  }

  // ── Reviews ───────────────────────────────────
  createReview(data: { reviewed_id: number; project_id?: number; rating: number; comment: string }): Observable<Review> {
    return this.http.post<Review>(`${this.base}/reviews`, data, {
      headers: this.authHeaders()
    });
  }

  getUserReviews(userId: number): Observable<{ reviews: Review[]; average: number }> {
    return this.http.get<{ reviews: Review[]; average: number }>(`${this.base}/users/${userId}/reviews`);
  }

  // ── Follow ────────────────────────────────────
  followUser(userIdOrSlug: string | number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/users/${userIdOrSlug}/follow`, {}, {
      headers: this.authHeaders()
    });
  }

  unfollowUser(userIdOrSlug: string | number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/users/${userIdOrSlug}/follow`, {
      headers: this.authHeaders()
    });
  }

  getFollowStatus(userIdOrSlug: string | number): Observable<{ is_following: boolean }> {
    return this.http.get<{ is_following: boolean }>(`${this.base}/users/${userIdOrSlug}/follow/status`, {
      headers: this.authHeaders()
    });
  }

  getFollowCounts(userIdOrSlug: string | number): Observable<FollowCounts> {
    return this.http.get<FollowCounts>(`${this.base}/users/${userIdOrSlug}/follow/counts`);
  }

  getFollowers(userIdOrSlug: string | number): Observable<FollowList> {
    return this.http.get<FollowList>(`${this.base}/users/${userIdOrSlug}/followers`);
  }

  getFollowing(userIdOrSlug: string | number): Observable<FollowList> {
    return this.http.get<FollowList>(`${this.base}/users/${userIdOrSlug}/following`);
  }

  // ── Guest sessions ────────────────────────────
  createGuestSession(data: GuestSessionInput): Observable<GuestSession> {
    return this.http.post<GuestSession>(`${this.base}/guest/session`, data);
  }

  getGuestSession(token: string): Observable<GuestSession> {
    return this.http.get<GuestSession>(`${this.base}/guest/session/${token}`);
  }

  claimGuestSession(token: string): Observable<User> {
    return this.http.post<User>(`${this.base}/users/me/claim-guest-session`, { token }, {
      headers: this.authHeaders()
    });
  }

  // ── Platform stats ──────────────────
  getPlatformStats(): Observable<{ users: number; projects: number }> {
    return this.http.get<{ users: number; projects: number }>(`${this.base}/guest/stats`);
  }

  // ── Upload ────────────────────────────────────
  uploadImage(file: File, type: 'avatar' | 'project' = 'avatar'): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.post<{ url: string }>(`${this.base}/upload/image?type=${type}`, fd, {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` })
    });
  }

  // ── Donations stats ────────────────────────────
  getDonationStats(): Observable<DonationStats> {
    return this.http.get<DonationStats>(`${this.base}/donations/stats`);
  }

  createEmbeddedCheckout(amountCents: number): Observable<{ clientSecret: string }> {
    return this.http.post<{ clientSecret: string }>(`${this.base}/donations/embedded-checkout`, { amount: amountCents });
  }

  // ── Messages ──────────────────────────────────
  startConversation(userId: number): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.base}/conversations`, { user_id: userId }, {
      headers: this.authHeaders()
    });
  }

  listConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.base}/conversations`, {
      headers: this.authHeaders()
    });
  }

  getMessages(conversationId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.base}/conversations/${conversationId}/messages`, {
      headers: this.authHeaders()
    });
  }

  sendMessage(conversationId: number, text: string): Observable<Message> {
    // MVP: base64-encode the plaintext; ephemeral_key marks it as unencrypted
    const payload = { encrypted_content: btoa(unescape(encodeURIComponent(text))), ephemeral_key: 'plain' };
    return this.http.post<Message>(`${this.base}/conversations/${conversationId}/messages`, payload, {
      headers: this.authHeaders()
    });
  }

  markRead(conversationId: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/conversations/${conversationId}/read`, {}, {
      headers: this.authHeaders()
    });
  }

  respondApplication(projectSlugOrId: string | number, memberId: number, action: 'accept' | 'reject'): Observable<{ message: string; status: string }> {
    return this.http.put<{ message: string; status: string }>(`${this.base}/projects/${projectSlugOrId}/applications/${memberId}`, { action }, {
      headers: this.authHeaders()
    });
  }
}
