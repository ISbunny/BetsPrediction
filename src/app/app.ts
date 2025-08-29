import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ServerComponent } from './server/server';
import { LoginComponent } from './login/login';
// If 'Server' is exported as default:


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('matchPred');
  
}
