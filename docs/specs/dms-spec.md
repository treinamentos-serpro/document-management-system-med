# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web para que usuários enviem, consultem e baixem documentos, mantendo os arquivos no filesystem local e os metadados em memória nesta primeira versão.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos registrados durante a execução do backend.
- Download de um documento pelo identificador público.
- Associação simples de cada documento a um usuário.
- Interface React para upload, listagem e download.
- Endpoint operacional para verificação de saúde da aplicação.

### Fora do escopo

- Armazenamento externo, em nuvem ou em serviços de terceiros.
- Persistência durável dos metadados.
- Versionamento de documentos.
- Exclusão, edição, compartilhamento ou organização por pastas.
- Autenticação, autorização e gestão completa de usuários.
- Upload de múltiplos arquivos em uma única requisição.
- Conversão, visualização ou processamento do conteúdo dos documentos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um documento usando `multipart/form-data` e o campo de arquivo `file`. |
| RF-02 | Cada requisição de upload aceita exatamente um arquivo. Requisições sem arquivo são rejeitadas. |
| RF-03 | O sistema valida o tamanho do arquivo e a política de tipos/extensões configurada antes de concluir o upload. |
| RF-04 | O sistema gera um identificador público único para cada documento aceito. |
| RF-05 | O sistema registra os metadados `id`, `originalName`, `size`, `uploadedAt` e `owner`. |
| RF-06 | O usuário pode listar os documentos registrados por meio do endpoint de listagem. |
| RF-07 | O usuário pode baixar um documento informando seu identificador público. |
| RF-08 | O download preserva o nome original por meio do cabeçalho `Content-Disposition`, sem utilizar o nome original como caminho físico. |
| RF-09 | O documento é associado ao usuário informado pelo cabeçalho `X-Owner-Id`; quando o cabeçalho não for enviado, utiliza-se `DEFAULT_OWNER` ou `anonymous` como fallback de demonstração. Esse mecanismo não representa autenticação. |
| RF-10 | O sistema retorna respostas de erro consistentes para entrada inválida, documento inexistente, arquivo excedendo o limite e falhas de armazenamento. |
| RF-11 | O frontend permite selecionar e enviar um arquivo, exibir os documentos listados e iniciar o download de um documento. |
| RF-12 | O endpoint de saúde retorna o estado operacional do backend. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend utiliza Node.js e Express em CommonJS. |
| RNF-02 | O frontend utiliza React e Vite em ESM, com componentes funcionais e hooks. |
| RNF-03 | Os arquivos enviados são gravados exclusivamente em `backend/storage` usando `multer` com `diskStorage`. |
| RNF-04 | Os metadados são mantidos em memória e podem ser perdidos quando o processo do backend for reiniciado. |
| RNF-05 | A configuração operacional, como porta, diretório e limite de upload, deve ser obtida de variáveis de ambiente, com defaults documentados. |
| RNF-06 | As dependências do backend seguem o fluxo `routes -> controllers -> services -> repositories`. Camadas internas não conhecem Express ou detalhes de transporte. |
| RNF-07 | O nome físico do arquivo deve ser gerado pelo sistema. O identificador recebido na URL nunca deve ser concatenado diretamente a um caminho do filesystem. |
| RNF-08 | O sistema deve impedir path traversal, tratar nomes originais não confiáveis e não expor caminhos internos na API. |
| RNF-09 | O limite padrão de upload deve ser definido por configuração e aplicado pelo multer. O valor recomendado para a primeira implementação é `10 MB`, sobrescrito por `MAX_UPLOAD_SIZE`. |
| RNF-10 | O sistema deve remover o arquivo físico caso o upload seja concluído, mas o registro dos metadados falhe. |
| RNF-11 | Falhas de leitura, escrita e ausência do arquivo físico devem ser convertidas em respostas HTTP apropriadas, sem expor stack trace ao cliente. |
| RNF-12 | O frontend acessa o backend pelo prefixo `/api`, utilizando o proxy configurado no Vite durante o desenvolvimento. |
| RNF-13 | A solução não deve utilizar banco de dados, armazenamento externo ou provedor de upload nesta fase. |
| RNF-14 | O backend deve ser testável sem iniciar o servidor HTTP, mantendo a exportação do app Express. |

