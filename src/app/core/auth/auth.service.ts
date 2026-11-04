import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthState, GoogleAuthResponse, GoogleUserProfile } from './google-auth.model';

declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  // Required scopes as requested in specification
  private readonly SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl'
  ].join(' ');

  // In-memory token storage only (never persisted to localStorage, never logged)
  private accessToken: string | null = null;
  private tokenClient: any = null;

  // Reactive state using Angular Signals
  readonly state = signal<AuthState>({
    isAuthenticated: false,
    user: null,
    clientId: environment.googleClientId || this.getSavedClientId(),
    expiresAt: null,
    isLoading: false,
    errorMessage: null
  });

  readonly isAuthenticated = computed(() => this.state().isAuthenticated);
  readonly currentUser = computed(() => this.state().user);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly errorMessage = computed(() => this.state().errorMessage);
  readonly clientId = computed(() => this.state().clientId);

  constructor() {
    // If client ID is already available, preload GIS token client if script is ready
    if (this.state().clientId) {
      this.initGoogleTokenClient(this.state().clientId);
    }
  }

  private getSavedClientId(): string {
    // Optional temporary session fallback for Client ID configuration only (NOT token)
    try {
      return sessionStorage.getItem('yt_cleaner_client_id') || '';
    } catch {
      return '';
    }
  }

  setClientId(newId: string): void {
    const trimmed = newId.trim();
    try {
      if (trimmed) {
        sessionStorage.setItem('yt_cleaner_client_id', trimmed);
      } else {
        sessionStorage.removeItem('yt_cleaner_client_id');
      }
    } catch {
      // Ignore sessionStorage issues
    }

    this.state.update(s => ({
      ...s,
      clientId: trimmed,
      errorMessage: null
    }));

    if (trimmed) {
      this.initGoogleTokenClient(trimmed);
    }
  }

  private initGoogleTokenClient(clientId: string): boolean {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      return false;
    }

    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: this.SCOPES,
        callback: (resp: GoogleAuthResponse) => this.handleAuthCallback(resp),
        error_callback: (err: any) => {
          this.state.update(s => ({
            ...s,
            isLoading: false,
            errorMessage: err?.message || 'Google authorization failed or was dismissed.'
          }));
        }
      });
      return true;
    } catch (err: any) {
      this.state.update(s => ({
        ...s,
        errorMessage: `Failed to initialize Google Auth Client: ${err?.message || 'Unknown error'}`
      }));
      return false;
    }
  }

  connect(): void {
    const activeClientId = this.state().clientId;
    if (!activeClientId) {
      this.state.update(s => ({
        ...s,
        errorMessage: 'Please configure a Google OAuth 2.0 Web Client ID before connecting.'
      }));
      return;
    }

    this.state.update(s => ({ ...s, isLoading: true, errorMessage: null }));

    // Ensure GIS client is initialized
    if (!this.tokenClient) {
      const initialized = this.initGoogleTokenClient(activeClientId);
      if (!initialized) {
        // Wait briefly if script is still loading
        setTimeout(() => {
          if (this.initGoogleTokenClient(activeClientId)) {
            this.requestAccessToken();
          } else {
            this.state.update(s => ({
              ...s,
              isLoading: false,
              errorMessage: 'Google Identity Services library is not loaded. Please check your internet connection or ad-blocker.'
            }));
          }
        }, 500);
        return;
      }
    }

    this.requestAccessToken();
  }

  private requestAccessToken(): void {
    try {
      // Prompt user for consent or select account
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      this.state.update(s => ({
        ...s,
        isLoading: false,
        errorMessage: `Could not launch Google authentication: ${err?.message || 'Unknown error'}`
      }));
    }
  }

  private handleAuthCallback(response: GoogleAuthResponse): void {
    if (response.error) {
      this.state.update(s => ({
        ...s,
        isLoading: false,
        errorMessage: response.error_description || response.error || 'Authentication error.'
      }));
      return;
    }

    if (!response.access_token) {
      this.state.update(s => ({
        ...s,
        isLoading: false,
        errorMessage: 'No access token received from Google.'
      }));
      return;
    }

    // Store in-memory only (never logged, never persisted to localStorage)
    this.accessToken = response.access_token;
    const expiresIn = Number(response.expires_in) || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    // Fetch user profile info
    this.fetchUserProfile(this.accessToken, expiresAt);
  }

  private fetchUserProfile(token: string, expiresAt: number): void {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<GoogleUserProfile>('https://www.googleapis.com/oauth2/v3/userinfo', { headers }).subscribe({
      next: (profile) => {
        this.state.update(s => ({
          ...s,
          isAuthenticated: true,
          user: profile,
          expiresAt,
          isLoading: false,
          errorMessage: null
        }));
      },
      error: () => {
        // Even if userinfo fails, token is valid for YouTube API
        this.state.update(s => ({
          ...s,
          isAuthenticated: true,
          user: {
            name: 'YouTube User',
            email: 'Connected Google Account',
            picture: ''
          },
          expiresAt,
          isLoading: false,
          errorMessage: null
        }));
      }
    });
  }

  getValidToken(): string | null {
    if (!this.accessToken) {
      return null;
    }

    const expiresAt = this.state().expiresAt;
    if (expiresAt && Date.now() > expiresAt - 60000) {
      // Token is expired or expiring within 1 minute
      this.state.update(s => ({
        ...s,
        isAuthenticated: false,
        errorMessage: 'Google authorization expired. Please click Connect YouTube to reauthorize.'
      }));
      this.accessToken = null;
      return null;
    }

    return this.accessToken;
  }

  disconnect(): void {
    if (this.accessToken && typeof google !== 'undefined' && google.accounts?.oauth2?.revoke) {
      try {
        google.accounts.oauth2.revoke(this.accessToken, () => {
          // Token revoked
        });
      } catch {
        // Ignore revocation error
      }
    }

    this.accessToken = null;
    this.state.update(s => ({
      ...s,
      isAuthenticated: false,
      user: null,
      expiresAt: null,
      isLoading: false,
      errorMessage: null
    }));
  }
}
