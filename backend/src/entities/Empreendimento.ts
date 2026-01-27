import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Chamado } from './Chamado.js';

@Entity('empreendimentos')
export class Empreendimento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  nome!: string;

  @Column({ type: 'varchar', length: 500 })
  endereco!: string;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm!: Date;

  @OneToMany(() => Chamado, (chamado) => chamado.empreendimento)
  chamados!: Chamado[];
}
