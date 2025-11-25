import { Component, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiResponse } from '../../models/api-response';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email!: string;
  password!: string;

  private authService = inject(AuthService);
  private snackbar = inject(MatSnackBar);
  private router = inject(Router);

  hide = signal(false);

  Login() {
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.authService.me().subscribe();
        this.snackbar.open('Logged in successfully', 'Close', {
          duration: 7000,
        });
      },
      error: (err: HttpErrorResponse) => {
        let error = err.error as ApiResponse<string>;

        this.snackbar.open(error.error, 'Close', {
          duration: 7000,
        });
      },
      complete: () => {
        this.router.navigate(['/']);
      },
    });
  }

  togglePassword(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }
}
