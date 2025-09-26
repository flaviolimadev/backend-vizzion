import { IsEnum, IsNumber, IsString, IsNotEmpty, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum SaqueType {
  BALANCE = 'balance',
  BALANCE_INVEST = 'balance_invest'
}

export enum KeyType {
  CPF = 'cpf',
  EMAIL = 'email',
  CONTATO = 'contato'
}

export class CreateSaqueDto {
  @ApiProperty({ enum: SaqueType, description: 'Tipo de saque' })
  @IsEnum(SaqueType, { message: 'Tipo de saque deve ser balance ou balance_invest' })
  @IsNotEmpty({ message: 'Tipo de saque é obrigatório' })
  type: SaqueType;

  @ApiProperty({ description: 'Valor do saque (mínimo R$ 10,00)', minimum: 10 })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber({}, { message: 'Amount deve ser um número' })
  @Min(10, { message: 'Valor mínimo é R$ 10,00' })
  amount: number;

  @ApiProperty({ description: 'CPF do usuário', maxLength: 20 })
  @IsString({ message: 'CPF deve ser uma string' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @MaxLength(20, { message: 'CPF deve ter no máximo 20 caracteres' })
  cpf: string;

  @ApiProperty({ enum: KeyType, description: 'Tipo da chave de pagamento' })
  @IsEnum(KeyType, { message: 'Tipo de chave deve ser cpf, email ou contato' })
  @IsNotEmpty({ message: 'Tipo de chave é obrigatório' })
  key_type: KeyType;

  @ApiProperty({ description: 'Valor da chave (CPF, email ou contato)', maxLength: 100 })
  @IsString({ message: 'Chave deve ser uma string' })
  @IsNotEmpty({ message: 'Chave é obrigatória' })
  @MaxLength(100, { message: 'Chave deve ter no máximo 100 caracteres' })
  key_value: string;

  @ApiProperty({ description: 'Observações opcionais', required: false })
  @IsString()
  notes?: string;
}
