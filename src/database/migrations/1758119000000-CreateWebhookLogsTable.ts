import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateWebhookLogsTable1758119000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'event',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'offerCode',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'client',
            type: 'jsonb',
          },
          {
            name: 'transaction',
            type: 'jsonb',
          },
          {
            name: 'subscription',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'orderItems',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'trackProps',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'retryCount',
            type: 'int',
            default: 0,
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
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhook_logs');
  }
}

