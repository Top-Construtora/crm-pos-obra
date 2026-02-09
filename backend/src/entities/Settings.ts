import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  chave!: string;

  @Column({ type: 'text' })
  valor!: string;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm!: Date;
}
