import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HistoricoTipo } from '../types/index.js';
import { Chamado } from './Chamado.js';
import { User } from './User.js';

@Entity('historicos')
export class Historico {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'chamado_id' })
  chamadoId!: string;

  @ManyToOne(() => Chamado, (chamado) => chamado.historico)
  @JoinColumn({ name: 'chamado_id' })
  chamado!: Chamado;

  @Column({ type: 'varchar', length: 20 })
  tipo!: HistoricoTipo;

  @Column({ type: 'text' })
  descricao!: string;

  @Column({ type: 'varchar', name: 'usuario_id' })
  usuarioId!: string;

  @ManyToOne(() => User, (user) => user.historicos)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: User;

  @Column({ name: 'dados_anteriores', type: 'text', nullable: true })
  dadosAnteriores?: string;

  @Column({ name: 'dados_novos', type: 'text', nullable: true })
  dadosNovos?: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
