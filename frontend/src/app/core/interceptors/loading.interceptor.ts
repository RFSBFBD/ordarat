import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/**
 * Triggers the branded loading screen during API operations and async actions.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);

  // If request specifies silent background loading, skip
  if (req.headers.has('X-Silent-Loading')) {
    const cleanedReq = req.clone({
      headers: req.headers.delete('X-Silent-Loading'),
    });
    return next(cleanedReq);
  }

  loading.show('جاري تنفيذ الطلب...');

  return next(req).pipe(
    finalize(() => {
      loading.hide();
    }),
  );
};
