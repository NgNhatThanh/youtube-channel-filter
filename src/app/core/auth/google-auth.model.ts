export interface GoogleUserProfile {
  id?: string;
  name: string;
  email: string;
  picture: string;
}

export interface GoogleAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: GoogleUserProfile | null;
  clientId: string;
  expiresAt: number | null;
  isLoading: boolean;
  errorMessage: string | null;
}
