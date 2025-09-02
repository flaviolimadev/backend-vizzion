// src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swagger = new DocumentBuilder().setTitle('Base Backend').setVersion('1.0.0').build();
  SwaggerModule.setup('/docs', app, SwaggerModule.createDocument(app, swagger));

  // 👇 executa migrations programaticamente
  const dataSource = app.get(DataSource);
  try {
    const ran = await dataSource.runMigrations();
    if (ran.length) {
      console.log(`Migrations aplicadas: ${ran.map(m => m.name).join(', ')}`);
    } else {
      console.log('Nenhuma migration pendente.');
    }
  } catch (err) {
    console.error('Falha ao executar migrations:', err);
    process.exit(1); // opcional: falhar o boot se migration falhar
  }

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
