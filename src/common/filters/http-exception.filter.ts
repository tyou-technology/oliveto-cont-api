import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const error =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : (exceptionResponse as Record<string, unknown>);

    response.status(status).json({
      error: {
        statusCode: status,
        code: HttpStatus[status] ?? 'INTERNAL_SERVER_ERROR',
        message: error.message ?? exception.message,
        details: error.errors ?? undefined,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
