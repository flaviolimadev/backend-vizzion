import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty() @IsString() nome: string;
  @ApiProperty() @IsString() sobrenome: string;

  @ApiProperty() @IsEmail() email: string;

  @ApiProperty({ description: 'Contato/telefone do usuário (até 50 caracteres)' }) 
  @IsString() 
  @MaxLength(50, { message: 'Contato deve ter no máximo 50 caracteres' })
  contato: string;

  @ApiProperty() @IsString() @MinLength(8)
  password: string;

  @ApiProperty({ required: false, description: 'ID do usuário que indicou este usuário' })
  @IsOptional()
  @IsUUID()
  referred_at?: string;
}
