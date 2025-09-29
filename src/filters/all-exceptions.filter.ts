import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || exception.message;
        error = responseObj.error || exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.message;
    }

    // Log do erro para debug
    console.error('🚨 Exception caught by global filter:', {
      status,
      message,
      error,
      stack: exception instanceof Error ? exception.stack : undefined
    });

    // Sempre retornar JSON, mesmo em caso de erro
    response.status(status).json({
      ok: false,
      status,
      error,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

