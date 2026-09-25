import { Cobranca } from '../domain/Cobranca';
import { Cpf } from '../domain/Cpf';
import { ItemCobranca } from '../domain/ItemCobranca';
import type { MetodoPagamento } from '../domain/tipos';
import { RepositorioPostgres } from './RepositorioPostgres';

type Linha = Record<string, any>;

/**
 * Cobrança ocupa três tabelas: cobranca, cobranca_item e
 * cobranca_metodo_pagamento (a do schema original, RF04).
 */
export class CobrancaRepositorio extends RepositorioPostgres<Cobranca> {
  protected readonly tabela = 'cobranca';

  async listarDoBusiness(businessId: string): Promise<Cobranca[]> {
    return this.buscarOnde('business_id = $1 ORDER BY criado_em DESC', [businessId]);
  }

  async buscarPorToken(token: string): Promise<Cobranca | undefined> {
    const [cobranca] = await this.buscarOnde('link_pagamento = $1', [token]);
    return cobranca;
  }

  /** Carrega itens e métodos de todas as cobranças com 2 consultas (evita N+1). */
  protected async hidratar(linhas: Linha[]): Promise<Cobranca[]> {
    if (linhas.length === 0) return [];
    const ids = linhas.map((l) => l.id);
    const itens = await this.db.consultar(
      'SELECT * FROM cobranca_item WHERE cobranca_id = ANY($1) ORDER BY ordem',
      [ids],
    );
    const metodos = await this.db.consultar(
      'SELECT * FROM cobranca_metodo_pagamento WHERE cobranca_id = ANY($1)',
      [ids],
    );
    return linhas.map((l) => {
      l.itens = itens.filter((i) => i.cobranca_id === l.id);
      l.metodos = metodos.filter((m) => m.cobranca_id === l.id).map((m) => m.metodo);
      return this.deLinha(l);
    });
  }

  protected deLinha(l: Linha): Cobranca {
    return Cobranca.restaurar(
      {
        businessId: l.business_id,
        itens: (l.itens ?? []).map((i: Linha) => new ItemCobranca(i.descricao, i.quantidade, i.valor_unitario)),
        metodos: (l.metodos ?? []) as MetodoPagamento[],
        parcelasMaximas: l.parcelas_maximas,
        criptomoedas: l.criptomoedas ?? [],
        recorrencia: {
          tipo: l.recorrencia,
          inicio: l.recorrencia_inicio ?? undefined,
          repeticoes: l.recorrencia_repeticoes ?? undefined,
        },
        clienteCpf: l.cliente_cpf ? Cpf.criar(l.cliente_cpf) : undefined,
        clienteNome: l.cliente_nome ?? undefined,
        clienteEmail: l.cliente_email ?? undefined,
      },
      { id: l.id, criadoEm: l.criado_em },
      { linkToken: l.link_pagamento, status: l.status, pagoEm: l.pago_em ?? undefined },
    );
  }

  protected paraLinha(c: Cobranca) {
    return {
      business_id: c.businessId,
      cliente_cpf: c.clienteCpf?.valor ?? null,
      cliente_nome: c.clienteNome ?? null,
      cliente_email: c.clienteEmail ?? null,
      valor: c.valor,
      descricao: c.descricao.slice(0, 255),
      // A coluna guarda o token; a URL completa é montada com AppConfigSingleton.urlBase.
      link_pagamento: c.linkToken,
      status: c.statusPersistido,
      pago_em: c.pagoEm ?? null,
      recorrencia: c.recorrencia.tipo,
      recorrencia_inicio: c.recorrencia.inicio ?? null,
      recorrencia_repeticoes: c.recorrencia.repeticoes ?? null,
      parcelas_maximas: c.parcelasMaximas,
      criptomoedas: c.criptomoedas,
    };
  }

  /** Regrava itens e métodos (a cobrança é sempre salva por inteiro). */
  protected async aposGravar(c: Cobranca): Promise<void> {
    await this.db.consultar('DELETE FROM cobranca_item WHERE cobranca_id = $1', [c.id]);
    await this.db.consultar('DELETE FROM cobranca_metodo_pagamento WHERE cobranca_id = $1', [c.id]);
    for (const [ordem, item] of c.itens.entries()) {
      await this.db.consultar(
        'INSERT INTO cobranca_item (cobranca_id, descricao, quantidade, valor_unitario, ordem) VALUES ($1, $2, $3, $4, $5)',
        [c.id, item.descricao, item.quantidade, item.valorUnitario, ordem],
      );
    }
    for (const metodo of c.metodos) {
      await this.db.consultar('INSERT INTO cobranca_metodo_pagamento (cobranca_id, metodo) VALUES ($1, $2)', [
        c.id,
        metodo,
      ]);
    }
  }
}
