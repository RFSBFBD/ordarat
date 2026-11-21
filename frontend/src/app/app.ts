import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('أوردرات');
  isLanding = true;

  selectRole(role: 'client' | 'merchant') {
    if (role === 'merchant') {
      alert('عايز تشترك في الخدمة؟ كلمنا على رقم الاشتراك المعتمد.');
    } else {
      console.log('Selected client role');
    }
  }

  continueAsGuest() {
    console.log('Continuing as guest');
  }
}
