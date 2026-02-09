import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Paperclip, Upload, Download, Trash2, FileText, Image, FileSpreadsheet, Archive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { chamadosService } from '@/services/chamados.service'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AnexosTabProps {
  chamadoId: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(tipo: string) {
  if (tipo.startsWith('image/')) return { icon: Image, color: 'text-purple-500' }
  if (tipo === 'application/pdf') return { icon: FileText, color: 'text-red-500' }
  if (tipo.includes('spreadsheet') || tipo.includes('excel')) return { icon: FileSpreadsheet, color: 'text-emerald-500' }
  if (tipo.includes('zip')) return { icon: Archive, color: 'text-blue-500' }
  return { icon: FileText, color: 'text-gray-500' }
}

export function AnexosTab({ chamadoId }: AnexosTabProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: anexos = [], isLoading } = useQuery({
    queryKey: ['anexos', chamadoId],
    queryFn: () => chamadosService.getAnexos(chamadoId),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => chamadosService.uploadAnexo(chamadoId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos', chamadoId] })
      toast.success('Arquivo enviado com sucesso!')
    },
    onError: () => toast.error('Erro ao enviar arquivo'),
  })

  const deleteMutation = useMutation({
    mutationFn: (anexoId: string) => chamadosService.deleteAnexo(chamadoId, anexoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos', chamadoId] })
      toast.success('Arquivo removido')
    },
    onError: () => toast.error('Erro ao remover arquivo'),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
      e.target.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-sidebar-accent" />
        Documentos Anexados
      </h3>

      <div className="space-y-2">
        {anexos.map((anexo) => {
          const { icon: Icon, color } = getFileIcon(anexo.tipo)
          return (
            <div
              key={anexo.id}
              className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-sidebar-accent/50 transition-colors"
            >
              <Icon className={cn('h-5 w-5', color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{anexo.nomeOriginal}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatFileSize(anexo.tamanho)}
                  {anexo.usuario && ` • ${anexo.usuario.nome}`}
                  {' • '}
                  {format(new Date(anexo.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => chamadosService.downloadAnexo(chamadoId, anexo.id, anexo.nomeOriginal)}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteMutation.mutate(anexo.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        })}

        {anexos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum arquivo anexado
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,.pdf,.xlsx,.xls,.doc,.docx,.zip,.txt"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        disabled={uploadMutation.isPending}
        className={cn(
          'w-full mt-4 py-4 border-2 border-dashed rounded-lg text-muted-foreground hover:border-sidebar-accent hover:text-sidebar-accent transition-colors flex items-center justify-center gap-2',
          uploadMutation.isPending && 'opacity-50 cursor-not-allowed'
        )}
      >
        {uploadMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Clique ou arraste um arquivo aqui
          </>
        )}
      </button>
    </div>
  )
}
