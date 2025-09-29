import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('User ID not found');
    }

    // Verificar se o usuário é admin (role = 'admin')
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'role']
    });

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Access denied - Admin role required');
    }

    return true;
  }
}
