import { Controller, Get, UseGuards, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OperationService } from '../services/operation.service';

@ApiTags('Operations')
@Controller('operations')
export class OperationController {
  constructor(private readonly operationService: OperationService) {}

  @Get('my-operations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter operações do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de operações do usuário' })
  async getMyOperations(@Req() req: any) {
    const userId = req.user.id;
    return this.operationService.getUserOperations(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de uma operação' })
  @ApiResponse({ status: 200, description: 'Detalhes da operação' })
  async getOperation(@Req() req: any, @Param('id') operationId: string) {
    const userId = req.user.id;
    return this.operationService.getOperationById(operationId, userId);
  }
}

