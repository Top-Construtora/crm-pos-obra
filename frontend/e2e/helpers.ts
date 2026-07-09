import { Page, expect } from '@playwright/test';

export const CREDENCIAIS = {
  admin: { email: 'admin@empresa.com', senha: 'admin123' },
  coordenador: { email: 'coord@empresa.com', senha: 'coord123' },
  tecnico: { email: 'joao@empresa.com', senha: 'tecnico123' },
};

/** Faz login pela tela e aguarda o redirecionamento para o dashboard. */
export async function login(
  page: Page,
  { email, senha }: { email: string; senha: string } = CREDENCIAIS.admin
) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  // Ao logar, a app navega para "/" e o header (banner) mostra "Dashboard".
  await expect(page).toHaveURL(/\/$|\/$/);
  await expect(
    page.getByRole('banner').getByRole('heading', { name: 'Dashboard', level: 1 })
  ).toBeVisible({ timeout: 15000 });
}
