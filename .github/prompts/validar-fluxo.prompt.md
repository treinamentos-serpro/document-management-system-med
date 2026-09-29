---
description: Valida uma mudança completa do DMS antes de integração.
name: validar-fluxo
argument-hint: escopo da mudança (ex. backend, frontend ou completo)
agent: agent
---

# Validar fluxo do DMS

Valide a mudança no escopo `${input:escopo:completo}` antes de considerá-la pronta para integração.

## Procedimento

1. Inspecione as alterações atuais e confirme que não há arquivos ou mudanças não relacionadas ao escopo informado.
2. Se o escopo incluir o backend, execute os testes em `backend` com `npm test`.
3. Se o escopo incluir o frontend, execute os testes em `frontend` com `npm test` e o build com `npm run build`.
4. Se o escopo for completo, valide também a integração entre o frontend e os endpoints backend usando o prefixo `/api` e o proxy do Vite.
5. Confira os contratos do DMS:
   - `POST /upload` recebe um arquivo no campo `file`.
   - `GET /documents` retorna metadados públicos.
   - `GET /documents/:id/download` retorna o arquivo binário.
   - uploads usam filesystem local em `backend/storage` via `multer` com `diskStorage`.
   - metadados permanecem em memória.
6. Verifique tratamento de erros, limites de upload, ausência de arquivo, identificador inexistente e falhas de leitura/escrita.
7. Revise se o fluxo backend continua seguindo `routes -> controllers -> services -> repositories` e se o frontend usa componentes funcionais e `fetch('/api/...')`.
8. Reporte o resultado com:
   - comandos executados e seus resultados;
   - falhas reproduzíveis, com arquivo e linha quando possível;
   - riscos ou testes ausentes;
   - conclusão objetiva sobre a prontidão da mudança.

## Restrições

- Não altere código, testes ou configurações durante a validação.
- Não ignore testes falhos nem trate um build bem-sucedido como substituto dos testes.
- Não use serviços externos, armazenamento em nuvem ou comandos destrutivos.
- Se um comando não puder ser executado, informe o bloqueio e forneça o comando para execução manual.
