import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMissingUserColumns1723520600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table) return;

    const ensureColumn = async (name: string, column: TableColumn) => {
      const exists = table.columns.some((c) => c.name === name);
      if (!exists) {
        await queryRunner.addColumn('users', column);
      }
    };

    await ensureColumn(
      'email_verified',
      new TableColumn({ name: 'email_verified', type: 'boolean', default: false }),
    );

    await ensureColumn(
      'verification_code_hash',
      new TableColumn({ name: 'verification_code_hash', type: 'text', isNullable: true }),
    );

    await ensureColumn(
      'verification_expires_at',
      new TableColumn({ name: 'verification_expires_at', type: 'timestamp', isNullable: true }),
    );

    await ensureColumn(
      'avatar',
      new TableColumn({ name: 'avatar', type: 'text', isNullable: true }),
    );

    await ensureColumn(
      'status',
      new TableColumn({ name: 'status', type: 'int', default: 0 }),
    );

    await ensureColumn(
      'deleted',
      new TableColumn({ name: 'deleted', type: 'boolean', default: false }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table) return;

    const dropIfExists = async (name: string) => {
      const exists = table.columns.some((c) => c.name === name);
      if (exists) {
        await queryRunner.dropColumn('users', name);
      }
    };

    await dropIfExists('deleted');
    await dropIfExists('status');
    await dropIfExists('avatar');
    await dropIfExists('verification_expires_at');
    await dropIfExists('verification_code_hash');
    await dropIfExists('email_verified');
  }
}



