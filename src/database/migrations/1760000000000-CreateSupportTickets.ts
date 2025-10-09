import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSupportTickets1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // tickets
    await queryRunner.createTable(
      new Table({
        name: 'tickets',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'title', type: 'varchar', length: '200', isNullable: false },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: `'open'` },
          { name: 'created_at', type: 'timestamp with time zone', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp with time zone', default: 'NOW()' },
        ],
      })
    );

    await queryRunner.createIndex(
      'tickets',
      new TableIndex({ name: 'IDX_tickets_user_id', columnNames: ['user_id'] })
    );
    await queryRunner.createIndex(
      'tickets',
      new TableIndex({ name: 'IDX_tickets_status', columnNames: ['status'] })
    );

    await queryRunner.createForeignKey(
      'tickets',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // ticket_messages
    await queryRunner.createTable(
      new Table({
        name: 'ticket_messages',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'ticket_id', type: 'uuid', isNullable: false },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'sender', type: 'varchar', length: '10', isNullable: false }, // 'user' | 'admin'
          { name: 'message', type: 'text', isNullable: false },
          { name: 'created_at', type: 'timestamp with time zone', default: 'NOW()' },
          { name: 'updated_at', type: 'timestamp with time zone', default: 'NOW()' },
        ],
      })
    );

    await queryRunner.createIndex(
      'ticket_messages',
      new TableIndex({ name: 'IDX_ticket_messages_ticket_id', columnNames: ['ticket_id'] })
    );
    await queryRunner.createIndex(
      'ticket_messages',
      new TableIndex({ name: 'IDX_ticket_messages_user_id', columnNames: ['user_id'] })
    );
    await queryRunner.createIndex(
      'ticket_messages',
      new TableIndex({ name: 'IDX_ticket_messages_sender', columnNames: ['sender'] })
    );

    await queryRunner.createForeignKey(
      'ticket_messages',
      new TableForeignKey({
        columnNames: ['ticket_id'],
        referencedTableName: 'tickets',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );
    await queryRunner.createForeignKey(
      'ticket_messages',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order
    await queryRunner.dropTable('ticket_messages', true, true, true);
    await queryRunner.dropTable('tickets', true, true, true);
  }
}


