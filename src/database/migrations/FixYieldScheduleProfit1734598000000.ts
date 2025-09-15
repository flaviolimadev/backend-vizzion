import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class FixYieldScheduleProfit1734598000000 implements MigrationInterface {
    name = 'FixYieldScheduleProfit1734598000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adicionar nova coluna profit_percentage (temporariamente nullable)
        await queryRunner.addColumn("yield_schedule", new TableColumn({
            name: "profit_percentage",
            type: "decimal",
            precision: 5,
            scale: 3,
            isNullable: true,
            comment: "Percentual fixo de lucro para este horário"
        }));

        // Atualizar os dados existentes com percentuais específicos
        await queryRunner.query(`
            UPDATE yield_schedule SET 
                profit_percentage = CASE 
                    WHEN start_time = '00:00' THEN 0.008
                    WHEN start_time = '04:00' THEN 0.0033
                    WHEN start_time = '08:00' THEN 0.012
                    WHEN start_time = '12:00' THEN 0.015
                    WHEN start_time = '16:00' THEN 0.010
                    WHEN start_time = '20:00' THEN 0.007
                    ELSE 0.008
                END;
        `);

        // Tornar a coluna NOT NULL após popular os dados
        await queryRunner.query(`
            ALTER TABLE yield_schedule ALTER COLUMN profit_percentage SET NOT NULL;
        `);

        // Remover as colunas antigas
        await queryRunner.dropColumn("yield_schedule", "profit_percentage_min");
        await queryRunner.dropColumn("yield_schedule", "profit_percentage_max");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recriar as colunas originais
        await queryRunner.addColumn("yield_schedule", new TableColumn({
            name: "profit_percentage_min",
            type: "decimal",
            precision: 5,
            scale: 3,
            comment: "Percentual mínimo de lucro"
        }));

        await queryRunner.addColumn("yield_schedule", new TableColumn({
            name: "profit_percentage_max", 
            type: "decimal",
            precision: 5,
            scale: 3,
            comment: "Percentual máximo de lucro"
        }));

        // Restaurar dados padrão
        await queryRunner.query(`
            UPDATE yield_schedule SET 
                profit_percentage_min = 0.005,
                profit_percentage_max = 0.015;
        `);

        // Remover a coluna profit_percentage
        await queryRunner.dropColumn("yield_schedule", "profit_percentage");
    }
} 