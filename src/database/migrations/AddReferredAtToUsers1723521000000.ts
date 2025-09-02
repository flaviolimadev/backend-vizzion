import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReferredAtToUsers1723521000000 implements MigrationInterface {
    name = 'AddReferredAtToUsers1723521000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "referred_at" uuid NULL
        `);
        
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD CONSTRAINT "FK_users_referred_at" 
            FOREIGN KEY ("referred_at") 
            REFERENCES "users"("id") 
            ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP CONSTRAINT "FK_users_referred_at"
        `);
        
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "referred_at"
        `);
    }
}
