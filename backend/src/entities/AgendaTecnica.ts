import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Chamado } from './Chamado.js';
import { User } from './User.js';
import { StatusAtendimento } from '../types/index.js';

@Entity('agenda_tecnica')
export class AgendaTecnica {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'chamado_id' })
  chamadoId!: string;

  @ManyToOne(() => Chamado)
  @JoinColumn({ name: 'chamado_id' })
  chamado!: Chamado;

  @Column({ type: 'varchar', name: 'tecnico_id' })
  tecnicoId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tecnico_id' })
  tecnico!: User;

  @Column({ type: 'date', name: 'data_agendamento' })
  dataAgendamento!: string;

  @Column({ type: 'time', name: 'hora_inicio' })
  horaInicio!: string;

  @Column({ type: 'time', name: 'hora_fim', nullable: true })
  horaFim?: string;

  @Column({ type: 'varchar', length: 20, default: 'AGENDADO' })
  status!: StatusAtendimento;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @Column({ type: 'int', name: 'ordem_roteiro', nullable: true })
  ordemRoteiro?: number;

  @Column({ type: 'float', nullable: true })
  latitude?: number;

  @Column({ type: 'float', nullable: true })
  longitude?: number;

  @Column({ type: 'datetime', name: 'inicio_atendimento', nullable: true })
  inicioAtendimento?: Date;

  @Column({ type: 'datetime', name: 'fim_atendimento', nullable: true })
  fimAtendimento?: Date;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm!: Date;
}