## 5. Modelo de dados (metadados do documento)

### Documento exposto pela API

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador público único do documento. |
| `originalName` | string | Sim | Nome original informado pelo cliente, tratado como dado de apresentação. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Sim | Data e hora do upload no formato ISO 8601. |
| `owner` | string | Sim | Identificador simples do usuário proprietário. |

### Referência interna do repositório

O repositório deve manter, além dos campos públicos, uma referência interna ao arquivo salvo, por exemplo `storedFilename`. Esse valor deve ser gerado pelo `diskStorage`, permanecer sob `backend/storage` e não ser retornado ao cliente. O download deve localizar o arquivo a partir do registro associado ao `id`, nunca a partir de um caminho construído diretamente com parâmetros da URL.

Como os metadados ficam em memória, um reinício pode tornar documentos previamente gravados indisponíveis pela API, além de deixar arquivos órfãos no diretório local. Essa limitação deve ser conhecida e registrada até que exista uma estratégia de persistência e limpeza.

## 6. Contratos de API

### Formato padrão de erro

As respostas de erro devem utilizar JSON no formato:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado"
  }
}
```

O campo `code` é estável para consumo do frontend; `message` é uma mensagem legível. Stack traces e caminhos internos não devem ser retornados.

### GET /health

- **Entrada:** nenhuma.
- **Sucesso:** `200 OK`.
- **Resposta:**

```json
{
  "status": "ok"
}
```

- **Finalidade:** verificação operacional do backend; não participa do fluxo de documentos.

### POST /upload

- **Entrada:** `multipart/form-data`.
- **Campo obrigatório:** `file`, contendo um único arquivo.
- **Cabeçalho opcional:** `X-Owner-Id`, com o identificador simples do proprietário.
- **Comportamento:** o multer grava o arquivo em `backend/storage` usando um nome físico gerado; o service valida a operação e o repository registra os metadados em memória.
- **Sucesso:** `201 Created`.
- **Resposta de sucesso:**

```json
{
  "id": "doc_123",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-09-29T12:00:00.000Z",
  "owner": "user-1"
}
```

- **Erros:**
  - `400 BAD_REQUEST` / `FILE_REQUIRED`: campo `file` ausente ou requisição inválida.
  - `400 BAD_REQUEST` / `FILE_TYPE_NOT_ALLOWED`: tipo ou extensão fora da política configurada.
  - `413 PAYLOAD_TOO_LARGE` / `FILE_TOO_LARGE`: arquivo acima de `MAX_UPLOAD_SIZE`.
  - `500 INTERNAL_SERVER_ERROR` / `STORAGE_ERROR`: falha ao gravar ou registrar o documento.

### GET /documents

- **Entrada:** nenhuma.
- **Sucesso:** `200 OK`.
- **Resposta:** array de metadados públicos, sem `storedFilename` ou caminho físico.

```json
[
  {
    "id": "doc_123",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-09-29T12:00:00.000Z",
    "owner": "user-1"
  }
]
```

- **Observação:** a lista contém somente documentos registrados na memória da execução atual.
- **Erros:** `500 INTERNAL_SERVER_ERROR` / `DOCUMENT_LIST_ERROR` em falha inesperada do repositório.

### GET /documents/:id/download

- **Entrada:** `id` no caminho da URL.
- **Sucesso:** `200 OK`, corpo binário do arquivo.
- **Cabeçalhos de sucesso:** `Content-Type` compatível com o arquivo e `Content-Disposition: attachment` com o `originalName` tratado.
- **Erros:**
  - `404 NOT_FOUND` / `DOCUMENT_NOT_FOUND`: id não registrado.
  - `404 NOT_FOUND` / `FILE_NOT_FOUND`: metadado existe, mas o arquivo físico não está disponível.
  - `500 INTERNAL_SERVER_ERROR` / `DOWNLOAD_ERROR`: falha inesperada na leitura ou transmissão.
- **Regra de segurança:** o arquivo deve ser resolvido pelo registro interno do repository. O valor de `:id` não pode ser usado diretamente como nome ou caminho do arquivo.

### Integração do frontend

Durante o desenvolvimento, o frontend utiliza:

- `POST /api/upload`, encaminhado pelo proxy para `/upload`.
- `GET /api/documents`, encaminhado para `/documents`.
- `GET /api/documents/:id/download`, encaminhado para `/documents/:id/download`.

As chamadas devem ser feitas com `fetch`, e erros da API devem ser convertidos em mensagens adequadas para a interface.

## 7. Decisões arquiteturais

### Backend

- `app.js` configura o Express, middleware comum, endpoint de saúde e registro do router; não contém regras de negócio.
- `routes/` define os caminhos HTTP e conecta middleware do multer e controllers.
- `controllers/` traduz requisições HTTP em entradas de caso de uso, valida respostas e escolhe status HTTP.
- `services/` concentra as regras de upload, listagem, download, associação do proprietário e tratamento de consistência.
- `repositories/` mantém os metadados em memória e a relação segura entre documento e arquivo físico.
- O multer usa `diskStorage` e permanece na borda de entrada HTTP. O service não deve depender de `req` ou `res`.
- O repository deve garantir que o diretório local exista e que nomes físicos sejam controlados pelo sistema.

### Frontend

- A interface utiliza componentes funcionais React organizados em `components/`, `pages/` e `services/` conforme a convenção do projeto.
- O serviço de API encapsula `fetch` e os caminhos `/api`, evitando duplicação nos componentes.
- Componentes previstos: upload, listagem de documentos e ação de download.
- A interface deve representar estados de carregamento, sucesso, lista vazia e erro sem expor detalhes internos do backend.

### Armazenamento e consistência

- O filesystem local é a única persistência do conteúdo binário.
- Os metadados permanecem em memória nesta versão.
- Se o arquivo for salvo e o registro falhar, o service deve solicitar a remoção do artefato para evitar inconsistência.
- A limpeza de arquivos órfãos após reinício não faz parte desta versão e deve ser tratada em uma evolução futura com persistência durável.

## 8. Plano de execução

1. Confirmar as variáveis de ambiente, o limite padrão de upload, a política inicial de tipos/extensões e o comportamento de `owner`.
2. Ampliar os testes backend para cobrir saúde, upload válido, arquivo ausente, arquivo acima do limite, listagem, download, id inexistente e arquivo físico ausente.
3. Criar o repository de documentos com metadados em memória, `diskStorage`, geração de nomes físicos e resolução segura do arquivo.
4. Criar o service com as regras de criação, validação, associação do proprietário, listagem, download e limpeza em caso de falha parcial.
5. Criar controllers e routes, conectar o multer e registrar as rotas no `app.js` sem mover regras de negócio para a camada HTTP.
6. Implementar o serviço frontend baseado em `fetch`, tratando respostas de sucesso e o formato padrão de erro.
7. Criar os componentes de upload, listagem e download, incluindo estados de carregamento, lista vazia e erro.
8. Compor a interface em `App.jsx` e validar o fluxo completo com o proxy `/api`.
9. Executar testes backend, build do frontend e testes manuais de upload, listagem e download, verificando o conteúdo de `backend/storage`.
10. Adicionar automação de instalação, testes e build, caso prevista pelo pipeline do projeto.
11. Fazer revisão de segurança para path traversal, nomes especiais, limites, MIME spoofing, limpeza após falhas e exposição de caminhos internos.
12. Avaliar uma evolução de persistência dos metadados e uma estratégia de limpeza de arquivos órfãos após a primeira versão.
