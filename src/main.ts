// src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
      // Permite qualquer origem (necessário para apps móveis / WebView variado)
      callback(null, true);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    exposedHeaders: 'Authorization, Content-Length'
  });
  // app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

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
