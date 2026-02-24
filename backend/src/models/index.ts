export type UserRole = 'player' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  logo_url?: string;
  description?: string;
  manager_id: string;
  game: 'lol' | 'valorant' | 'inazuma';
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  user_id: string;
  team_id?: string;
  game: 'lol' | 'valorant' | 'inazuma';
  role?: string;
  rank?: string;
  created_at: string;
  updated_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  game: 'lol' | 'valorant' | 'inazuma';
  status: 'draft' | 'open' | 'in_progress' | 'finished';
  participants: number;
  registration_deadline: string;
  start_date: string;
  has_price_pool: boolean;
  first_place?: string;
  second_place?: string;
  third_place?: string;
  challonge_url?: string;
  description?: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamJoinRequest {
  id: string;
  player_id: string;
  team_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface AuthPayload {
  email: string;
  password: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
