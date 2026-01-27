import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Chamado } from './Chamado.js';
import { User } from './User.js';

@Entity('comentarios')
export class Comentario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'chamado_id' })
  chamadoId!: string;

  @ManyToOne(() => Chamado, (chamado) => chamado.comentarios)
  @JoinColumn({ name: 'chamado_id' })
  chamado!: Chamado;

  @Column({ type: 'text' })
  texto!: string;

  @Column({ type: 'varchar', name: 'usuario_id' })
  usuarioId!: string;

  @ManyToOne(() => User, (user) => user.comentarios)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: User;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
