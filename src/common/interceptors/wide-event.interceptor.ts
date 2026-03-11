import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { LOGGER } from '@common/constants/wide-event.constants';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LOGGER.LOGGER_CONTEXT);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    req['logger'] = {
      timestamp: new Date().toISOString(),
      request_id: (req.headers['x-request-id'] as string) || randomUUID(),
      service: LOGGER.SERVICE_NAME,
      version: process.env.npm_package_version || LOGGER.DEFAULT_VERSION,
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
      catchError((error: unknown) => {
        const httpError = error as { status?: number; code?: string; name?: string; message?: string; constructor?: { name?: string } };
        this.emit(req, httpError.status || 500, startTime, 'error', httpError);
        return throwError(() => error);
      }),
    );
  }

  private emit(
    req: Request,
    statusCode: number,
    startTime: number,
    outcome: string,
    error?: { status?: number; code?: string; name?: string; message?: string; constructor?: { name?: string } },
  ): void {
    const event = req['logger'];
    event.status_code = statusCode;
    event.duration_ms = Date.now() - startTime;
    event.outcome = outcome;

    if (error) {
      event.error = {
        type: error.name || error.constructor?.name || LOGGER.UNKNOWN_ERROR,
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
