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

@Entity('anexos')
export class Anexo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'chamado_id' })
  chamadoId!: string;

  @ManyToOne(() => Chamado, (chamado) => chamado.anexos)
  @JoinColumn({ name: 'chamado_id' })
  chamado!: Chamado;

  @Column({ name: 'nome_original', type: 'varchar', length: 255 })
  nomeOriginal!: string;

  @Column({ name: 'nome_arquivo', type: 'varchar', length: 255 })
  nomeArquivo!: string;

  @Column({ type: 'int' })
  tamanho!: number;

  @Column({ type: 'varchar', length: 100 })
  tipo!: string;

  @Column({ type: 'varchar', name: 'usuario_id' })
  usuarioId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: User;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;
}
