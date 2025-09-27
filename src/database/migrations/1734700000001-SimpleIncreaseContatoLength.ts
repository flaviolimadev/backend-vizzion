import { MigrationInterface, QueryRunner } from "typeorm";

export class SimpleIncreaseContatoLength1734700000001 implements MigrationInterface {
    name = 'SimpleIncreaseContatoLength1734700000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Apenas alterar o tamanho do campo contato para 50 caracteres
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "contato" TYPE varchar(50)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverter para 20 caracteres
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "contato" TYPE varchar(20)`);
    }
}
