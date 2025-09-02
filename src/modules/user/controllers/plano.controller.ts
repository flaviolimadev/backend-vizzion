import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlanoService } from '../services/plano.service';
import { UpgradePlanoDto, PlanoResponseDto, UserPlanoResponseDto } from '../dto/plano.dto';

@ApiTags('Planos')
@Controller('planos')
export class PlanoController {
  constructor(private readonly planoService: PlanoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar planos disponíveis' })
  @ApiResponse({ status: 200, description: 'Lista de planos disponíveis', type: [PlanoResponseDto] })
  async getPlanosDisponiveis(): Promise<PlanoResponseDto[]> {
    return this.planoService.getPlanosDisponiveis();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter plano atual do usuário' })
  @ApiResponse({ status: 200, description: 'Plano atual do usuário', type: UserPlanoResponseDto })
  async getMeuPlano(@Request() req): Promise<UserPlanoResponseDto> {
    return this.planoService.getUserPlano(req.user.id);
  }

  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fazer upgrade do plano' })
  @ApiResponse({ status: 200, description: 'Upgrade realizado com sucesso' })
  async upgradePlano(
    @Request() req,
    @Body() upgradePlanoDto: UpgradePlanoDto
  ): Promise<{ success: boolean; message: string }> {
    return this.planoService.upgradePlano(req.user.id, upgradePlanoDto.novoPlano);
  }
}
