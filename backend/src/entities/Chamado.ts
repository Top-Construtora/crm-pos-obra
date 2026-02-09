import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ChamadoStatus, Prioridade, TipoImovel, Categoria } from '../types/index.js';
import { User } from './User.js';
import { Empreendimento } from './Empreendimento.js';
import { Historico } from './Historico.js';
import { Comentario } from './Comentario.js';
import { Vistoria } from './Vistoria.js';
import { Material } from './Material.js';
import { Anexo } from './Anexo.js';

@Entity('chamados')
export class Chamado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', unique: true })
  numero!: number;

  @Column({ type: 'varchar', name: 'empreendimento_id' })
  empreendimentoId!: string;

  @ManyToOne(() => Empreendimento, (empreendimento) => empreendimento.chamados)
  @JoinColumn({ name: 'empreendimento_id' })
  empreendimento!: Empreendimento;

  @Column({ type: 'varchar', length: 50 })
  unidade!: string;

  @Column({ type: 'varchar', name: 'cliente_nome', length: 150 })
  clienteNome!: string;

  @Column({ type: 'varchar', name: 'cliente_telefone', length: 20 })
  clienteTelefone!: string;

  @Column({ type: 'varchar', name: 'cliente_email', length: 100, nullable: true })
  clienteEmail?: string;

  @Column({ type: 'varchar', length: 20 })
  tipo!: TipoImovel;

  @Column({ type: 'varchar', length: 30 })
  categoria!: Categoria;

  @Column({ type: 'text' })
  descricao!: string;

  @Column({ type: 'varchar', length: 20 })
  prioridade!: Prioridade;

  @Column({ type: 'int', name: 'sla_horas' })
  slaHoras!: number;

  @Column({ type: 'varchar', length: 20, default: 'ABERTO' })
  status!: ChamadoStatus;

  @Column({ type: 'varchar', name: 'responsavel_id', nullable: true })
  responsavelId?: string;

  @ManyToOne(() => User, (user) => user.chamadosResponsavel, { nullable: true })
  @JoinColumn({ name: 'responsavel_id' })
  responsavel?: User;

  @Column({ type: 'varchar', name: 'criado_por_id' })
  criadoPorId!: string;

  @ManyToOne(() => User, (user) => user.chamadosCriados)
  @JoinColumn({ name: 'criado_por_id' })
  criadoPor!: User;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm!: Date;

  @Column({ name: 'finalizado_em', type: 'datetime', nullable: true })
  finalizadoEm?: Date;

  @Column({ name: 'horas_estimadas', type: 'int', nullable: true })
  horasEstimadas?: number;

  @Column({ name: 'equipe_necessaria', type: 'varchar', length: 100, nullable: true })
  equipeNecessaria?: string;

  @OneToMany(() => Historico, (historico) => historico.chamado)
  historico!: Historico[];

  @OneToMany(() => Comentario, (comentario) => comentario.chamado)
  comentarios!: Comentario[];

  @OneToOne(() => Vistoria, (vistoria) => vistoria.chamado)
  vistoria?: Vistoria;

  @OneToMany(() => Material, (material) => material.chamado)
  materiais!: Material[];

  @OneToMany(() => Anexo, (anexo) => anexo.chamado)
  anexos!: Anexo[];
}
