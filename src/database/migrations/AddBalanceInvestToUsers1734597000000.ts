import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBalanceInvestToUsers1734597000000 implements MigrationInterface {
    name = 'AddBalanceInvestToUsers1734597000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar se a coluna já existe
        const table = await queryRunner.getTable("users");
        const hasBalanceInvest = table?.findColumnByName("balance_invest");

        if (!hasBalanceInvest) {
            await queryRunner.addColumn("users", new TableColumn({
                name: "balance_invest",
                type: "decimal",
                precision: 10,
                scale: 2,
                default: 0,
                comment: "Saldo de investimento do usuário"
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("users", "balance_invest");
    }
} 