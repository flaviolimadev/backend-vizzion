import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './config/app.config';
import dbConfig from './config/database.config';
import { envValidationSchema } from './config/validation.schema';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig],
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get('db') as any;
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          autoLoadEntities: true,
          synchronize: false,                // nunca em prod
          logging: false,

          // 👇 importante: caminhos das migrations
          migrations: [
            join(__dirname, 'database', 'migrations', '*.{ts,js}'),
          ],
          migrationsRun: true,               // 👈 executa ao iniciar
        };
      },
    }),
    // ... seus módulos
    AuthModule,
    UserModule,
    MailModule,
  ],
})
export class AppModule {}
