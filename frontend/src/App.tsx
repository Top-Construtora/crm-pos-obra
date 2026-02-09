import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ChamadosPage from '@/pages/ChamadosPage'
import ChamadoFormPage from '@/pages/ChamadoFormPage'
import ChamadoDetalhesPage from '@/pages/ChamadoDetalhesPage'
import AssistenciaTecnicaPage from '@/pages/AssistenciaTecnicaPage'
import EmpreendimentosPage from '@/pages/EmpreendimentosPage'
import TecnicosPage from '@/pages/TecnicosPage'
import ProfilePage from '@/pages/ProfilePage'
import ConfiguracoesPage from '@/pages/ConfiguracoesPage'
import PortalClientePage from '@/pages/PortalClientePage'
import AgendaTecnicaPage from '@/pages/AgendaTecnicaPage'
import RelatoriosPage from '@/pages/RelatoriosPage'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />

      {/* Rota pública para portal do cliente */}
      <Route path="/portal-cliente" element={<PortalClientePage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="assistencia" element={<AssistenciaTecnicaPage />} />
        <Route path="chamados" element={<ChamadosPage />} />
        <Route path="chamados/novo" element={<ChamadoFormPage />} />
        <Route path="chamados/:id" element={<ChamadoDetalhesPage />} />
        <Route path="chamados/:id/editar" element={<ChamadoFormPage />} />
        <Route path="empreendimentos" element={<EmpreendimentosPage />} />
        <Route path="tecnicos" element={<TecnicosPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
        <Route path="agenda" element={<AgendaTecnicaPage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
