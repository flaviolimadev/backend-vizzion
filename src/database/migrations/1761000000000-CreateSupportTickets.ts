import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSupportTickets1761000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tickets',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid', isNullable: false },
          { name: 'title', type: 'varchar', length: '200', isNullable: false },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', default: "'open'", isNullable: false },
          { name: 'created_at', type: 'timestamptz', default: 'NOW()', isNullable: false },
          { name: 'updated_at', type: 'timestamptz', default: 'NOW()', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tickets',
      new TableIndex({ name: 'IDX_tickets_user_id', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'tickets',
      new TableIndex({ name: 'IDX_tickets_status', columnNames: ['status'] }),
    );
    await queryRunner.createForeignKey(
      'tickets',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'ticket_messages',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'ticket_id', type: 'uuid', isNullable: false },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'sender', type: 'varchar', length: '10', isNullable: false },
          { name: 'message', type: 'text', isNullable: false },
          { name: 'created_at', type: 'timestamptz', default: 'NOW()', isNullable: false },
          { name: 'updated_at', type: 'timestamptz', default: 'NOW()', isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'ticket_messages',
      new TableIndex({ name: 'IDX_ticket_messages_ticket_id', columnNames: ['ticket_id'] }),
    );
    await queryRunner.createIndex(
      'ticket_messages',
      new TableIndex({ name: 'IDX_ticket_messages_user_id', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'ticket_messages',
      new TableIndex({ name: 'IDX_ticket_messages_sender', columnNames: ['sender'] }),
    );
    await queryRunner.createForeignKey(
      'ticket_messages',
      new TableForeignKey({
        columnNames: ['ticket_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tickets',
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'ticket_messages',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FKs by querying metadata to get names dynamically (safer across DBs)
    const tm = await queryRunner.getTable('ticket_messages');
    if (tm) {
      for (const fk of tm.foreignKeys) {
        await queryRunner.dropForeignKey('ticket_messages', fk);
      }
    }
    await queryRunner.dropIndex('ticket_messages', 'IDX_ticket_messages_sender');
    await queryRunner.dropIndex('ticket_messages', 'IDX_ticket_messages_user_id');
    await queryRunner.dropIndex('ticket_messages', 'IDX_ticket_messages_ticket_id');
    await queryRunner.dropTable('ticket_messages');

    const t = await queryRunner.getTable('tickets');
    if (t) {
      for (const fk of t.foreignKeys) {
        await queryRunner.dropForeignKey('tickets', fk);
      }
    }
    await queryRunner.dropIndex('tickets', 'IDX_tickets_status');
    await queryRunner.dropIndex('tickets', 'IDX_tickets_user_id');
    await queryRunner.dropTable('tickets');
  }
}


