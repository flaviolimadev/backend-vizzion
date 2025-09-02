import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow(''),
  DB_DATABASE: Joi.string().required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  FRONTEND_URL: Joi.string().uri().required(),
  APP_PUBLIC_URL: Joi.string().uri().required(),

  RESEND_API_KEY: Joi.string().pattern(/^re_/).required(),
  MAIL_FROM: Joi.alternatives()
    .try(
      Joi.string().email(),
      Joi.string().pattern(/^[^<>]*<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/)
    )
    .required(),

  VERIFIED_EMAIL: Joi.boolean().default(false),
  'VERIFIED-EMAIL': Joi.boolean().optional(),

  PASSWORD_RESET_EXPIRES_MIN: Joi.number().integer().min(5).default(30),
});
