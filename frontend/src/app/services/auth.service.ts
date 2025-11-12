import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { ApiResponse } from '../models/api-response';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:5431/api/account';
  private readonly tokenKey = 'token';
  private readonly userKey = 'user';

  private http = inject(HttpClient);

  // ---------- TOKEN HELPERS ----------
  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  set token(value: string | null) {
    value ? localStorage.setItem(this.tokenKey, value) : localStorage.removeItem(this.tokenKey);
  }

  // ---------- USER HELPERS ----------
  get currentUser(): User | null {
    const data = localStorage.getItem(this.userKey);
    return data ? JSON.parse(data) : null;
  }

  private saveUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // ---------- PRIVATE ----------
  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`,
    });
  }

  private handleError(context: string) {
    return (error: any) => {
      console.error(`${context} error:`, error);
      return throwError(() => error);
    };
  }

  // ---------- REGISTER ----------
  register(data: FormData): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/register`, data).pipe(
      tap((res) => res.data && (this.token = res.data)),
      catchError(this.handleError('Register'))
    );
  }

  // ---------- LOGIN ----------
  login(email: string, password: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap((res) => res.isSuccess && res.data && (this.token = res.data)),
      catchError(this.handleError('Login'))
    );
  }

  // ---------- ME (Current User) ----------
  me(): Observable<ApiResponse<User>> {
    return this.http
      .get<ApiResponse<User>>(`${this.baseUrl}/me`, { headers: this.getAuthHeaders() })
      .pipe(
        tap((res) => res.isSuccess && res.data && this.saveUser(res.data)),
        catchError(this.handleError('Fetch Current User'))
      );
  }

  // ---------- AUTH CHECK ----------
  isAuthenticated(): boolean {
    return !!this.token;
  }
}
