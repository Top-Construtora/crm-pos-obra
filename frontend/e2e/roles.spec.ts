import { test, expect, Page } from '@playwright/test';
import { login, CREDENCIAIS } from './helpers';

/**
 * Telas do sistema. O ProtectedRoute so exige autenticacao (nao role), entao
 * toda tela renderiza para qualquer usuario logado — o que muda por perfil e a
 * visibilidade no menu e os botoes de acao (validados separadamente abaixo).
 */
const TELAS: { path: string; nome: string; marcador: (p: Page) => ReturnType<Page['getByRole']> | ReturnType<Page['getByText']> }[] = [
  { path: '/', nome: 'Dashboard', marcador: (p) => p.getByRole('banner').getByRole('heading', { name: 'Dashboard', level: 1 }) },
  { path: '/relatorios', nome: 'Relatorios', marcador: (p) => p.getByRole('main').getByRole('heading', { name: 'Relatórios e KPIs', level: 1 }) },
  { path: '/assistencia', nome: 'Assistencia Tecnica', marcador: (p) => p.getByRole('banner').getByRole('heading', { name: 'Assistência Técnica', level: 1 }) },
  { path: '/chamados', nome: 'Chamados', marcador: (p) => p.getByRole('main').getByRole('heading', { name: 'Chamados', level: 1 }) },
  { path: '/chamados/novo', nome: 'Novo Chamado', marcador: (p) => p.getByRole('main').getByRole('heading', { name: 'Novo Chamado', level: 1 }) },
  { path: '/agenda', nome: 'Agenda Tecnica', marcador: (p) => p.getByRole('main').getByRole('heading', { name: 'Agenda Técnica', level: 1 }) },
  { path: '/empreendimentos', nome: 'Empreendimentos', marcador: (p) => p.getByRole('main').getByRole('heading', { name: 'Empreendimentos', level: 1 }) },
  { path: '/tecnicos', nome: 'Equipe Tecnica', marcador: (p) => p.getByRole('main').getByRole('heading', { name: /Usuarios|Tecnicos/, level: 1 }) },
  { path: '/perfil', nome: 'Perfil', marcador: (p) => p.getByText('Alterar Dados') },
  // /configuracoes tem guard proprio de admin — testado a parte (redireciona nao-admin).
];

const ROLES = [
  { key: 'ADMIN', cred: CREDENCIAIS.admin },
  { key: 'COORDENADOR', cred: CREDENCIAIS.coordenador },
  { key: 'TECNICO', cred: CREDENCIAIS.tecnico },
] as const;

// Visibilidade esperada de itens do menu por perfil.
const MENU_ESPERADO: Record<string, { visiveis: string[]; ocultos: string[] }> = {
  ADMIN: {
    visiveis: ['Dashboard', 'Relatórios', 'Assistência Técnica', 'Chamados', 'Agenda Técnica', 'Empreendimentos', 'Equipe Técnica', 'Configurações'],
    ocultos: [],
  },
  COORDENADOR: {
    visiveis: ['Dashboard', 'Relatórios', 'Assistência Técnica', 'Chamados', 'Agenda Técnica', 'Equipe Técnica'],
    ocultos: ['Empreendimentos', 'Configurações'],
  },
  TECNICO: {
    visiveis: ['Dashboard', 'Relatórios', 'Assistência Técnica', 'Chamados', 'Agenda Técnica'],
    ocultos: ['Empreendimentos', 'Equipe Técnica', 'Configurações'],
  },
};

const sidebar = (page: Page) => page.locator('aside').first();

for (const { key, cred } of ROLES) {
  test.describe(`Perfil ${key}`, () => {
    test.beforeEach(async ({ page }) => {
      await login(page, cred);
    });

    // Cada tela renderiza seu marcador (visitando em sequencia, uma sessao so).
    for (const tela of TELAS) {
      test(`renderiza tela: ${tela.nome}`, async ({ page }) => {
        await page.goto(tela.path);
        await expect(tela.marcador(page)).toBeVisible();
      });
    }

    test('menu mostra apenas os itens permitidos', async ({ page }) => {
      const { visiveis, ocultos } = MENU_ESPERADO[key];
      for (const item of visiveis) {
        // sem exact: "Assistência Técnica" tem um badge no nome acessivel.
        await expect(sidebar(page).getByRole('link', { name: item })).toBeVisible();
      }
      for (const item of ocultos) {
        await expect(sidebar(page).getByRole('link', { name: item })).toHaveCount(0);
      }
    });

    test('acesso a Configuracoes respeita o guard de admin', async ({ page }) => {
      await page.goto('/configuracoes');
      if (key === 'ADMIN') {
        await expect(
          page.getByRole('main').getByRole('heading', { name: 'Configurações do Sistema', level: 1 })
        ).toBeVisible();
      } else {
        // Nao-admin e redirecionado para o dashboard.
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByRole('banner').getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
      }
    });

    test('botao "Novo Chamado" respeita a permissao', async ({ page }) => {
      await page.goto('/chamados');
      await expect(page.getByRole('main').getByRole('heading', { name: 'Chamados', level: 1 })).toBeVisible();
      const podeCriar = key === 'ADMIN' || key === 'COORDENADOR';
      const botao = page.getByRole('button', { name: 'Novo Chamado' });
      if (podeCriar) {
        await expect(botao).toBeVisible();
      } else {
        await expect(botao).toHaveCount(0);
      }
    });
  });
}

test.describe('Portal do Cliente (rota publica)', () => {
  test('acessa sem autenticacao', async ({ page }) => {
    await page.goto('/portal-cliente');
    await expect(page.getByRole('heading', { name: 'Portal do Cliente', level: 1 })).toBeVisible();
  });
});
