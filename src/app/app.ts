import { Component } from '@angular/core';
import { SubscriptionCleanerComponent } from './features/subscription-cleaner/subscription-cleaner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SubscriptionCleanerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
