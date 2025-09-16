import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePagamentosTable1734600000000 implements MigrationInterface {
    name = 'CreatePagamentosTable1734600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "pagamentos",
                columns: [
                    { name: "id", type: "uuid", isPrimary: true, generationStrategy: "uuid", default: "uuid_generate_v4()" },
                    { name: "user_id", type: "uuid", isNullable: false },
                    { name: "method", type: "enum", enum: ["PIX", "CRYPTO", "BONUS"], default: "'PIX'" },
                    { name: "txid", type: "varchar", isNullable: true },
                    { name: "status", type: "int", default: 0 },
                    { name: "value", type: "int", isNullable: false },
                    { name: "pix_code", type: "text", isNullable: true },
                    { name: "pix_qrcode_url", type: "text", isNullable: true },
                    { name: "pix_expiration", type: "timestamp", isNullable: true },
                    { name: "description", type: "text", isNullable: true },
                    { name: "crypto_address", type: "text", isNullable: true },
                    { name: "crypto_network", type: "varchar", length: "50", isNullable: true },
                    { name: "crypto_type", type: "varchar", length: "50", isNullable: true },
                    { name: "created_at", type: "timestamp", default: "now()" },
                    { name: "updated_at", type: "timestamp", default: "now()" },
                ],
                indices: [
                    { name: "IDX_PAGAMENTOS_USER_ID", columnNames: ["user_id"] },
                    { name: "IDX_PAGAMENTOS_STATUS", columnNames: ["status"] },
                    { name: "IDX_PAGAMENTOS_METHOD", columnNames: ["method"] },
                ],
                foreignKeys: [
                    {
                        columnNames: ["user_id"],
                        referencedTableName: "users",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE"
                    }
                ]
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("pagamentos");
    }
}
