import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { User } from './entities/user.entity';
import { Plano } from './entities/plano.entity';
import { YieldSchedule } from './entities/yield-schedule.entity';
import { Pagamento } from './entities/pagamento.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PlanoController } from './controllers/plano.controller';
import { AvatarService } from './avatar.service';
import { PlanoService } from './services/plano.service';
import { TradingController } from './controllers/trading.controller';
import { TradingService } from './services/trading.service';
import { YieldController } from './controllers/yield.controller';
import { YieldService } from './services/yield.service';
import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Plano, YieldSchedule, Pagamento]), 
    ConfigModule, 
    MailModule,
    MulterModule.register({
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [UserController, PlanoController, TradingController, YieldController, WalletController, PaymentController],
  providers: [UserService, AvatarService, PlanoService, TradingService, YieldService, WalletService, PaymentService],
  exports: [TypeOrmModule],
})
export class UserModule {}
