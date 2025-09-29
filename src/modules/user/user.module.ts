import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { User } from './entities/user.entity';
import { Plano } from './entities/plano.entity';
import { YieldSchedule } from './entities/yield-schedule.entity';
import { Pagamento } from './entities/pagamento.entity';
import { Extrato } from './entities/extrato.entity';
import { WebhookLog } from './entities/webhook-log.entity';
import { Saque } from './entities/saque.entity';
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
import { WebhookService } from './services/webhook.service';
import { WebhookPaymentProcessorService } from './services/webhook-payment-processor.service';
import { ExtratoController } from './controllers/extrato.controller';
import { ExtratoService } from './services/extrato.service';
import { BonusService } from './services/bonus.service';
import { BonusCheckerService } from './services/bonus-checker.service';
import { SaqueController } from './controllers/saque.controller';
import { AdminSaqueController } from './controllers/admin.saque.controller';
import { SaqueService } from './services/saque.service';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { AdminUserController } from './controllers/admin.user.controller';
import { AdminController } from './controllers/admin.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Plano, YieldSchedule, Pagamento, Extrato, WebhookLog, Saque]), 
    ConfigModule, 
    MailModule,
    MulterModule.register({
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  controllers: [UserController, PlanoController, TradingController, YieldController, WalletController, PaymentController, ExtratoController, SaqueController, AdminUserController, AdminSaqueController, AdminController],
  providers: [UserService, AvatarService, PlanoService, TradingService, YieldService, WalletService, PaymentService, PaymentCheckerService, WebhookService, WebhookPaymentProcessorService, ExtratoService, BonusService, BonusCheckerService, SaqueService, RolesGuard],
  exports: [TypeOrmModule],
})
export class UserModule {}
