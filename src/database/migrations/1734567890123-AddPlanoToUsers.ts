import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlanoToUsers1734567890123 implements MigrationInterface {
    name = 'AddPlanoToUsers1734567890123'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "plano" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "plano"`);
    }
}
