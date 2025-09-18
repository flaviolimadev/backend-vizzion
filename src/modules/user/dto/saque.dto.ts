import { IsEnum, IsNumber, IsString, IsNotEmpty, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
  @IsEnum(SaqueType)
  @IsNotEmpty()
  type: SaqueType;

  @ApiProperty({ description: 'Valor do saque (mínimo R$ 10,00)', minimum: 10 })
  @IsNumber()
  @Min(10)
  amount: number;

  @ApiProperty({ description: 'CPF do usuário', maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cpf: string;

  @ApiProperty({ enum: KeyType, description: 'Tipo da chave de pagamento' })
  @IsEnum(KeyType)
  @IsNotEmpty()
  key_type: KeyType;

  @ApiProperty({ description: 'Valor da chave (CPF, email ou contato)', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key_value: string;

  @ApiProperty({ description: 'Observações opcionais', required: false })
  @IsString()
  notes?: string;
}
