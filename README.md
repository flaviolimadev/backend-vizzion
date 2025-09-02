## Base Backend (NestJS 11 + TypeORM + JWT + Resend)

### Visão geral
- **Stack**: NestJS 11, TypeORM (Postgres), Config (Joi), Swagger, Helmet, JWT/Passport, Resend (e-mails)
- **Módulos**:
  - `health`: verificação de saúde da aplicação
  - `user`: CRUD completo de usuários (com hash de senha e validações)
  - `auth`: autenticação JWT (access e refresh), rotação e revogação de refresh tokens
  - `mail`: envio de e-mails com templates HTML via Resend
- **Documentação Swagger**: disponível em `/docs`

### Requisitos
- Node.js 18+
- Docker (opcional, para Postgres)

### Primeiros passos
1) Suba o banco de dados (opcional via Docker):
```bash
docker-compose up -d
# Se necessário, habilite a extensão UUID
# psql -h localhost -U app -d appdb -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

2) Instale as dependências:
```bash
npm install --no-audit --no-fund --legacy-peer-deps
```

3) Crie um arquivo `.env` na raiz com as variáveis abaixo (exemplo completo mais adiante).

4) Rode a aplicação:
```bash
npm run start:dev
```

### Variáveis de ambiente (.env)
- Aplicação:
  - `NODE_ENV` (development|test|production)
  - `PORT` (padrão 3000)
  - `FRONTEND_URL` (origem permitida no CORS)
  - `APP_PUBLIC_URL` (URL pública do frontend para montar links em e-mails)
  - `VERIFIED_EMAIL` (true para exigir confirmação por código no cadastro)
- Banco:
  - `DB_HOST`, `DB_PORT` (padrão 5432), `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- Autenticação (JWT):
  - `JWT_SECRET` (mín. 16 chars), `JWT_EXPIRES_IN` (ex: 15m)
  - `JWT_REFRESH_SECRET` (mín. 16 chars), `JWT_REFRESH_EXPIRES_IN` (ex: 7d)
- E-mail (Resend):
  - `RESEND_API_KEY` (formato `re_...`)
  - `MAIL_FROM` (ex: `Seu App <no-reply@seudominio.com>`)

Exemplo `.env`:
```bash
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=app
DB_PASSWORD=app
DB_DATABASE=appdb

FRONTEND_URL=https://seu-frontend.exemplo.com
APP_PUBLIC_URL=https://seu-frontend.exemplo.com

JWT_SECRET=uma-chave-segura-para-access
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=uma-chave-segura-para-refresh
JWT_REFRESH_EXPIRES_IN=7d

RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAIL_FROM=Base Backend <no-reply@seudominio.com>

VERIFIED_EMAIL=true
PASSWORD_RESET_EXPIRES_MIN=30
```

### Configuração e inicialização
- `src/app.module.ts` carrega configurações (`app.config`, `database.config`) e valida `.env` via Joi
- `TypeOrmModule.forRootAsync` com Postgres (`autoLoadEntities`, `synchronize: false`)
- `src/main.ts` aplica `helmet`, `ValidationPipe` global e CORS restrito a `FRONTEND_URL`
- Swagger em `/docs`
- Migrations são executadas no boot; também há scripts CLI

### Migrations e TypeORM
Scripts úteis:
```bash
npm run migration:generate # gera migration com base nas entidades
npm run migration:run      # aplica migrations pendentes
npm run migration:revert   # reverte última migration
```
Migrations incluídas:
- `AlterUsersAddBusinessFields1723520000000.ts`: cria tabela `users`
- `CreateUserTokens1723520200000.ts`: cria tabela `user_tokens` (refresh tokens)

### Módulo User (CRUD)
- Entidade `users` com campos: `id`, `nome`, `sobrenome`, `email` (unique), `contato` (unique), `password` (não selecionado por padrão), `status`, `deleted`, `avatar`, `created_at`, `updated_at`
- Senhas com `bcrypt` e nunca retornadas nas respostas por padrão
- Tratamento de erro de unicidade (email/contato)
- Endpoints:
  - `POST /users` (criar)
  - `GET /users` (listar)
  - `GET /users/:id` (buscar por id)
  - `PATCH /users/:id` (atualizar)
  - `DELETE /users/:id` (remover)
  - `POST /users/:id/verify-email` (enviar `{ code }` para confirmar e-mail quando `VERIFIED_EMAIL=true`)

### Módulo Auth (JWT)
- Login emite `access_token` + `refresh_token`
- Refresh valida token, confere hash armazenado, revoga o antigo e emite novos (rotação)
- Logout revoga todos os refresh tokens ativos do usuário
- Endpoints:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout` (protegido por JWT)
- Para proteger rotas: use `@UseGuards(JwtAuthGuard)` e Bearer Token no header

### CORS
- Apenas a URL definida em `FRONTEND_URL` pode acessar a API (`credentials: true` habilitado)

### E-mails (Resend + templates)
- Integração com Resend via SDK `resend` (ver docs em [resend.com](https://resend.com))
- Templates HTML em `src/mail/templates`:
  - `welcome.html`, `account-verification.html`, `notice.html`, `important-info.html`, `alert.html`
  - `password-reset.html`, `password-changed.html`
- Serviço `MailService` (`src/modules/mail/mail.service.ts`):
  - `sendTemplate({ to, subject, template, variables })`
  - Carrega o arquivo HTML, substitui placeholders `{{chave}}` e envia via Resend

Exemplo de envio:
```ts
await mailService.sendTemplate({
  to: 'usuario@exemplo.com',
  subject: 'Redefina sua senha',
  template: 'password-reset',
  variables: {
    app_name: 'Minha App',
    name: 'Ana',
    reset_url: 'https://app.exemplo.com/reset?token=...',
    expires_minutes: 30,
    requested_at: new Date().toISOString(),
    ip_address: '203.0.113.10',
    support_email: 'suporte@exemplo.com',
    year: new Date().getFullYear(),
  },
});
```

### Segurança
- `bcrypt` para senhas e `password` oculto por padrão nas consultas
- JWT com segredos distintos para access/refresh e rotação de refresh tokens
- Refresh tokens armazenados apenas como hash (não reversível)
- `helmet` habilitado e CORS estrito
- `synchronize: false` (sempre usar migrations)

### Troubleshooting
- Erro ao acessar `db.host`: verifique o `.env` e a validação do `ConfigModule`
- `uuid_generate_v4()` ausente: habilite `uuid-ossp` ou troque para `gen_random_uuid()` (extensão `pgcrypto`)
- CORS bloqueado: confira `FRONTEND_URL`

### Licença
Este projeto é de uso interno/base. Ajuste conforme suas necessidades.

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
