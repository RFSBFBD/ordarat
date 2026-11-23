import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/**
 * Request feedback policy:
 * - `X-Silent-Loading`: background refresh, no visual feedback at all.
 * - `X-Blocking-Loading`: full-screen branded overlay (e.g. placing an order).
 * - everything else: slim top progress bar, the page stays interactive.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);

  if (req.headers.has('X-Silent-Loading')) {
    const cleanedReq = req.clone({
      headers: req.headers.delete('X-Silent-Loading'),
    });
    return next(cleanedReq);
  }

  if (req.headers.has('X-Blocking-Loading')) {
    const cleanedReq = req.clone({
      headers: req.headers.delete('X-Blocking-Loading'),
    });
    loading.show('جاري تنفيذ الطلب...');
    return next(cleanedReq).pipe(
      finalize(() => {
        loading.hide();
      }),
    );
  }

  loading.apiStart();
  return next(req).pipe(
    finalize(() => {
      loading.apiEnd();
    }),
  );
};
