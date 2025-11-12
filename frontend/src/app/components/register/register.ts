import { Component, inject, signal } from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

import { Router } from '@angular/router';
import { ApiResponse } from '../../models/api-response';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  email!: string;
  password!: string;
  fullName!: string;
  userName!: string;
  profilePicture: string = 'http://randomuser.me/api/portraits/lego/4.jpg';
  profileImage: File | null = null;
  hide = signal(false);

  authService = inject(AuthService);
  snackBar = inject(MatSnackBar);
  router = inject(Router);

  togglePassword(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      this.profileImage = file;

      reader.onload = (e) => {
        this.profilePicture = e.target!.result as string;
        console.log(e.target?.result);
      };
      reader.readAsDataURL(file);
      console.log(this.profilePicture);
    }
  }

  registerForm() {
    let formData = new FormData();
    formData.append('email', this.email);
    formData.append('password', this.password);
    formData.append('fullName', this.fullName);
    formData.append('userName', this.userName);
    formData.append('ProfileImage', this.profileImage!);

    this.authService.register(formData).subscribe({
      next: () => {
        this.snackBar.open('User registered successfully', 'Close');
      },
      error: (error: HttpErrorResponse) => {
        let err = error.error as ApiResponse<string>;
        this.snackBar.open(err.error, 'Close');
      },
      complete: () => {
        this.router.navigate(['/']);
      },
    });
  }
}
