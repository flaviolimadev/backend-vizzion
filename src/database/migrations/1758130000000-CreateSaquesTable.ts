import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSaquesTable1758130000000 implements MigrationInterface {
    name = 'CreateSaquesTable1758130000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."saques_type_enum" AS ENUM('balance', 'balance_invest')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."saques_key_type_enum" AS ENUM('cpf', 'email', 'contato')
        `);
        await queryRunner.query(`
            CREATE TABLE "saques" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "type" "public"."saques_type_enum" NOT NULL DEFAULT 'balance',
                "amount" numeric(10,2) NOT NULL,
                "tax" numeric(10,2) NOT NULL,
                "final_amount" numeric(10,2) NOT NULL,
                "status" integer NOT NULL DEFAULT '0',
                "cpf" character varying(20) NOT NULL,
                "key_type" "public"."saques_key_type_enum" NOT NULL,
                "key_value" character varying(100) NOT NULL,
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_saques" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "saques" 
            ADD CONSTRAINT "FK_saques_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "saques" DROP CONSTRAINT "FK_saques_user_id"`);
        await queryRunner.query(`DROP TABLE "saques"`);
        await queryRunner.query(`DROP TYPE "public"."saques_key_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."saques_type_enum"`);
    }
}
