import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../database/data-source.js';
import { User } from '../entities/User.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { AuthRequest } from '../types/index.js';
import { UPLOAD_DIR } from '../middlewares/upload.middleware.js';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

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
    const user = await userRepository.findOne({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
    res.json(user.toJSON());
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// PUT /api/users/me
router.put('/me', async (req: AuthRequest, res: Response) => {
  try {
    const user = await userRepository.findOne({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

    const { nome, email } = req.body;
    if (email && email !== user.email) {
      const existing = await userRepository.findOne({ where: { email } });
      if (existing) return res.status(400).json({ error: 'Email ja cadastrado' });
      user.email = email;
    }
    if (nome) user.nome = nome;

    await userRepository.save(user);
    res.json(user.toJSON());
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// PATCH /api/users/me/password
router.patch('/me/password', async (req: AuthRequest, res: Response) => {
  try {
    const user = await userRepository.findOne({ where: { id: req.user!.id } });
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

    user.senha = await bcrypt.hash(novaSenha, 10);
    await userRepository.save(user);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// POST /api/users/me/avatar
router.post('/me/avatar', avatarUpload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await userRepository.findOne({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    user.avatar = `/uploads/${req.file.filename}`;
    await userRepository.save(user);
    res.json({ avatar: user.avatar });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Erro ao enviar avatar' });
  }
});

// GET /api/users
router.get('/', requireRoles('ADMIN', 'COORDENADOR'), async (_req, res: Response) => {
  try {
    const users = await userRepository.find({
      where: { ativo: true },
      order: { nome: 'ASC' },
    });

    res.json(users.map((u) => u.toJSON()));
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// GET /api/users/tecnicos
router.get('/tecnicos', async (_req, res: Response) => {
  try {
    const tecnicos = await userRepository.find({
      where: { role: 'TECNICO', ativo: true },
      order: { nome: 'ASC' },
    });

    res.json(tecnicos.map((u) => u.toJSON()));
  } catch (error) {
    console.error('List tecnicos error:', error);
    res.status(500).json({ error: 'Erro ao listar técnicos' });
  }
});

// GET /api/users/:id
router.get('/:id', requireRoles('ADMIN', 'COORDENADOR'), async (req, res: Response) => {
  try {
    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user.toJSON());
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// POST /api/users
router.post('/', requireRoles('ADMIN'), async (req, res: Response) => {
  try {
    const { nome, email, senha, role } = req.body;

    if (!nome || !email || !senha || !role) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const user = userRepository.create({
      nome,
      email,
      senha: senhaHash,
      role,
      ativo: true,
    });

    await userRepository.save(user);

    res.status(201).json(user.toJSON());
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireRoles('ADMIN'), async (req, res: Response) => {
  try {
    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const { nome, email, senha, role, ativo } = req.body;

    if (email && email !== user.email) {
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
      user.email = email;
    }

    if (nome) user.nome = nome;
    if (role) user.role = role;
    if (typeof ativo === 'boolean') user.ativo = ativo;
    if (senha) {
      user.senha = await bcrypt.hash(senha, 10);
    }

    await userRepository.save(user);

    res.json(user.toJSON());
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/users/:id (soft delete)
router.delete('/:id', requireRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.id === req.user?.id) {
      return res.status(400).json({ error: 'Não é possível desativar o próprio usuário' });
    }

    user.ativo = false;
    await userRepository.save(user);

    res.json({ message: 'Usuário desativado com sucesso' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erro ao desativar usuário' });
  }
});

export { router as usersRoutes };
