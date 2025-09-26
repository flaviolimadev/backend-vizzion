import { Body, Controller, Get, Post, UseGuards, Req, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SaqueService } from '../services/saque.service';
import { CreateSaqueDto } from '../dto/saque.dto';
import { SaqueStatus } from '../entities/saque.entity';

@ApiTags('Saques')
@Controller('saques')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SaqueController {
  constructor(private readonly saqueService: SaqueService) {}

  @Post()
  @ApiOperation({ summary: 'Solicitar saque' })
  @ApiResponse({ status: 201, description: 'Saque solicitado com sucesso' })
  @ApiResponse({ status: 400, description: 'Saldo insuficiente ou dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async createSaque(@Req() req: any, @Body() createSaqueDto: CreateSaqueDto) {
    const userId = req.user?.id || req.user?.sub;
    return this.saqueService.createSaque(userId, createSaqueDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar saques do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de saques retornada com sucesso' })
  async getSaquesByUser(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.saqueService.getSaquesByUser(userId);
  }

  @Get('all')
  @ApiOperation({ summary: 'Listar todos os saques (Admin)' })
  @ApiResponse({ status: 200, description: 'Lista de todos os saques retornada com sucesso' })
  async getAllSaques() {
    return this.saqueService.getAllSaques();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do saque (Admin)' })
  @ApiResponse({ status: 200, description: 'Status do saque atualizado com sucesso' })
  async updateSaqueStatus(
    @Param('id') id: string,
    @Body() body: { status: SaqueStatus; notes?: string }
  ) {
    return this.saqueService.updateSaqueStatus(id, body.status, body.notes);
  }
}
