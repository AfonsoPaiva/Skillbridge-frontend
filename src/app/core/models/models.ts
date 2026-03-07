export interface User {
  id: number;
  firebase_uid: string;
  name: string;
  slug: string;
  email: string;
  email_verified: boolean;
  university: string;
  course: string;
  year: string;
  bio: string;
  avatar_url: string;
  skills: string[];
  role: string;
  area?: string;
  contact_links?: ContactLinks;
  created_at: string;
}

export interface ContactLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface Project {
  id: number;
  title: string;
  slug: string;
  description: string;
  status: string;
  image_url: string;
  owner_id: number;
  owner?: User;
  roles?: ProjectRole[];
  members?: ProjectMember[];
  created_at: string;
}

export interface ProjectRole {
  id: number;
  project_id: number;
  title: string;
  description: string;
  skill_name: string;
  spots: number;
  filled: number;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role_id: number;
  status: string;
  user?: User;
}

export interface Review {
  id: number;
  reviewer_id: number;
  reviewed_id: number;
  project_id?: number;
  rating: number;
  comment: string;
  status: string;
  reviewer?: User;
  project?: Project;
  created_at: string;
}

export interface GuestSessionInput {
  token?: string;
  role: string;
  area?: string;
}

export interface GuestSession {
  token: string;
  role: string;
  area: string;
}

export interface Conversation {
  id: number;
  user_a_id: number;
  user_b_id: number;
  user_a?: User;
  user_b?: User;
  created_at: string;
  unread_count?: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  encrypted_content: string;
  ephemeral_key: string;
  read_at?: string;
  created_at: string;
  sender?: User;
  // system message fields
  is_system?: boolean;
  message_type?: string;    // 'application'
  meta_project_id?: number;
  meta_member_id?: number;
  meta_status?: string;     // 'pending', 'accepted', 'rejected'
}

export interface DonationStats {
  total: number;
  count: number;
}

export interface DonationCheckoutSession {
  session_id: string;
  client_secret: string;
}

export interface DonationCheckoutStatus {
  status: string;
  payment_status: string;
  amount_total: number;
  currency: string;
}

export interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
  follower?: User;
  following?: User;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FollowList {
  count: number;
  users: User[];
}

export interface Skill {
  name: string;
}

export interface RegisterInput {
  name: string;
  university?: string;
  course?: string;
  year?: string;
  bio?: string;
  role?: string;
  area?: string;
  guest_session_token?: string;
}
