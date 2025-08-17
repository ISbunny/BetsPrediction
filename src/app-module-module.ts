import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    // Import HttpClientModule to use HttpClient in the app
  ],
  providers: [
    provideHttpClient() // Provide HttpClient for dependency injection
  ],
})
export class AppModuleModule { }
