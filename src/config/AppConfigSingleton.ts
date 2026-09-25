import type { MetodoPagamento } from '../domain/tipos';
import { arredondar } from '../shared/validacao';

/**
 * PADRÃO SINGLETON (exemplo 1 de 2)
 *
 * Configuração da aplicação lida UMA vez das variáveis de ambiente.
 * Taxas, URL base, credenciais dos gateways e limites de saque são usados
 * por várias classes (processadores de pagamento, adapters, cobrança,
 * saque). Todas recebem exatamente a mesma instância, então não existe
 * risco de uma parte do sistema cobrar uma taxa diferente da outra.
 */
export class AppConfigSingleton {
  private static instanciaUnica: AppConfigSingleton | null = null;

  readonly porta: number;
  readonly urlBase: string;
  readonly databaseUrl: string;
  readonly segredoToken: string;
  readonly horasValidadeSessao: number;
  readonly popularDadosExemplo: boolean;
  /** Percentual cobrado pela plataforma sobre cada pagamento (0.0099 = 0,99%). */
  readonly taxaPercentual: Readonly<Record<MetodoPagamento, number>>;
  /** Boleto tem tarifa fixa por título, independente do valor. */
  readonly tarifaFixaBoleto: number;
  readonly valorMinimoSaque: number;
  readonly diasValidadeLink: number;
  /** Quanto tempo os gateways de sandbox demoram para "liquidar" Pix/boleto/cripto. */
  readonly atrasoLiquidacaoMs: number;
  readonly credenciais: Readonly<{ pixClientId: string; cartaoApiKey: string; criptoApiKey: string }>;

  // Construtor privado: ninguém fora da classe consegue dar "new AppConfigSingleton()".
  private constructor(env: NodeJS.ProcessEnv) {
    this.porta = Number(env.PORT ?? 3333);
    this.urlBase = env.URL_BASE ?? `http://localhost:${this.porta}`;
    this.databaseUrl = env.DATABASE_URL ?? 'postgres://multipag:multipag@localhost:5433/multipag';
    this.segredoToken = env.SEGREDO_TOKEN ?? 'troque-este-segredo';
    this.horasValidadeSessao = Number(env.HORAS_VALIDADE_SESSAO ?? 12);
    this.popularDadosExemplo = (env.SEED ?? 'true') !== 'false';
    this.taxaPercentual = Object.freeze({
      pix: Number(env.TAXA_PIX ?? 0.0099),
      cartao: Number(env.TAXA_CARTAO ?? 0.0399),
      boleto: 0,
      cripto: Number(env.TAXA_CRIPTO ?? 0.015),
    });
    this.tarifaFixaBoleto = Number(env.TARIFA_BOLETO ?? 3.49);
    this.valorMinimoSaque = Number(env.VALOR_MINIMO_SAQUE ?? 10);
    this.diasValidadeLink = Number(env.DIAS_VALIDADE_LINK ?? 7);
    this.atrasoLiquidacaoMs = Number(env.SANDBOX_LIQUIDACAO_MS ?? 6000);
    this.credenciais = Object.freeze({
      pixClientId: env.PIX_CLIENT_ID ?? 'sandbox-pix',
      cartaoApiKey: env.CARTAO_API_KEY ?? 'sk_test_multipag',
      criptoApiKey: env.CRIPTO_API_KEY ?? 'sandbox-cripto',
    });
    Object.freeze(this);
  }

  /** Ponto único de acesso. A instância é criada na primeira chamada (lazy). */
  static instancia(): AppConfigSingleton {
    if (!AppConfigSingleton.instanciaUnica) {
      AppConfigSingleton.instanciaUnica = new AppConfigSingleton(process.env);
    }
    return AppConfigSingleton.instanciaUnica;
  }

  taxaPara(metodo: MetodoPagamento, valor: number): number {
    return arredondar(valor * this.taxaPercentual[metodo]);
  }

  /** URL que os gateways chamam para avisar que um pagamento foi liquidado. */
  urlWebhook(gateway: MetodoPagamento): string {
    return `${this.urlBase}/api/webhooks/${gateway}`;
  }
}
