import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Chamado } from './Chamado.js';

@Entity('materiais')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'chamado_id' })
  chamadoId!: string;

  @ManyToOne(() => Chamado, (chamado) => chamado.materiais)
  @JoinColumn({ name: 'chamado_id' })
  chamado!: Chamado;

  @Column({ type: 'varchar', length: 200 })
  nome!: string;

  @Column({ type: 'int', default: 1 })
  quantidade!: number;

  @Column({ name: 'valor_unitario', type: 'real', default: 0 })
  valorUnitario!: number;

  @Column({ type: 'boolean', default: false })
  aprovado!: boolean;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
