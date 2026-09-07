export type GoogleUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
  idToken?: string;
};

export type AuthSession = {
  user: GoogleUser;
  tokens: GoogleTokens;
  createdAt: string;
};

export type SessionResponse = {
  authenticated: boolean;
  user: GoogleUser | null;
};
