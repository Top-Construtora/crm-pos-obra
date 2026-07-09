import { test, expect } from '@playwright/test';
import { login } from './helpers';

// O titulo da pagina vive no header do shell (banner); o conteudo nao repete o h1.
const bannerHeading = (page: import('@playwright/test').Page, name: RegExp | string) =>
  page.getByRole('banner').getByRole('heading', { name, level: 1 });

test.describe('Fluxos principais (autenticado como ADMIN)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard carrega com indicadores', async ({ page }) => {
    // "Dashboard" aparece no header (banner) e no PageHeader do conteudo.
    await expect(page.getByRole('banner').getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    await expect(page.getByText('Total de Chamados')).toBeVisible();
    await expect(page.getByText('Finalizados').first()).toBeVisible();
    await expect(page.getByText('Chamados Recentes')).toBeVisible();
  });

  test('lista de chamados renderiza a partir da API', async ({ page }) => {
    await page.getByRole('link', { name: 'Chamados' }).first().click();
    await expect(page).toHaveURL(/\/chamados$/);
    await expect(bannerHeading(page, 'Chamados')).toBeVisible();

    // Contador "N chamados encontrados" bate com a quantidade de cards renderizados.
    const contador = page.getByText(/\d+ chamados encontrados/);
    await expect(contador).toBeVisible();
    const texto = (await contador.textContent()) || '';
    const total = parseInt(texto.match(/(\d+)/)?.[1] || '0', 10);

    const cards = page.getByRole('link', { name: /Ver/ });
    if (total > 0) {
      await expect(cards.first()).toBeVisible();
      // Todo chamado tem um numero no formato #NNN.
      await expect(page.getByText(/#\d+/).first()).toBeVisible();
    }
    expect(await cards.count()).toBe(total);
  });

  test('busca de chamados filtra a lista', async ({ page }) => {
    await page.goto('/chamados');
    await expect(page.getByRole('link', { name: /Ver/ }).first()).toBeVisible();

    // Termo improvavel -> estado vazio (filtragem funcionando de ponta a ponta).
    await page.getByPlaceholder(/Buscar por cliente/i).fill('zzz-inexistente-999');
    await expect(page.getByText('Nenhum chamado encontrado')).toBeVisible();

    // Limpando a busca, a lista volta.
    await page.getByPlaceholder(/Buscar por cliente/i).fill('');
    await expect(page.getByRole('link', { name: /Ver/ }).first()).toBeVisible();
  });

  test('abre o detalhe de um chamado', async ({ page }) => {
    await page.goto('/chamados');
    await page.getByRole('link', { name: /Ver/ }).first().click();
    await expect(page).toHaveURL(/\/chamados\/[0-9a-f-]+$/);
    await expect(bannerHeading(page, 'Detalhes do Chamado')).toBeVisible();
  });

  test('lista de empreendimentos (rota de admin)', async ({ page }) => {
    await page.getByRole('link', { name: 'Empreendimentos' }).first().click();
    await expect(page).toHaveURL(/\/empreendimentos$/);
    await expect(bannerHeading(page, 'Empreendimentos')).toBeVisible();
    // Tabela com contador de total renderiza.
    await expect(page.getByText(/Total: \d+/)).toBeVisible();
  });
});
