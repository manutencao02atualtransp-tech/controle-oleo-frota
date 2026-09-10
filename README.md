# Controle de Óleo da Frota — Supabase

Versão 3.0 preparada para usar o Supabase como banco online e o Render como hospedagem do Node/Express.

## Variáveis de ambiente

Configure no servidor:
- SUPABASE_URL=https://SEU_PROJETO.supabase.co
- SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

Não coloque uma secret/service_role key no navegador nem no GitHub.

## Local

1. `npm install`
2. Defina as duas variáveis de ambiente.
3. `npm start`
4. Abra `http://localhost:3000`

## Render

- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Adicione `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` em Environment Variables.

## Banco

As tabelas e views foram criadas no SQL Editor durante a configuração:
frota, estoque, trocas, fornecedores, alertas e consumo_mensal.

## Observação de segurança

Esta versão usa a chave publicável no backend. Para um sistema com vários usuários e dados empresariais, o próximo passo recomendado é adicionar autenticação e políticas RLS no Supabase.
