import path from 'node:path';
import express, { Router } from 'express';
import QRCode from 'qrcode';
import { BusinessService } from '../crud/BusinessService';
import { CobrancaService } from '../crud/CobrancaService';
import { SaqueService } from '../crud/SaqueService';
import { AuthService } from '../services/AuthService';
import { ExtratoService } from '../services/ExtratoService';
import { PagamentoService } from '../services/PagamentoService';
import { autenticar, contexto, tratarErros } from './middlewares';
import { rotasCrud } from './rotasCrud';

export function criarApp() {
  const businessService = new BusinessService();
  const cobrancaService = new CobrancaService();
  const saqueService = new SaqueService();
  const authService = new AuthService();
  const extratoService = new ExtratoService();
  const pagamentoService = new PagamentoService();

  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.resolve(import.meta.dirname, '../../public')));

  // ------------------------- rotas públicas -------------------------
  const publico = Router();

  publico.post('/business', async (req, res) => {
    res.status(201).json(await businessService.cadastrar(req.body));
  });

  publico.post('/auth/login', async (req, res) => {
    res.json(await authService.login(req.body?.email, req.body?.senha));
  });

  publico.get('/publico/cobrancas/:token', async (req, res) => {
    res.json(await pagamentoService.cobrancaPublica(req.params.token));
  });

  publico.post('/publico/cobrancas/:token/pagamentos', async (req, res) => {
    res.status(201).json(await pagamentoService.pagar(req.params.token, req.body ?? {}));
  });

  publico.get('/publico/pagamentos/:id', async (req, res) => {
    res.json(await pagamentoService.consultarPagamento(req.params.id));
  });

  publico.get('/publico/qrcode', async (req, res) => {
    const texto = String(req.query.texto ?? '').slice(0, 1000);
    res.type('image/svg+xml').send(await QRCode.toString(texto || ' ', { type: 'svg', margin: 0 }));
  });

  // Chamado pelos gateways (Pix, boleto, cripto) quando o pagamento é liquidado.
  publico.post('/webhooks/:gateway', async (req, res) => {
    const pagamento = await pagamentoService.receberWebhook(req.params.gateway, req.body);
    res.json({ recebido: true, status: pagamento.status });
  });

  // ------------------------ rotas autenticadas ------------------------
  const privado = Router();
  privado.use(autenticar);

  privado.get('/business/me', async (_req, res) => {
    const ctx = contexto(res);
    res.json(await businessService.buscar(ctx.businessId!, ctx));
  });
  privado.put('/business/me', async (req, res) => {
    const ctx = contexto(res);
    res.json(await businessService.atualizar(ctx.businessId!, req.body, ctx));
  });
  privado.delete('/business/me', async (_req, res) => {
    const ctx = contexto(res);
    await businessService.remover(ctx.businessId!, ctx);
    res.status(204).end();
  });

  privado.use('/cobrancas', rotasCrud(cobrancaService));
  privado.use('/saques', rotasCrud(saqueService));

  privado.get('/extrato', async (req, res) => {
    res.json(
      await extratoService.consultar(contexto(res).businessId!, {
        mes: req.query.mes as string | undefined,
        tipo: req.query.tipo as string | undefined,
        limite: req.query.limite ? Number(req.query.limite) : undefined,
      }),
    );
  });
  privado.get('/extrato/exportar', async (req, res) => {
    const arquivo = await extratoService.exportar(
      contexto(res).businessId!,
      String(req.query.formato ?? 'csv'),
      req.query.mes as string | undefined,
    );
    res.type(arquivo.contentType).attachment(arquivo.nomeArquivo).send(arquivo.conteudo);
  });

  app.use('/api', publico, privado);
  app.use('/api', (_req, res) => {
    res.status(404).json({ codigo: 'ROTA_INEXISTENTE', mensagem: 'Rota não encontrada.' });
  });
  app.use(tratarErros);
  return app;
}
