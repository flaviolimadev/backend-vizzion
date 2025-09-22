// 📋 Exemplo de componente React para Admin Saques
// Este é um exemplo de como usar os novos endpoints no frontend

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api'; // Assumindo que você tem uma função api configurada

interface User {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  contato: string;
  balance: number;
  balance_invest: number;
  plano: number;
}

interface Saque {
  id: string;
  user_id: string;
  type: 'balance' | 'balance_invest';
  amount: number;
  tax: number;
  final_amount: number;
  status: 0 | 1 | 2 | 3; // PENDING | PROCESSING | COMPLETED | CANCELLED
  cpf: string;
  key_type: 'cpf' | 'email' | 'contato';
  key_value: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

interface ResumoSaques {
  resumo_por_status: {
    pendentes: { count: number; total_solicitado: number; total_liquido: number; total_taxa: number };
    processando: { count: number; total_solicitado: number; total_liquido: number; total_taxa: number };
    pagos: { count: number; total_solicitado: number; total_liquido: number; total_taxa: number };
    cancelados: { count: number; total_solicitado: number; total_liquido: number; total_taxa: number };
  };
  totais_gerais: {
    total_saques: number;
    total_valor_solicitado: number;
    total_valor_liquido: number;
    total_taxas_arrecadadas: number;
  };
  estatisticas: {
    taxa_media: string;
    valor_medio_saque: string;
  };
}

export default function AdminSaquesPage() {
  const [saques, setSaques] = useState<Saque[]>([]);
  const [resumo, setResumo] = useState<ResumoSaques | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Carregar dados iniciais
  useEffect(() => {
    Promise.all([
      carregarSaques(),
      carregarResumo()
    ]).finally(() => setLoading(false));
  }, [filtroStatus]);

  const carregarSaques = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroStatus) params.append('status', filtroStatus);
      params.append('limit', '50');

      const response = await api<Saque[]>(`/admin/saques?${params.toString()}`);
      setSaques(response);
    } catch (error) {
      console.error('Erro ao carregar saques:', error);
    }
  };

  const carregarResumo = async () => {
    try {
      const response = await api<ResumoSaques>('/admin/saques/resumo');
      setResumo(response);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  };

  const atualizarStatusSaque = async (saqueId: string, novoStatus: number, notes?: string) => {
    try {
      setProcessingIds(prev => new Set(prev).add(saqueId));

      await api(`/admin/saques/${saqueId}/status`, {
        method: 'PATCH',
        body: { status: novoStatus, notes }
      });

      // Recarregar dados
      await Promise.all([carregarSaques(), carregarResumo()]);
      
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do saque');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(saqueId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: number) => {
    const configs = {
      0: { label: 'PENDENTE', color: 'bg-yellow-100 text-yellow-800' },
      1: { label: 'PROCESSANDO', color: 'bg-blue-100 text-blue-800' },
      2: { label: 'PAGO', color: 'bg-green-100 text-green-800' },
      3: { label: 'CANCELADO', color: 'bg-red-100 text-red-800' }
    };
    
    const config = configs[status as keyof typeof configs];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Administração de Saques</h1>

      {/* Resumo */}
      {resumo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h3 className="text-sm font-medium text-yellow-800">Pendentes</h3>
            <p className="text-2xl font-bold text-yellow-900">
              {resumo.resumo_por_status.pendentes.count}
            </p>
            <p className="text-sm text-yellow-700">
              {formatCurrency(resumo.resumo_por_status.pendentes.total_liquido)}
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-800">Processando</h3>
            <p className="text-2xl font-bold text-blue-900">
              {resumo.resumo_por_status.processando.count}
            </p>
            <p className="text-sm text-blue-700">
              {formatCurrency(resumo.resumo_por_status.processando.total_liquido)}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-sm font-medium text-green-800">Pagos</h3>
            <p className="text-2xl font-bold text-green-900">
              {resumo.resumo_por_status.pagos.count}
            </p>
            <p className="text-sm text-green-700">
              {formatCurrency(resumo.resumo_por_status.pagos.total_liquido)}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-800">Total Geral</h3>
            <p className="text-2xl font-bold text-gray-900">
              {resumo.totais_gerais.total_saques}
            </p>
            <p className="text-sm text-gray-700">
              Taxa média: {resumo.estatisticas.taxa_media}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 flex gap-4">
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">Todos os status</option>
          <option value="0">Pendentes</option>
          <option value="1">Processando</option>
          <option value="2">Pagos</option>
          <option value="3">Cancelados</option>
        </select>

        <button
          onClick={() => Promise.all([carregarSaques(), carregarResumo()])}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Atualizar
        </button>
      </div>

      {/* Tabela de Saques */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Chave PIX
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {saques.map((saque) => (
              <tr key={saque.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      {saque.user?.nome} {saque.user?.sobrenome}
                    </div>
                    <div className="text-sm text-gray-500">
                      {saque.user?.email}
                    </div>
                    <div className="text-xs text-gray-400">
                      Plano: {saque.user?.plano || 0} | 
                      Saldo: {formatCurrency(saque.user?.balance || 0)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatCurrency(saque.amount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Taxa: {formatCurrency(saque.tax)}
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      Líquido: {formatCurrency(saque.final_amount)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(saque.status)}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div><strong>{saque.key_type.toUpperCase()}:</strong></div>
                    <div className="font-mono">{saque.key_value}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(saque.created_at)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {saque.status === 0 && (
                      <>
                        <button
                          onClick={() => atualizarStatusSaque(saque.id, 2, 'Aprovado pelo admin')}
                          disabled={processingIds.has(saque.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 disabled:opacity-50"
                        >
                          {processingIds.has(saque.id) ? '...' : 'Aprovar'}
                        </button>
                        <button
                          onClick={() => atualizarStatusSaque(saque.id, 3, 'Cancelado pelo admin')}
                          disabled={processingIds.has(saque.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50"
                        >
                          {processingIds.has(saque.id) ? '...' : 'Cancelar'}
                        </button>
                      </>
                    )}
                    {saque.status === 1 && (
                      <button
                        onClick={() => atualizarStatusSaque(saque.id, 2, 'Processamento concluído')}
                        disabled={processingIds.has(saque.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                      >
                        {processingIds.has(saque.id) ? '...' : 'Concluir'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {saques.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum saque encontrado
          </div>
        )}
      </div>
    </div>
  );
}

// 📝 Exemplo de como usar os endpoints individualmente:

// 1. Carregar resumo
// const resumo = await api<ResumoSaques>('/admin/saques/resumo');

// 2. Listar saques pendentes
// const pendentes = await api<Saque[]>('/admin/saques/pendentes');

// 3. Filtrar saques por status
// const pagos = await api<Saque[]>('/admin/saques?status=2');

// 4. Ver saques de um usuário específico
// const saquesUsuario = await api(`/admin/saques/por-usuario/${userId}`);

// 5. Atualizar status de um saque
// await api(`/admin/saques/${saqueId}/status`, {
//   method: 'PATCH',
//   body: { status: 2, notes: 'Pago via PIX' }
// });

// 6. Ver detalhes de um saque específico
// const saque = await api<Saque>(`/admin/saques/${saqueId}`);

