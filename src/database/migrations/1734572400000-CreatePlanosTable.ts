import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePlanosTable1734572400000 implements MigrationInterface {
    name = 'CreatePlanosTable1734572400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "planos",
                columns: [
                    {
                        name: "id",
                        type: "integer",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "valor",
                        type: "integer",
                        isUnique: true,
                    },
                    {
                        name: "descricao",
                        type: "varchar",
                        length: "255",
                    },
                    {
                        name: "maxDeposito",
                        type: "integer",
                    },
                    {
                        name: "popular",
                        type: "boolean",
                        default: false,
                    },
                    {
                        name: "ativo",
                        type: "boolean",
                        default: true,
                    },
                    {
                        name: "ordem",
                        type: "integer",
                        default: 0,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "now()",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "now()",
                    },
                ],
            }),
            true
        );

        // Inserir os planos iniciais
        await queryRunner.query(`
            INSERT INTO planos (valor, descricao, "maxDeposito", popular, ativo, ordem) VALUES
            (4, 'Plano Básico', 20, false, true, 1),
            (20, 'Plano Iniciante', 100, false, true, 2),
            (100, 'Plano Intermediário', 500, false, true, 3),
            (500, 'Plano Avançado', 2500, true, true, 4),
            (1000, 'Plano Profissional', 5000, false, true, 5),
            (2000, 'Plano Expert', 10000, false, true, 6),
            (5000, 'Plano Master', 25000, false, true, 7),
            (10000, 'Plano Elite', 50000, false, true, 8),
            (15000, 'Plano Premium', 75000, false, true, 9),
            (20000, 'Plano VIP', 100000, false, true, 10);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("planos");
    }
} 