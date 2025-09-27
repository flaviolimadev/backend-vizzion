import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterContatoLength1758983702815 implements MigrationInterface {
    name = 'AlterContatoLength1758983702815'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_referred_at"`);
        await queryRunner.query(`ALTER TABLE "saques" DROP CONSTRAINT "FK_saques_user_id"`);
        await queryRunner.query(`ALTER TABLE "pagamentos" DROP CONSTRAINT "FK_91bf526f578724999358ea740a5"`);
        await queryRunner.query(`ALTER TABLE "user_tokens" DROP CONSTRAINT "FK_92ce9a299624e4c4ffd99b645b6"`);
        await queryRunner.query(`ALTER TABLE "extratos" DROP CONSTRAINT "fk_extratos_user_id"`);
        await queryRunner.query(`ALTER TABLE "password_resets" DROP CONSTRAINT "FK_d95569f623f28a0bf034a55099e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_YIELD_SCHEDULE_START_TIME"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_YIELD_SCHEDULE_ACTIVE"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_USERS_EMAIL"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_USERS_CONTATO"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_PAGAMENTOS_USER_ID"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_PAGAMENTOS_STATUS"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_PAGAMENTOS_METHOD"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_USER_TOKENS_USER"`);
        await queryRunner.query(`DROP INDEX "public"."idx_extratos_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_extratos_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_extratos_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_extratos_reference"`);
        await queryRunner.query(`DROP INDEX "public"."idx_extratos_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_PASSWORD_RESETS_USER"`);
        await queryRunner.query(`ALTER TABLE "extratos" DROP CONSTRAINT "extratos_type_check"`);
        await queryRunner.query(`ALTER TABLE "pagamentos" DROP COLUMN "cpf"`);
        await queryRunner.query(`COMMENT ON COLUMN "yield_schedule"."start_time" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "yield_schedule"."end_time" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "yield_schedule"."profit_percentage" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "yield_schedule"."active" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "yield_schedule"."order_index" IS NULL`);
        await queryRunner.query(`ALTER TABLE "webhook_logs" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "webhook_logs" ALTER COLUMN "updated_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_4fdaa1645ca10e580b4d66ce5ab"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "contato"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "contato" character varying(20) NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."trading_mode" IS NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "balance_invest" TYPE numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "balance" TYPE numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "balance_block" TYPE numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "pagamentos" ALTER COLUMN "bonus_processed" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_tokens" DROP CONSTRAINT "UQ_cf8bff5dc33a46985bf6b2071ea"`);
        await queryRunner.query(`ALTER TABLE "password_resets" DROP CONSTRAINT "UQ_7f6aae0fcc807c9e7194ca5cc4a"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4fdaa1645ca10e580b4d66ce5a" ON "users" ("contato") `);
        await queryRunner.query(`CREATE INDEX "IDX_92ce9a299624e4c4ffd99b645b" ON "user_tokens" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cf8bff5dc33a46985bf6b2071e" ON "user_tokens" ("jti") `);
        await queryRunner.query(`CREATE INDEX "IDX_d95569f623f28a0bf034a55099" ON "password_resets" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7f6aae0fcc807c9e7194ca5cc4" ON "password_resets" ("tokenHash") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_4b5709d7dc2acc215facfe702a2" FOREIGN KEY ("plano") REFERENCES "planos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "saques" ADD CONSTRAINT "FK_8ff9bb899d2259902dc3ff49426" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pagamentos" ADD CONSTRAINT "FK_91bf526f578724999358ea740a5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "extratos" ADD CONSTRAINT "FK_1626d0d8f6a405b51bdec779152" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "extratos" DROP CONSTRAINT "FK_1626d0d8f6a405b51bdec779152"`);
        await queryRunner.query(`ALTER TABLE "pagamentos" DROP CONSTRAINT "FK_91bf526f578724999358ea740a5"`);
        await queryRunner.query(`ALTER TABLE "saques" DROP CONSTRAINT "FK_8ff9bb899d2259902dc3ff49426"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_4b5709d7dc2acc215facfe702a2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f6aae0fcc807c9e7194ca5cc4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d95569f623f28a0bf034a55099"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cf8bff5dc33a46985bf6b2071e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_92ce9a299624e4c4ffd99b645b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4fdaa1645ca10e580b4d66ce5a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`ALTER TABLE "password_resets" ADD CONSTRAINT "UQ_7f6aae0fcc807c9e7194ca5cc4a" UNIQUE ("tokenHash")`);
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD CONSTRAINT "UQ_cf8bff5dc33a46985bf6b2071ea" UNIQUE ("jti")`);
        await queryRunner.query(`ALTER TABLE "pagamentos" ALTER COLUMN "bonus_processed" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "balance_block" TYPE numeric(15,2)`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "balance" TYPE numeric(15,2)`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "balance_invest" TYPE numeric(15,2)`);
        await queryRunner.query(`COMMENT ON COLUMN "users"."trading_mode" IS 'Modo de trading preferido do usuário: manual ou auto'`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "contato"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "contato" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_4fdaa1645ca10e580b4d66ce5ab" UNIQUE ("contato")`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "webhook_logs" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "webhook_logs" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`COMMENT ON COLUMN "yield_schedule"."order_index" IS 'Ordem de exibição'`);
        await queryRunner.query(`COMMENT ON COLUMN "yield_schedule"."active" IS 'Se o horário está ativo'`);
        await queryRunner.query(`COMMENT ON COLUMN "yield_schedule"."profit_percentage" IS 'Percentual fixo de lucro para este horário'`);
        await queryRunner.query(`COMMENT ON COLUMN "yield_schedule"."end_time" IS 'Horário de fim (formato HH:MM)'`);
        await queryRunner.query(`COMMENT ON COLUMN "yield_schedule"."start_time" IS 'Horário de início (formato HH:MM)'`);
        await queryRunner.query(`ALTER TABLE "pagamentos" ADD "cpf" character varying(14)`);
        await queryRunner.query(`ALTER TABLE "extratos" ADD CONSTRAINT "extratos_type_check" CHECK (((type)::text = ANY (ARRAY[('deposit'::character varying)::text, ('withdrawal'::character varying)::text, ('investment'::character varying)::text, ('profit'::character varying)::text, ('referral'::character varying)::text, ('bonus'::character varying)::text, ('fee'::character varying)::text, ('refund'::character varying)::text, ('yield'::character varying)::text])))`);
        await queryRunner.query(`CREATE INDEX "IDX_PASSWORD_RESETS_USER" ON "password_resets" ("userId") `);
        await queryRunner.query(`CREATE INDEX "idx_extratos_created_at" ON "extratos" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_extratos_reference" ON "extratos" ("reference_id", "reference_type") `);
        await queryRunner.query(`CREATE INDEX "idx_extratos_status" ON "extratos" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_extratos_type" ON "extratos" ("type") `);
        await queryRunner.query(`CREATE INDEX "idx_extratos_user_id" ON "extratos" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_USER_TOKENS_USER" ON "user_tokens" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_PAGAMENTOS_METHOD" ON "pagamentos" ("method") `);
        await queryRunner.query(`CREATE INDEX "IDX_PAGAMENTOS_STATUS" ON "pagamentos" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_PAGAMENTOS_USER_ID" ON "pagamentos" ("user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_USERS_CONTATO" ON "users" ("contato") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_USERS_EMAIL" ON "users" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_YIELD_SCHEDULE_ACTIVE" ON "yield_schedule" ("active") `);
        await queryRunner.query(`CREATE INDEX "IDX_YIELD_SCHEDULE_START_TIME" ON "yield_schedule" ("start_time") `);
        await queryRunner.query(`ALTER TABLE "password_resets" ADD CONSTRAINT "FK_d95569f623f28a0bf034a55099e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "extratos" ADD CONSTRAINT "fk_extratos_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_tokens" ADD CONSTRAINT "FK_92ce9a299624e4c4ffd99b645b6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pagamentos" ADD CONSTRAINT "FK_91bf526f578724999358ea740a5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "saques" ADD CONSTRAINT "FK_saques_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_referred_at" FOREIGN KEY ("referred_at") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
