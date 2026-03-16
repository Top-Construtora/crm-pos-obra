import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Search } from 'lucide-react'
import { empreendimentosService } from '@/services/empreendimentos.service'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function EmpreendimentosPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: empreendimentos, isLoading } = useQuery({
    queryKey: ['empreendimentos'],
    queryFn: empreendimentosService.getAll,
  })

  // Filtrar empreendimentos com base na busca
  const filteredEmpreendimentos = useMemo(() => {
    if (!empreendimentos) return []
    if (!searchTerm) return empreendimentos

    const term = searchTerm.toLowerCase()
    return empreendimentos.filter((emp) =>
      emp.nome.toLowerCase().includes(term)
    )
  }, [empreendimentos, searchTerm])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Empreendimentos</h1>
        <p className="text-muted-foreground">
          Gerencie os empreendimentos cadastrados
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar empreendimentos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredEmpreendimentos.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Empreendimento
                    </div>
                  </th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                    Total: {filteredEmpreendimentos.length}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmpreendimentos.map((emp, index) => (
                  <tr
                    key={emp.id}
                    className={`border-b transition-colors hover:bg-muted/50 ${
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                    }`}
                  >
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-tight">{emp.nome}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        emp.ativo !== false
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {emp.ativo !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : searchTerm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              Nenhum empreendimento encontrado para "{searchTerm}"
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Nenhum empreendimento disponível</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
