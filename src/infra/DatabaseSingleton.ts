import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { AppConfigSingleton } from '../config/AppConfigSingleton';

// NUMERIC vem do Postgres como string; convertemos para number (valores em reais).
pg.types.setTypeParser(1700, (v) => parseFloat(v));
// DATE fica como "AAAA-MM-DD", sem virar Date com fuso horário.
pg.types.setTypeParser(1082, (v) => v);

/** Arquivos SQL aplicados em ordem na primeira execução. */
const MIGRACOES = ['database.sql', '002_ajustes_figma.sql'];

/**
 * PADRÃO SINGLETON (exemplo 2 de 2)
 *
 * Único ponto de acesso ao PostgreSQL. Guarda o pool de conexões: se cada
 * repositório criasse o seu próprio pool, a aplicação abriria dezenas de
 * conexões e estouraria o limite do banco. Além disso, a transação corrente
 * precisa ser compartilhada: quando o pagamento é confirmado, o
 * PagamentoRepositorio, o CobrancaRepositorio e o BusinessRepositorio
 * precisam escrever DENTRO da mesma transação, e isso só funciona porque
 * todos pedem a conexão para a mesma instância.
 */
export class DatabaseSingleton {
  private static instanciaUnica: DatabaseSingleton | null = null;

  private readonly pool: pg.Pool;
  private readonly transacaoAtual = new AsyncLocalStorage<pg.PoolClient>();

  private constructor(url: string) {
    this.pool = new pg.Pool({ connectionString: url, max: 10 });
  }

  static instancia(): DatabaseSingleton {
    if (!DatabaseSingleton.instanciaUnica) {
      DatabaseSingleton.instanciaUnica = new DatabaseSingleton(AppConfigSingleton.instancia().databaseUrl);
    }
    return DatabaseSingleton.instanciaUnica;
  }

  /** Executa SQL; se houver uma transação aberta neste fluxo, usa a conexão dela. */
  async consultar<R extends pg.QueryResultRow = Record<string, any>>(sql: string, params: unknown[] = []): Promise<R[]> {
    const executor = this.transacaoAtual.getStore() ?? this.pool;
    const resultado = await executor.query<R>(sql, params);
    return resultado.rows;
  }

  /**
   * Tudo que for executado dentro de `fn` roda na mesma transação.
   * Transações aninhadas reaproveitam a transação externa.
   */
  async transacao<T>(fn: () => Promise<T>): Promise<T> {
    if (this.transacaoAtual.getStore()) return fn();

    const conexao = await this.pool.connect();
    try {
      await conexao.query('BEGIN');
      const resultado = await this.transacaoAtual.run(conexao, fn);
      await conexao.query('COMMIT');
      return resultado;
    } catch (erro) {
      await conexao.query('ROLLBACK');
      throw erro;
    } finally {
      conexao.release();
    }
  }

  /** Aplica os scripts de db/ que ainda não rodaram neste banco. */
  async migrar(): Promise<string[]> {
    await this.consultar(
      'CREATE TABLE IF NOT EXISTS migracao (nome VARCHAR(100) PRIMARY KEY, aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now())',
    );
    const jaAplicadas = new Set((await this.consultar<{ nome: string }>('SELECT nome FROM migracao')).map((m) => m.nome));
    const aplicadasAgora: string[] = [];

    for (const nome of MIGRACOES) {
      if (jaAplicadas.has(nome)) continue;
      const sql = await readFile(path.resolve(import.meta.dirname, '../../db', nome), 'utf8');
      await this.transacao(async () => {
        await this.consultar(sql);
        await this.consultar('INSERT INTO migracao (nome) VALUES ($1)', [nome]);
      });
      aplicadasAgora.push(nome);
    }
    return aplicadasAgora;
  }

  async fechar(): Promise<void> {
    await this.pool.end();
  }
}
