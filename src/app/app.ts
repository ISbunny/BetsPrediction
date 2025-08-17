import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Server } from "./server/server";

@Component({
  selector: 'app-root',
  imports: [Server],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('matchPred');
  
}
