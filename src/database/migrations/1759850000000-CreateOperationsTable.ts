import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOperationsTable1759850000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'operations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'asset_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'asset_ticker',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'asset_description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'asset_exchange',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'asset_symbol',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'asset_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'candles_data',
            type: 'jsonb',
            isNullable: false,
            comment: 'Array de candles (OHLCV) no momento da operação',
          },
          {
            name: 'yield_schedule_id',
            type: 'int',
            isNullable: true,
            comment: 'ID do yield schedule relacionado',
          },
          {
            name: 'clicked_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'operado',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: 'Indica se a operação já foi marcada como operada',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_OPERATIONS_USER_ID',
            columnNames: ['user_id'],
          },
          {
            name: 'IDX_OPERATIONS_CLICKED_AT',
            columnNames: ['clicked_at'],
          },
          {
            name: 'IDX_OPERATIONS_OPERADO',
            columnNames: ['operado'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('operations');
  }
}

