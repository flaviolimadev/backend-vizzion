import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Extrato } from '../entities/extrato.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUserController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Extrato) private readonly extratoRepo: Repository<Extrato>,
  ) {}

  @Get()
  async list() {
    return this.userRepo.find();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  @Post()
  async create(@Body() body: Partial<User>) {
    const entity = this.userRepo.create(body);
    const saved = await this.userRepo.save(entity);
    return saved;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<User>) {
    await this.userRepo.update(id, body);
    return this.userRepo.findOne({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.userRepo.delete(id);
    return { deleted: true };
  }

  @Get(':id/extrato')
  async getExtrato(@Param('id') id: string) {
    return this.extratoRepo.find({
      where: { user_id: id },
      order: { created_at: 'DESC' }
    });
  }
}


