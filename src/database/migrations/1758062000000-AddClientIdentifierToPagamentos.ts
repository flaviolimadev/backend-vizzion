import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClientIdentifierToPagamentos1758062000000 implements MigrationInterface {
    name = 'AddClientIdentifierToPagamentos1758062000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pagamentos" ADD "client_identifier" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pagamentos" DROP COLUMN "client_identifier"`);
    }
}

