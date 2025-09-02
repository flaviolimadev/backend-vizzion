import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PlanoController } from './controllers/plano.controller';
import { AvatarService } from './avatar.service';
import { PlanoService } from './services/plano.service';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), 
    ConfigModule, 
    MailModule,
    MulterModule.register({
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [UserController, PlanoController],
  providers: [UserService, AvatarService, PlanoService],
  exports: [TypeOrmModule],
})
export class UserModule {}
