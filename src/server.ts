import next from 'next';
import { AppConfigSingleton } from './config/AppConfigSingleton';
import { criarApp } from './http/app';
import { DatabaseSingleton } from './infra/DatabaseSingleton';
import { popularDadosDeExemplo } from './seed';

const config = AppConfigSingleton.instancia();
const db = DatabaseSingleton.instancia();

try {
  const aplicadas = await db.migrar();
  if (aplicadas.length) console.log(`Migrações aplicadas: ${aplicadas.join(', ')}`);
} catch (erro) {
  console.error('Não foi possível conectar/migrar o PostgreSQL. O banco está no ar? (docker compose up -d)');
  console.error(erro);
  process.exit(1);
}

if (config.popularDadosExemplo) await popularDadosDeExemplo();

// O Next.js roda dentro deste mesmo servidor: uma porta só para API e telas.
const front = next({ dev: !config.emProducao });
await front.prepare();

criarApp(front.getRequestHandler()).listen(config.porta, () => {
  console.log(`MultiPag rodando em ${config.urlBase}`);
});
