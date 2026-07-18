import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { apiPrefixInterceptor } from './core/http/api-prefix.interceptor';

export const appConfig: ApplicationConfig = { providers: [provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideAnimations(), provideRouter(routes, withComponentInputBinding()), provideHttpClient(withInterceptors([apiPrefixInterceptor]))] };
