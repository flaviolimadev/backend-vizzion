import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TradingService } from '../services/trading.service';

export class UpdateTradingModeDto {
  @ApiProperty({ 
    description: 'Modo de trading', 
    enum: ['manual', 'auto'],
    example: 'manual'
  })
  @IsString()
  @IsIn(['manual', 'auto'])
  mode: 'manual' | 'auto';
}

@ApiTags('Trading')
@Controller('trading')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Get('mode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter modo de trading atual do usuário' })
  @ApiResponse({ status: 200, description: 'Modo de trading atual' })
  async getTradingMode(@Request() req) {
    return this.tradingService.getTradingMode(req.user.sub);
  }

  @Patch('mode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar modo de trading do usuário' })
  @ApiResponse({ status: 200, description: 'Modo de trading atualizado' })
  async updateTradingMode(@Request() req, @Body() updateTradingModeDto: UpdateTradingModeDto) {
    return this.tradingService.updateTradingMode(req.user.sub, updateTradingModeDto.mode);
  }
} 