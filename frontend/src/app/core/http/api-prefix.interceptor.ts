import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiPrefixInterceptor: HttpInterceptorFn = (request, next) => request.url.startsWith('/api/') ? next(request.clone({ url: `${environment.apiBaseUrl}${request.url.replace('/api/v1', '')}` })) : next(request);
