import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User.js';

@Entity('notificacoes')
export class Notificacao {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'usuario_id' })
  usuarioId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: User;

  @Column({ type: 'varchar', length: 50 })
  tipo!: string;

  @Column({ type: 'varchar', length: 200 })
  titulo!: string;

  @Column({ type: 'text' })
  mensagem!: string;

  @Column({ type: 'boolean', default: false })
  lida!: boolean;

  @Column({ name: 'chamado_id', type: 'varchar', nullable: true })
  chamadoId?: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
