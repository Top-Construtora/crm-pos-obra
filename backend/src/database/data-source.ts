import { DataSource } from 'typeorm';
import { User } from '../entities/User.js';
import { Empreendimento } from '../entities/Empreendimento.js';
import { Chamado } from '../entities/Chamado.js';
import { Historico } from '../entities/Historico.js';
import { Comentario } from '../entities/Comentario.js';

export const AppDataSource = new DataSource({
  type: 'sqljs',
  location: './database.sqlite',
  autoSave: true,
  synchronize: true,
  logging: false,
  entities: [User, Empreendimento, Chamado, Historico, Comentario],
  migrations: [],
  subscribers: [],
});
