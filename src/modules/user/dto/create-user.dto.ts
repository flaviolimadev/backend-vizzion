import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsUUID } from 'class-validator';

export class CreateUserDto {
  @ApiProperty() @IsString() nome: string;
  @ApiProperty() @IsString() sobrenome: string;

  @ApiProperty() @IsEmail() email: string;

  // Pode ajustar validações depois (ex: telefone)
  @ApiProperty() @IsString() contato: string;

  @ApiProperty() @IsString() @MinLength(8)
  password: string;

  @ApiProperty({ required: false, description: 'ID do usuário que indicou este usuário' })
  @IsOptional()
  @IsUUID()
  referred_at?: string;
}
