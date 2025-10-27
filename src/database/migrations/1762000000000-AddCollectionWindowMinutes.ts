import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCollectionWindowMinutes1762000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE yield_schedule 
      ADD COLUMN collection_window_minutes integer DEFAULT 30
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE yield_schedule 
      DROP COLUMN collection_window_minutes
    `);
  }
}




