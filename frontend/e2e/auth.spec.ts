import { test, expect } from '@playwright/test';
import { login, abrirLoginEmail, CREDENCIAIS } from './helpers';

test.describe('Autenticacao', () => {
  test('exibe a tela de login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Entre na sua conta/i })).toBeVisible();
    // Microsoft e o caminho principal; email/senha comeca recolhido.
    await expect(page.getByRole('button', { name: 'Entrar com Microsoft' })).toBeVisible();
    await expect(page.locator('#email')).toHaveCount(0);

    await page.getByRole('button', { name: 'Entrar com email e senha' }).click();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  });

  test('rejeita credenciais invalidas', async ({ page }) => {
    await abrirLoginEmail(page);
    await page.locator('#email').fill(CREDENCIAIS.admin.email);
    await page.locator('#senha').fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    // Deve mostrar o erro e permanecer na tela de login.
    await expect(page.getByText(/Credenciais invalidas/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('faz login com credenciais validas', async ({ page }) => {
    await login(page, CREDENCIAIS.admin);
    await expect(page.getByText(/Administrador/i).first()).toBeVisible();
  });

  test('protege rotas: sem login redireciona para /login', async ({ page }) => {
    await page.goto('/chamados');
    await expect(page).toHaveURL(/\/login/);
  });

  test('faz logout', async ({ page }) => {
    await login(page, CREDENCIAIS.admin);
    // Abre o menu do usuario (avatar) no header e clica em Sair.
    await page.getByRole('button', { name: 'Perfil do Usuário' }).click();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
