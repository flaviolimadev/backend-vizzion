import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { User } from './entities/user.entity';
import { Plano } from './entities/plano.entity';
import { YieldSchedule } from './entities/yield-schedule.entity';
import { Pagamento } from './entities/pagamento.entity';
import { Extrato } from './entities/extrato.entity';
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
import { PaymentCheckerService } from './services/payment-checker.service';
import { ExtratoController } from './controllers/extrato.controller';
import { ExtratoService } from './services/extrato.service';
import { BonusService } from './services/bonus.service';
import { BonusCheckerService } from './services/bonus-checker.service';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Plano, YieldSchedule, Pagamento, Extrato]), 
    ConfigModule, 
    MailModule,
    MulterModule.register({
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [UserController, PlanoController, TradingController, YieldController, WalletController, PaymentController, ExtratoController],
  providers: [UserService, AvatarService, PlanoService, TradingService, YieldService, WalletService, PaymentService, PaymentCheckerService, ExtratoService, BonusService, BonusCheckerService],
  exports: [TypeOrmModule],
})
export class UserModule {}
