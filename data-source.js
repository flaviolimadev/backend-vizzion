// data-source.js - Configuração do TypeORM em JavaScript para CLI
require('dotenv').config();
const { DataSource } = require('typeorm');
const { join } = require('path');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  logging: true,
  entities: [
    join(__dirname, 'dist', '**', '*.entity.js')
  ],
  migrations: [
    join(__dirname, 'dist', 'database', 'migrations', '*.js')
  ],
});

module.exports = { AppDataSource }; 