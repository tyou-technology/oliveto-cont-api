import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Response } from 'express';
import { DB_ERROR_CODES, DB_ERROR_MESSAGES } from '@common/constants/error-messages';
import { PRISMA_ERROR_CODES } from '@common/constants/prisma-error-codes';
import { LOGGER } from '@common/constants/wide-event.constants';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LOGGER.LOGGER_CONTEXT);

  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = DB_ERROR_CODES.DATABASE_ERROR;
    let message: string = DB_ERROR_MESSAGES.UNEXPECTED;

    switch (exception.code) {
      case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT:
        status = HttpStatus.CONFLICT;
        code = DB_ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION;
        message = DB_ERROR_MESSAGES.UNIQUE_CONSTRAINT;
        break;
      case PRISMA_ERROR_CODES.RECORD_NOT_FOUND:
        status = HttpStatus.NOT_FOUND;
        code = DB_ERROR_CODES.RECORD_NOT_FOUND;
        message = DB_ERROR_MESSAGES.RECORD_NOT_FOUND;
        break;
      case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT:
        status = HttpStatus.BAD_REQUEST;
        code = DB_ERROR_CODES.FOREIGN_KEY_VIOLATION;
        message = DB_ERROR_MESSAGES.FOREIGN_KEY_VIOLATION;
        break;
      default:
        this.logger.error(`Unhandled Prisma error: ${exception.code}`, exception.message);
    }

    response.status(status).json({
      error: {
        statusCode: status,
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
