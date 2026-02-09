import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Chamado } from './Chamado.js';

@Entity('vistorias')
export class Vistoria {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'chamado_id', unique: true })
  chamadoId!: string;

  @OneToOne(() => Chamado, (chamado) => chamado.vistoria)
  @JoinColumn({ name: 'chamado_id' })
  chamado!: Chamado;

  @Column({ name: 'data_vistoria', type: 'varchar', length: 10 })
  dataVistoria!: string;

  @Column({ name: 'hora_inicio', type: 'varchar', length: 5 })
  horaInicio!: string;

  @Column({ name: 'hora_termino', type: 'varchar', length: 5, nullable: true })
  horaTermino?: string;

  @Column({ name: 'tecnico_presente', type: 'varchar', length: 150 })
  tecnicoPresente!: string;

  @Column({ name: 'causa_identificada', type: 'text', nullable: true })
  causaIdentificada?: string;

  @Column({ name: 'parecer_tecnico', type: 'text', nullable: true })
  parecerTecnico?: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
