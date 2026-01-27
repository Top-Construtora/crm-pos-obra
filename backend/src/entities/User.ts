import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../types/index.js';
import { Chamado } from './Chamado.js';
import { Historico } from './Historico.js';
import { Comentario } from './Comentario.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  senha!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'TECNICO',
  })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm!: Date;

  @OneToMany(() => Chamado, (chamado) => chamado.responsavel)
  chamadosResponsavel!: Chamado[];

  @OneToMany(() => Chamado, (chamado) => chamado.criadoPor)
  chamadosCriados!: Chamado[];

  @OneToMany(() => Historico, (historico) => historico.usuario)
  historicos!: Historico[];

  @OneToMany(() => Comentario, (comentario) => comentario.usuario)
  comentarios!: Comentario[];

  toJSON() {
    const { senha, ...rest } = this;
    return rest;
  }
}
