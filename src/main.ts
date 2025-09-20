import { bootstrapApplication } from '@angular/platform-browser';
import { OddsComponent } from './app/odds.component';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

bootstrapApplication(OddsComponent, {
  providers: [
    importProvidersFrom(HttpClientModule, CommonModule)
  ]
}).catch(err => console.error(err));
