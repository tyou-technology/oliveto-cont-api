import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { WIDE_EVENT } from '@common/constants/wide-event.constants';

@Injectable()
export class WideEventInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WIDE_EVENT.LOGGER_CONTEXT);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    req['wideEvent'] = {
      timestamp: new Date().toISOString(),
      request_id: (req.headers['x-request-id'] as string) || randomUUID(),
      service: WIDE_EVENT.SERVICE_NAME,
      version: process.env.npm_package_version || WIDE_EVENT.DEFAULT_VERSION,
      node_env: process.env.NODE_ENV,
      method: req.method,
      path: req.route?.path || req.path,
      url: req.originalUrl,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    };

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        this.emit(req, res.statusCode, startTime, 'success');
      }),
      catchError((error) => {
        this.emit(req, error.status || 500, startTime, 'error', error);
        return throwError(() => error);
      }),
    );
  }

  private emit(req: Request, statusCode: number, startTime: number, outcome: string, error?: any) {
    const event = req['wideEvent'];
    event.status_code = statusCode;
    event.duration_ms = Date.now() - startTime;
    event.outcome = outcome;

    if (error) {
      event.error = {
        type: error.name || error.constructor?.name || WIDE_EVENT.UNKNOWN_ERROR,
        message: error.message,
        code: error.code,
      };
    }

    const line = JSON.stringify(event);
    if (statusCode >= 500) {
      this.logger.error(line);
    } else if (statusCode >= 400) {
      this.logger.warn(line);
    } else {
      this.logger.log(line);
    }
  }
}
