import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExtratoService } from '../services/extrato.service';
import { ExtratoType } from '../entities/extrato.entity';

@ApiTags('Extratos')
@Controller('extratos')
export class ExtratoController {
  constructor(private readonly extratoService: ExtratoService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buscar extratos do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de extratos retornada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getExtratos(@Req() req: any) {
    const userId = req.user.id;
    console.log('🔍 ExtratoController: Buscando extratos para usuário:', userId);
    const extratos = await this.extratoService.getExtratosByUser(userId);
    console.log('🔍 ExtratoController: Extratos encontrados:', extratos.length);
    return extratos;
  }

  @Get('by-type')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buscar extratos por tipo' })
  @ApiResponse({ status: 200, description: 'Lista de extratos por tipo retornada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getExtratosByType(
    @Req() req: any,
    @Query('type') type: ExtratoType
  ) {
    const userId = req.user.id;
    return this.extratoService.getExtratosByType(userId, type);
  }

  @Get('by-date-range')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Buscar extratos por período' })
  @ApiResponse({ status: 200, description: 'Lista de extratos por período retornada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async getExtratosByDateRange(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const userId = req.user.id;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.extratoService.getExtratosByDateRange(userId, start, end);
  }
}
