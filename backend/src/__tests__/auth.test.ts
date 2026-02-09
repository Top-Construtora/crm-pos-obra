import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'assistencia-tecnica-secret-key';

describe('Auth - JWT Token', () => {
  it('deve gerar e verificar um token valido', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@test.com',
      role: 'ADMIN' as const,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, JWT_SECRET) as typeof payload;
    expect(decoded.userId).toBe('user-123');
    expect(decoded.email).toBe('test@test.com');
    expect(decoded.role).toBe('ADMIN');
  });

  it('deve rejeitar token com secret incorreto', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@test.com',
      role: 'ADMIN' as const,
    };

    const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '7d' });

    expect(() => {
      jwt.verify(token, JWT_SECRET);
    }).toThrow();
  });

  it('deve rejeitar token expirado', () => {
    const payload = {
      userId: 'user-123',
      email: 'test@test.com',
      role: 'TECNICO' as const,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' });

    expect(() => {
      jwt.verify(token, JWT_SECRET);
    }).toThrow();
  });

  it('deve conter todos os campos necessarios no payload', () => {
    const payload = {
      userId: 'user-456',
      email: 'coord@test.com',
      role: 'COORDENADOR' as const,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const decoded = jwt.decode(token) as typeof payload & { iat: number; exp: number };

    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('email');
    expect(decoded).toHaveProperty('role');
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  it('deve diferenciar roles corretamente', () => {
    const roles = ['ADMIN', 'COORDENADOR', 'TECNICO'] as const;

    roles.forEach((role) => {
      const token = jwt.sign({ userId: '1', email: 'test@test.com', role }, JWT_SECRET);
      const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
      expect(decoded.role).toBe(role);
    });
  });
});
