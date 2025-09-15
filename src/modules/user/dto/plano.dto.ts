import { IsInt, IsPositive, Min } from 'class-validator';

export class UpgradePlanoDto {
  @IsInt()
  @IsPositive()
  @Min(1)
  novoPlano: number;
}

export class PlanoResponseDto {
  id: number;
  valor: number;
  popular: boolean;
  maxDeposito: number;
  descricao: string;
}

export class UserPlanoResponseDto {
  planoAtual: number;
  temLicenca: boolean;
  dataCompra?: string;
  proximoUpgrade?: number;
  nomePlano?: string;
}
