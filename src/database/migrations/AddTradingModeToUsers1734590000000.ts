import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddTradingModeToUsers1734590000000 implements MigrationInterface {
    name = 'AddTradingModeToUsers1734590000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("users", new TableColumn({
            name: "trading_mode",
            type: "varchar",
            length: "20",
            default: "'manual'",
            comment: "Modo de trading preferido do usuário: manual ou auto"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("users", "trading_mode");
    }
} 