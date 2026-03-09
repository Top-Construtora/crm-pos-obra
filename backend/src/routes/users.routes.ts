import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { UPLOAD_DIR } from '../middlewares/upload.middleware.js';
import { toCamel, sanitizeUser, sanitizeUsers } from '../utils/db.js';

const router = Router();

// Avatar upload config (images only, 2MB)
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `avatar_${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens sao permitidas'));
    }
  },
});

// Aplicar auth em todas as rotas
router.use(authMiddleware);

// GET /api/users/me
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    res.json(sanitizeUser(toCamel(user)));
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// PUT /api/users/me
router.put('/me', async (req: AuthRequest, res: Response) => {
  try {
    const { nome, email } = req.body;
    const updates: any = {};

    if (email && email !== req.user!.email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) return res.status(400).json({ error: 'Email ja cadastrado' });
      updates.email = email;
    }
    if (nome) updates.nome = nome;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error) throw error;
    res.json(sanitizeUser(toCamel(user)));
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// PATCH /api/users/me/password
router.patch('/me/password', async (req: AuthRequest, res: Response) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

    const { senhaAtual, novaSenha, confirmarSenha } = req.body;
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return res.status(400).json({ error: 'Todos os campos sao obrigatorios' });
    }
    if (novaSenha !== confirmarSenha) {
      return res.status(400).json({ error: 'As senhas nao conferem' });
    }
    if (novaSenha.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no minimo 6 caracteres' });
    }

    const validPassword = await bcrypt.compare(senhaAtual, user.senha);
    if (!validPassword) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await supabase.from('users').update({ senha: senhaHash }).eq('id', req.user!.id);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// POST /api/users/me/avatar
router.post('/me/avatar', avatarUpload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const avatar = `/uploads/${req.file.filename}`;
    await supabase.from('users').update({ avatar }).eq('id', req.user!.id);

    res.json({ avatar });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Erro ao enviar avatar' });
  }
});

// GET /api/users
router.get('/', requireRoles('ADMIN', 'COORDENADOR'), async (_req, res: Response) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) throw error;
    res.json(sanitizeUsers(users.map(toCamel)));
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Erro ao listar usuarios' });
  }
});

// GET /api/users/tecnicos
router.get('/tecnicos', async (_req, res: Response) => {
  try {
    const { data: tecnicos, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'TECNICO')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) throw error;
    res.json(sanitizeUsers(tecnicos.map(toCamel)));
  } catch (error) {
    console.error('List tecnicos error:', error);
    res.status(500).json({ error: 'Erro ao listar tecnicos' });
  }
});

// GET /api/users/:id
router.get('/:id', requireRoles('ADMIN', 'COORDENADOR'), async (req, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    res.json(sanitizeUser(toCamel(user)));
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuario' });
  }
});

// POST /api/users
router.post('/', requireRoles('ADMIN'), async (req, res: Response) => {
  try {
    const { nome, email, senha, role } = req.body;

    if (!nome || !email || !senha || !role) {
      return res.status(400).json({ error: 'Todos os campos sao obrigatorios' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Email ja cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const { data: user, error } = await supabase
      .from('users')
      .insert({ nome, email, senha: senhaHash, role, ativo: true })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(sanitizeUser(toCamel(user)));
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Erro ao criar usuario' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireRoles('ADMIN'), async (req, res: Response) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    const { nome, email, senha, role, ativo } = req.body;
    const updates: any = {};

    if (email && email !== user.email) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Email ja cadastrado' });
      }
      updates.email = email;
    }

    if (nome) updates.nome = nome;
    if (role) updates.role = role;
    if (typeof ativo === 'boolean') updates.ativo = ativo;
    if (senha) {
      updates.senha = await bcrypt.hash(senha, 10);
    }

    const { data: updated, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(sanitizeUser(toCamel(updated)));
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuario' });
  }
});

// DELETE /api/users/:id (soft delete)
router.delete('/:id', requireRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    if (user.id === req.user?.id) {
      return res.status(400).json({ error: 'Nao e possivel desativar o proprio usuario' });
    }

    await supabase.from('users').update({ ativo: false }).eq('id', req.params.id);

    res.json({ message: 'Usuario desativado com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erro ao desativar usuario' });
  }
});

export { router as usersRoutes };
