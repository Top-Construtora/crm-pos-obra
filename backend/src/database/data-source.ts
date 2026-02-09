import { DataSource } from 'typeorm';
import { User } from '../entities/User.js';
import { Empreendimento } from '../entities/Empreendimento.js';
import { Chamado } from '../entities/Chamado.js';
import { Historico } from '../entities/Historico.js';
import { Comentario } from '../entities/Comentario.js';
import { Vistoria } from '../entities/Vistoria.js';
import { Material } from '../entities/Material.js';
import { Anexo } from '../entities/Anexo.js';
import { Notificacao } from '../entities/Notificacao.js';
import { Settings } from '../entities/Settings.js';
import { AgendaTecnica } from '../entities/AgendaTecnica.js';

export const AppDataSource = new DataSource({
  type: 'sqljs',
  location: './database.sqlite',
  autoSave: true,
  synchronize: true,
  logging: false,
  entities: [User, Empreendimento, Chamado, Historico, Comentario, Vistoria, Material, Anexo, Notificacao, Settings, AgendaTecnica],
  migrations: [],
  subscribers: [],
});
