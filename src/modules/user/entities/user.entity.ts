import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
  } from 'typeorm';
  
  @Entity('users')
  export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    nome: string;
  
    @Column()
    sobrenome: string;
  
    @Index({ unique: true })
    @Column()
    email: string;
  
    @Index({ unique: true })
    @Column()
    contato: string;
  
    // Senha será salva já criptografada pelo service
  @Column({ select: false })
    password: string;
  
    @Column({ type: 'int', default: 0 })
    status: number;
  
    @Column({ type: 'boolean', default: false })
    deleted: boolean;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ type: 'text', nullable: true, select: false })
  verification_code_hash?: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  verification_expires_at?: Date | null;
  
      @Column({ type: 'text', nullable: true })
  avatar?: string | null;

  @Column({ type: 'uuid', nullable: true })
  referred_at?: string | null;

  @Column({ type: 'int', default: 0 })
  plano: number;

  @CreateDateColumn()
  created_at: Date;
  
    @UpdateDateColumn()
    updated_at: Date;
  }
  