# Pesquisa: Contratos claros das entidades Aimduck

## Decisões

### 1. Categorizar as entidades pelo domínio responsável

**Decision**: Separar conceitualmente e nos exports compartilhados as entidades OGS, os contextos de admissão/transporte e as entidades do jogo; manter exports de compatibilidade pelo ponto de entrada compartilhado existente quando viável.

**Rationale**: O código atual concentra tipos OGS e tipos de jogo em `packages/shared/src/index.ts`. A distinção já aparece no catálogo e em partes da UI, então explicitar a propriedade no código reduz ambiguidades sem introduzir um novo pacote ou camada.

**Alternatives considered**: Criar um pacote novo para cada domínio; rejeitado por adicionar estrutura e manutenção desnecessárias a um único sample. Manter todos os tipos juntos e confiar somente em documentação; rejeitado porque não resolve a ambiguidade encontrada nas interfaces.

### 2. Usar schemas Zod compartilhados como fronteira de validação

**Decision**: Para as mensagens servidor-cliente conhecidas, modelar cada variante e seus payloads como schemas estritos discriminados e derivar os tipos TypeScript dos mesmos schemas. Utilizar APIs disponíveis na versão já instalada, Zod 3.24.2, incluindo `z.object(...).strict()`, `z.discriminatedUnion`, `z.infer` e validação segura na fronteira de transporte. Não adicionar dependências.

**Rationale**: `packages/shared/src/messages.ts` já usa Zod para validar mensagens de entrada, mas a mensagem de saída aceita `Record<string, unknown>` e o cliente faz verificações/casts parciais do snapshot. Uma definição compartilhada e explícita evita divergência entre o contrato em runtime e os tipos de cliente/servidor.

**Alternatives considered**: Interfaces TypeScript manuais acompanhadas de um validador genérico; rejeitado porque permite que runtime e tipos divirjam. Migrar para Zod 4 ou gerar código; rejeitado por não ser necessário para corrigir o contrato e por aumentar o escopo.

**Fontes**:

- Documentação Zod sobre schemas e inferência de tipos: [zod.dev/basics](https://zod.dev/basics).
- Documentação Zod sobre objetos, unions discriminadas e validação: [zod.dev/api](https://zod.dev/api).
- Estado existente do sample: `samples/aimduck/package.json` fixa Zod 3.24.2; os exemplos do plano devem usar a API compatível com essa versão, não recursos exclusivos da documentação atual do Zod 4.

### 3. Documentar um contrato local de snapshot e mensagens, não um padrão OGS

**Decision**: Registrar o envelope WebSocket e os grupos do snapshot como contrato específico do sample, preservando a versão local `1` e os nomes de eventos existentes salvo necessidade comprovada. Marcar expressamente o artefato como não normativo para OGS.

**Rationale**: A amostra implementa autenticação, admissão e gameplay concretos. Sua mensagem interna deve ser verificável por ambos os extremos, mas não define um formato universal de estado OGS. A política de versão do projeto exige que mudanças normativas sejam versionadas e justificadas separadamente.

**Alternatives considered**: Declarar o snapshot Aimduck como schema normativo OGS; rejeitado por contrariar o escopo da especificação e a constituição. Deixar payloads extensíveis sem campos definidos; rejeitado por não permitir identificar proprietário, significado ou visibilidade.

### 4. Dividir a visibilidade entre estado do destinatário e estado comum

**Decision**: Documentar os grupos de snapshot como: referência da sala/diagnósticos do servidor, estado da partida, participante destinatário (`me`), outros participantes (`others`) e simulação (`arena`). Especificar quais valores são públicos no jogo e excluir credenciais e chaves.

**Rationale**: O snapshot atual já tem `server`, `game`, `me`, `others` e `arena`, mas `game` é genérico no tipo e contém a sessão de todos os jogadores; `server.phase` replica a fase Aimduck. Contratos explícitos permitem preservar o estado necessário ao jogo e decidir se campos duplicados devem ser normalizados sem confundir o estado operacional de sala com o estado de partida.

**Alternatives considered**: Tratar o snapshot como um mapa opaco consumido por casts no cliente; rejeitado por falhar nos requisitos de significado e responsabilidade por campo. Expor dados de identidade/admissão completos; rejeitado por confidencialidade e desnecessário para a UI.

### 5. Validar nos testes focados existentes

**Decision**: Estender testes Vitest de UI de entidades e de integração da sala para cobrir classificação, campos do snapshot, visibilidade por destinatário e interpretação compatível entre servidor e cliente; executar também typecheck do workspace.

**Rationale**: Esses testes já ficam junto às superfícies afetadas e exercitam o fluxo sem depender de uma nova infraestrutura de testes.

**Alternatives considered**: Adicionar uma suíte ou framework novo; rejeitado porque Vitest e Playwright já cobrem os contratos e o sample executável.

## Questões em aberto

Nenhuma. O repositório já determina stack, versão local das mensagens e limites do escopo OGS/Aimduck.
