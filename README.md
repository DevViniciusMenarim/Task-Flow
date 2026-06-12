# 🚀 TaskFlow - Sistema Full-Stack (React + .NET 8)

Uma aplicação Full-Stack corporativa desenvolvida com **React (TypeScript)** no Front-end e **C# / .NET 8** no Back-end, focada em escalabilidade, manutenibilidade e aplicação de padrões rigorosos de engenharia de software.

O projeto consiste num sistema completo de gestão de Tarefas e Usuários. A API foi construída seguindo os princípios da **Arquitetura Limpa (Clean Architecture)**, mantendo as regras de negócio totalmente isoladas de detalhes de infraestrutura, enquanto a interface web consome estes dados de forma reativa, tipada e transparente.

---

## 🛠️ Tecnologias e Padrões Utilizados

Este projeto foi desenhado para simular o ambiente e as exigências técnicas de grandes sistemas empresariais, utilizando a seguinte stack:

### Back-end (API)
* **Linguagem & Framework:** C# 12 e .NET 8
* **Banco de Dados:** SQL Server
* **ORM:** Entity Framework Core (Abordagem Code-First)
* **Documentação da API:** Swagger (OpenAPI)
* **Arquitetura:** Clean Architecture (Domínio, Aplicação, Infraestrutura e API)
* **Padrões de Projeto (Design Patterns) Aplicados:**
  * **Repository Pattern:** Abstração completa do acesso aos dados.
  * **Dependency Injection:** Baixo acoplamento gerenciado pelo contêiner nativo do .NET.
  * **Data Transfer Objects (DTOs):** Tráfego de dados seguro e performático.

### Front-end (Web)
* **Framework:** React com Vite
* **Linguagem:** TypeScript (Garantindo tipagem estrita no espelhamento dos DTOs do Back-end)
* **Cliente HTTP:** Axios para consumo das rotas RESTful
* **Gerenciamento de Estado:** Hooks nativos do React (`useState`, `useEffect`)

---

## 🏗️ Estrutura da Solução

A divisão de pastas do ecossistema foi estruturada de forma a garantir a máxima separação de responsabilidades (*Separation of Concerns*):

### Solução .NET (Back-end)
1. **`TaskFlow.Domain`:** O coração do sistema. Contém as Entidades de negócio (`User`, `TaskItem`), *Enums* e as Interfaces de Contrato dos Repositórios. **Não possui dependências externas.**
2. **`TaskFlow.Application`:** Camada de casos de uso. Contém os Serviços com as regras de negócio e os DTOs que mapeiam a entrada e saída de dados.
3. **`TaskFlow.Infrastructure`:** Comunicação com o mundo externo. Contém a configuração do Entity Framework (`AppDbContext`), as *Migrations* e as implementações concretas dos Repositórios.
4. **`TaskFlow.API`:** A porta de entrada do sistema. Contém os `Controllers` que expõem os endpoints HTTP e configura a Injeção de Dependências no pipeline da aplicação.

### Projeto Vite/React (Front-end)
* **`src/types`:** Interfaces TypeScript que espelham com precisão os DTOs da API.
* **`src/services`:** Serviços de comunicação HTTP configurados centralizadamente com o Axios.
* **`src/components`:** Componentes visuais modulares e reaproveitáveis para gerenciar o estado da tela.

---

## ⚙️ Funcionalidades Implementadas

* **Módulo de Usuários:**
  * Cadastro de novos usuários via interface com integração imediata ao banco de dados.
  * Listagem dinâmica de usuários com exibição de identificadores únicos (`Guid`).
* **Módulo de Tarefas (CRUD Completo):**
  * Criação de tarefas atreladas obrigatoriamente a um usuário existente (Relacionamento 1:N garantido por chave estrangeira no SQL Server).
  * Controle visual de status das tarefas através de *Enums* estruturados (Pendente, Em Andamento, Concluída).
  * Atualização parcial de dados (Conclusão de tarefa através do método HTTP `PATCH`).
  * Remoção física do registro no banco de dados (Ação de exclusão via método HTTP `DELETE`).
  * Atualização automática da interface reativa sem necessidade de recarregar a página (F5).

---

## 🚀 Como executar o projeto localmente

### Pré-requisitos
* [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
* [Node.js](https://nodejs.org/) (Versão LTS)
* [SQL Server](https://www.microsoft.com/pt-br/sql-server/sql-server-downloads) rodando localmente.

---

### 1. Configurando o Banco de Dados e o Back-end

1. **Clone o repositório e entre na pasta do projeto:**

    git clone https://github.com/DevViniciusMenarim/Task-Flow.git
    cd Task-Flow

2. **Entre na pasta do Back-end (.NET):**

    cd TaskFlow

3. **Verifique a String de Conexão:**
   No arquivo `TaskFlow.API/appsettings.json`, certifique-se de que a string de conexão está apontando para o seu servidor local:

    "ConnectionStrings": {
      "DefaultConnection": "Server=localhost;Database=TaskFlowDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
    }

4. **Aplique as Migrations para criar o Banco de Dados:**
   Ainda dentro da pasta `TaskFlow`, execute o comando do EF Core para gerar a base de dados:

    dotnet ef database update --project TaskFlow.Infrastructure --startup-project TaskFlow.API

5. **Execute a API C#:**

    dotnet run --project TaskFlow.API/TaskFlow.API.csproj

   *(A API estará rodando. Anote a porta local gerada no terminal, ex: `http://localhost:5188`)*

---

### 2. Configurando o Front-end

1. Abra um **novo terminal** na raiz do repositório (`Task-Flow`) e navegue até a pasta do cliente web:

    cd taskflow-web

2. **Aponte para a API:**
   Abra o arquivo `src/services/api.ts` e certifique-se de que a `baseURL` está com a mesma porta que o C# gerou no passo anterior.

3. Instale os pacotes do Node.js:

    npm install

4. Inicie o servidor de desenvolvimento do Vite:

    npm run dev

5. **Acesse o Sistema:**
   Abra o navegador e acesse a URL local fornecida pelo Vite (geralmente `http://localhost:5173`). O painel do **TaskFlow Dashboard** estará totalmente operacional.

---

## 👨‍💻 Sobre o Projeto

Este ecossistema completo foi desenvolvido com o objetivo de consolidar de forma prática o conhecimento em arquitetura de software, aplicando as melhores ferramentas e convenções utilizadas pelo mercado corporativo para a construção de aplicações escaláveis e de fácil manutenção.