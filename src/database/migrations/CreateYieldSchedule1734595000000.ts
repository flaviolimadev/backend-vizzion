import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateYieldSchedule1734595000000 implements MigrationInterface {
    name = 'CreateYieldSchedule1734595000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "yield_schedule",
                columns: [
                    { name: "id", type: "integer", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "start_time", type: "varchar", length: "5", comment: "Horário de início (formato HH:MM)" },
                    { name: "end_time", type: "varchar", length: "5", comment: "Horário de fim (formato HH:MM)" },
                    { name: "profit_percentage_min", type: "decimal", precision: 5, scale: 3, comment: "Percentual mínimo de lucro" },
                    { name: "profit_percentage_max", type: "decimal", precision: 5, scale: 3, comment: "Percentual máximo de lucro" },
                    { name: "active", type: "boolean", default: true, comment: "Se o horário está ativo" },
                    { name: "order_index", type: "integer", default: 0, comment: "Ordem de exibição" },
                    { name: "created_at", type: "timestamp", default: "now()" },
                    { name: "updated_at", type: "timestamp", default: "now()" },
                ],
                indices: [
                    { name: "IDX_YIELD_SCHEDULE_START_TIME", columnNames: ["start_time"] },
                    { name: "IDX_YIELD_SCHEDULE_ACTIVE", columnNames: ["active"] },
                ]
            }),
            true
        );

        // Inserir os horários padrão
        await queryRunner.query(`
            INSERT INTO yield_schedule (start_time, end_time, profit_percentage_min, profit_percentage_max, active, order_index) VALUES
            ('00:00', '00:30', 0.005, 0.015, true, 1),
            ('04:00', '04:30', 0.005, 0.015, true, 2),
            ('08:00', '08:30', 0.005, 0.015, true, 3),
            ('12:00', '12:30', 0.005, 0.015, true, 4),
            ('16:00', '16:30', 0.005, 0.015, true, 5),
            ('20:00', '20:30', 0.005, 0.015, true, 6);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("yield_schedule");
    }
} 