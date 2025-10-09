// src/main.ts
import { ValidationPipe, HttpException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.use(helmet());
  
  // Middleware para adicionar headers no-cache
  app.use((req: any, res: any, next: any) => {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    next();
  });
  
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://localhost:3000',
    'https://localhost:5173',
    'https://vizzionbot.pro',
    process.env.FRONTEND_URL || '',
    process.env.APP_PUBLIC_URL || '',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Authorization', 'Content-Length'],
    optionsSuccessStatus: 204,
  });

  // Filtro global para garantir que sempre retornemos JSON
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Validation pipe global com mensagens de erro consistentes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => {
      const formattedErrors = errors.map(error => ({
        field: error.property,
        messages: Object.values(error.constraints || {})
      }));
      
      return new HttpException({
        ok: false,
        status: 400,
        error: 'Validation failed',
        message: 'Dados inválidos',
        details: formattedErrors
      }, 400);
    }
  }));

  const swagger = new DocumentBuilder().setTitle('Base Backend').setVersion('1.0.0').build();
  SwaggerModule.setup('/docs', app, SwaggerModule.createDocument(app, swagger));

  // 👇 executa migrations programaticamente - DESABILITADO TEMPORARIAMENTE
  console.log('Pulando migrations por enquanto...');
  /*
  try {
    const dataSource = app.get(DataSource);
    const ran = await dataSource.runMigrations();
    if (ran.length) {
      console.log(`Migrations aplicadas: ${ran.map(m => m.name).join(', ')}`);
    } else {
      console.log('Nenhuma migration pendente.');
    }
  } catch (err) {
    console.error('Falha ao executar migrations:', err);
    // Não falhar o boot se migration falhar - apenas logar o erro
    console.log('Continuando sem executar migrations...');
  }
  */

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
