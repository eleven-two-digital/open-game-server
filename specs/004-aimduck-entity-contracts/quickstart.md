# Quickstart: validar os contratos Aimduck

Este roteiro valida as alterações planejadas às abstrações de entidades, às mensagens e ao snapshot entre cliente e sala. Os contratos detalhados estão em [entity-boundaries.md](./contracts/entity-boundaries.md) e [room-websocket.md](./contracts/room-websocket.md); o modelo de propriedade e relações está em [data-model.md](./data-model.md).

## Pré-requisitos

- Node.js 22 ou mais recente e npm.
- Dependências de `samples/aimduck` instaladas (`npm install`) caso ainda não estejam disponíveis.

## Validação automatizada focada

Na raiz do repositório:

```sh
cd samples/aimduck
npm exec vitest run tests/unit/client/entity-design-system.test.tsx tests/integration/gameplay-room.test.ts
npm run typecheck
```

**Resultado esperado**:

- Os testes identificam as entidades nas categorias corretas, mantêm os rótulos Aimduck/OGS coerentes e exercitam snapshots do servidor para mais de um destinatário.
- Os grupos `server`, `game`, `me`, `others` e `arena` respeitam schema, nulabilidade e visibilidade; `me` não duplica o destinatário em `others`.
- Os snapshots/eventos válidos produzidos pelo servidor passam pelo contrato que o cliente consome; formatos inválidos e campos fechados indevidos são rejeitados.
- A fase Aimduck nunca é reportada como estado operacional da RoomInstance.
- TypeScript termina sem erros de tipo nos workspaces do sample.

## Validação das mensagens no sample completo

Na pasta `samples/aimduck`:

```sh
npm run test:unit
npm run test:integration
```

**Resultado esperado**: a suíte de unidades e integração passa sem alterar o fluxo de autenticação, resolução, admissão, jogabilidade ou confidencialidade. O servidor e o cliente concordam sobre os eventos e dados de estado da versão local 1.

Quando a interface ou jornada do browser for alterada, executar também `npm run test:e2e` e confirmar que os rótulos de estado operacional e de fase do jogo continuam distintos e acessíveis.

## Revisão de documentação/harness

Verificar a página pública Aimduck em inglês, o README do sample, o PRD relacionado, `CLAUDE.md`, skills, workflows e constituição. Atualizar apenas o material afetado; registrar no PR/plano o resultado da revisão e não publicar detalhes internos de `specs/` em `docs/`.
