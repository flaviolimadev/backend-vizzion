import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Saque } from '../entities/saque.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@ApiTags('admin-saques')
@Controller('admin/saques')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('admin')
export class AdminSaqueController {
  constructor(
    @InjectRepository(Saque) private readonly saqueRepo: Repository<Saque>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os saques (Admin)' })
  @ApiResponse({ status: 200, description: 'Lista de saques retornada com sucesso' })
  async listAll() {
    return this.saqueRepo.find({ order: { created_at: 'DESC' } });
  }
}


