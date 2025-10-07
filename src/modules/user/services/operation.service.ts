import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Operation } from '../entities/operation.entity';

@Injectable()
export class OperationService {
  constructor(
    @InjectRepository(Operation)
    private operationRepository: Repository<Operation>,
  ) {}

  async getUserOperations(userId: string) {
    const operations = await this.operationRepository.find({
      where: { userId },
      order: { clickedAt: 'DESC' },
      take: 50, // Últimas 50 operações
    });

    return operations.map(op => ({
      id: op.id,
      assetId: op.assetId,
      assetTicker: op.assetTicker,
      assetDescription: op.assetDescription,
      assetExchange: op.assetExchange,
      assetSymbol: op.assetSymbol,
      assetType: op.assetType,
      candlesData: op.candlesData,
      yieldScheduleId: op.yieldScheduleId,
      clickedAt: op.clickedAt,
      operado: op.operado,
      createdAt: op.createdAt,
    }));
  }

  async getOperationById(operationId: string, userId: string) {
    const operation = await this.operationRepository.findOne({
      where: { id: operationId, userId },
    });

    if (!operation) {
      throw new NotFoundException('Operação não encontrada');
    }

    return {
      id: operation.id,
      assetId: operation.assetId,
      assetTicker: operation.assetTicker,
      assetDescription: operation.assetDescription,
      assetExchange: operation.assetExchange,
      assetSymbol: operation.assetSymbol,
      assetType: operation.assetType,
      candlesData: operation.candlesData,
      yieldScheduleId: operation.yieldScheduleId,
      clickedAt: operation.clickedAt,
      operado: operation.operado,
      createdAt: operation.createdAt,
      updatedAt: operation.updatedAt,
    };
  }
}

