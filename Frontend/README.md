# Interface do Task Flow

Interface React e TypeScript para a API ASP.NET do Task Flow. Consulte o README na raiz do repositório para iniciar o backend e configurar o SQL Server.

## Desenvolvimento

```bash
npm ci
npm run dev
```

Por padrão, o frontend usa `/api` na mesma origem: em desenvolvimento, o Vite encaminha esse caminho ao backend configurado em `vite.config.ts`; com Docker, o Nginx encaminha as requisições para a API. Mantenha esse caminho para executar o projeto sem configurar CORS. Uma URL de API em outra origem exige uma configuração de CORS adicional no backend, que este projeto não fornece. Verificações locais:

```bash
npm test
npm run lint
npm run build
```

## Organização

- `src/app`: composição das rotas, navegação principal e estilos globais.
- `src/features/tasks`: lista, filtros, detalhes, criação e API de tarefas. Os filtros, ordenação e página permanecem na URL.
- `src/features/people`: diretório, cadastro, seleção paginada e API de pessoas.
- `src/features/summary`: painel de prazos e atalhos.
- `src/shared`: cliente HTTP, funções genéricas de validação, links e datas. Contratos e validações de tarefas e pessoas ficam nas respectivas features.
- `tests`: fluxos de navegação, foco, paginação e contratos da API.

As rotas são `/`, `/tarefas`, `/tarefas/nova`, `/tarefas/:taskId` e `/pessoas`. Links antigos com filtros na raiz, como `/?q=...`, são redirecionados para `/tarefas?q=...`. A navegação usa React Router e mantém o foco no título da página após a troca de rota.

O TypeScript usa `strict`, mas os payloads da API também são validados em execução. Edições, mudanças de estado e exclusões enviam a versão da tarefa no cabeçalho `If-Match`; em caso de conflito, os detalhes são recarregados para revisão.
