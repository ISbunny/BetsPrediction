import { Routes } from '@angular/router';
import { ServerComponent } from './server/server';
import { LoginComponent } from './login/login';

export const routes: Routes = [
	{ path: 'server', component: ServerComponent },
	{ path: 'login', component: LoginComponent },
	{ path: '', redirectTo: '/login', pathMatch: 'full' }
];
