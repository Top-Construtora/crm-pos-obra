import { test, expect } from '@playwright/test';
import { login, CREDENCIAIS } from './helpers';

test.describe('Autenticacao', () => {
  test('exibe a tela de login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Bem-vindo/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  });

  test('rejeita credenciais invalidas', async ({ page }) => {
    await page.goto('/login');
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
