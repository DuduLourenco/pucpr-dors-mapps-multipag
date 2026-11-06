// Datas sem hora (data_nascimento) não podem mudar de dia por causa do fuso horário
process.env.TZ = 'UTC';

import express from 'express';
import { Sequelize, type Model, type ModelStatic } from 'sequelize';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSSequelize from '@adminjs/sequelize';
import { initModels } from './models/init-models';

// Conexão com o banco (mesmos dados do docker-compose desta pasta)
const sequelize = new Sequelize(
  process.env.DATABASE_URL ?? 'postgres://multipag:multipag@localhost:5434/multipag',
  { dialect: 'postgres', logging: false },
);

// Classes geradas a partir do banco (pasta src/models)
const models = initModels(sequelize);

AdminJS.registerAdapter({ Resource: AdminJSSequelize.Resource, Database: AdminJSSequelize.Database });

// Uma tela de CRUD para cada tabela, criada automaticamente a partir dos modelos
const admin = new AdminJS({
  rootPath: '/admin',
  locale: { language: 'pt-BR', availableLanguages: ['pt-BR'], withBackend: false },
  branding: { companyName: 'MultiPag (Database First)', withMadeWithLove: false },
  resources: (Object.values(models) as ModelStatic<Model>[]).map((model) => ({
    resource: model,
    options: {
      navigation: { name: 'Tabelas do banco', icon: 'Database' },
      // Colunas que já têm valor padrão no banco (criado_em, saldo, status...) não são obrigatórias no formulário
      properties: Object.fromEntries(
        Object.entries(model.getAttributes())
          .filter(([, atributo]) => atributo.defaultValue !== undefined)
          .map(([nome]) => [nome, { isRequired: false }]),
      ),
    },
  })),
});

const app = express();
app.use(admin.options.rootPath, AdminJSExpress.buildRouter(admin));

const porta = Number(process.env.PORT ?? 3334);
app.listen(porta, () => {
  console.log(`Telas de CRUD geradas: http://localhost:${porta}/admin`);
});
