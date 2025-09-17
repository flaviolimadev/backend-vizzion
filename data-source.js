const { DataSource } = require('typeorm');
const { join } = require('path');
require('dotenv').config();

module.exports = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  logging: false,
  entities: [join(process.cwd(), 'dist', '**', '*.entity.js')],
  migrations: [join(process.cwd(), 'dist', 'database', 'migrations', '*.js')],
});
