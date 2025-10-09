import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import appConfig from './config/app.config';
import dbConfig from './config/database.config';
import { envValidationSchema } from './config/validation.schema';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { UserModule } from './modules/user/user.module';
import { HealthModule } from './modules/health/health.module';
import { SupportModule } from './modules/support/support.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig],
      // validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: false,
      logging: false,
      migrations: [
        join(__dirname, 'database', 'migrations', '*.{ts,js}'),
      ],
      migrationsRun: false, // Desabilitado temporariamente
    }),
    // ... seus módulos
    AuthModule,
    UserModule,
    MailModule,
    HealthModule,
    SupportModule,
  ],
})
export class AppModule {}
