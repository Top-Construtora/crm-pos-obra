import { supabase } from '../config/supabase.js';

export interface ObraTop {
  id: string;
  nome: string;
  nome_limpo?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export class ObrasSupabaseService {
  /**
   * Busca todas as obras ativas da tabela obras_top
   */
  async listarObrasAtivas(): Promise<ObraTop[]> {
    try {
      const { data, error } = await supabase
        .from('obras_top')
        .select('*')
        .order('nome_limpo', { ascending: true });

      if (error) {
        console.error('Erro ao buscar obras do Supabase:', error);
        throw new Error(`Erro ao buscar obras: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao conectar com Supabase:', error);
      throw error;
    }
  }

  /**
   * Busca uma obra específica por ID
   */
  async buscarObraPorId(id: string): Promise<ObraTop | null> {
    try {
      const { data, error } = await supabase
        .from('obras_top')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar obra do Supabase:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao conectar com Supabase:', error);
      return null;
    }
  }

  /**
   * Busca obras por nome (busca parcial)
   */
  async buscarObrasPorNome(nome: string): Promise<ObraTop[]> {
    try {
      const { data, error } = await supabase
        .from('obras_top')
        .select('*')
        .ilike('nome_limpo', `%${nome}%`)
        .order('nome_limpo', { ascending: true });

      if (error) {
        console.error('Erro ao buscar obras do Supabase:', error);
        throw new Error(`Erro ao buscar obras: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao conectar com Supabase:', error);
      throw error;
    }
  }
}

export const obrasSupabaseService = new ObrasSupabaseService();
