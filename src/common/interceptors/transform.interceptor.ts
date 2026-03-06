import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HateoasLinks } from '@common/dto/hateoas.dto';

export interface TransformedResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  _links?: HateoasLinks;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, TransformedResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<TransformedResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        // Controllers that return { data, _links } or { data, meta, _links } pass through as-is
        if (value && typeof value === 'object' && 'data' in value) {
          return value;
        }
        return { data: value ?? null };
      }),
    );
  }
}
