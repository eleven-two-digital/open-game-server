# Feature Specification: Contratos claros das entidades Aimduck

**Feature Branch**: `004-aimduck-entity-contracts`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "quero que você corrija esse ponto" — tornar explícitas no código as fronteiras entre entidades OGS, contratos de transporte e entidades próprias do Aimduck, incluindo o estado compartilhado com o cliente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Identificar a responsabilidade de cada entidade (Priority: P1)

Como desenvolvedor que estuda ou integra o sample Aimduck, quero reconhecer sem ambiguidade quais entidades pertencem ao OGS, ao transporte e ao jogo para entender quem define cada estado e regra.

**Why this priority**: O sample é referência de integração; misturar os conceitos torna difícil reutilizar corretamente o OGS e distinguir regras ilustrativas do jogo.

**Independent Test**: Revisar o catálogo de entidades do sample e pedir a um desenvolvedor que classifique cada entidade e indique seu responsável sem consultar a implementação interna.

**Acceptance Scenarios**:

1. **Given** o catálogo de entidades do sample, **When** um desenvolvedor consulta `PlayerIdentity`, `DiscoveryListing`, `RoomResolution`, `RoomInstance`, `RoomConnection`, `LobbySeat`, `PlayerSession`, `GameRoom`, `MatchRound` e `Scoreboard`, **Then** cada entidade é classificada de forma única como OGS, transporte/admissão ou domínio Aimduck.
2. **Given** uma alteração no estado operacional da sala e outra na fase da partida, **When** um desenvolvedor consulta os contratos e a interface, **Then** consegue identificar qual pertence ao OGS e qual é uma regra do Aimduck, sem inferir um a partir do outro.
3. **Given** os contratos documentados do OGS, **When** o sample os utiliza, **Then** as entidades locais os representam sem declarar novas exigências ou semânticas normativas para o OGS.

### User Story 2 - Entender o estado recebido pelo cliente (Priority: P1)

Como desenvolvedor que consome o estado de uma sala, quero saber o significado e a responsabilidade de cada parte do estado compartilhado para usar a identidade própria, os outros participantes e os dados de jogo corretamente.

**Why this priority**: O estado de sala é a fronteira principal entre o servidor autoritativo e o cliente; partes sem contrato claro podem levar clientes a confundir estado OGS com estado de jogo.

**Independent Test**: Inspecionar cada tipo de mensagem servidor-cliente e um snapshot completo e confirmar que cada campo tem um significado, um responsável e uma categoria documentados.

**Acceptance Scenarios**:

1. **Given** uma mensagem de snapshot ou atualização, **When** um consumidor consulta seu contrato, **Then** consegue distinguir os metadados da sala, o estado Aimduck, o estado do próprio participante, o estado dos demais participantes e os dados da simulação.
2. **Given** dados personalizados por participante e dados compartilhados, **When** dois participantes recebem snapshots, **Then** o contrato informa quais campos são próprios do destinatário e quais representam estado comum, sem expor credenciais ou segredos de admissão.
3. **Given** uma alteração num contrato de estado, **When** seus consumidores são revisados, **Then** a alteração pode ser associada ao contrato e à entidade responsáveis sem depender de um mapa implícito de campos genéricos.

### Edge Cases

- Um campo de mensagem ou snapshot não tem proprietário ou categoria inequívoca.
- Uma entidade representa conceitos de mais de uma fronteira, como o estado operacional de uma sala e a fase de uma partida.
- O mesmo conceito possui tipos independentes no cliente e no servidor que divergem no significado ou na forma.
- Um campo de estado é específico do destinatário, mas é transmitido como se fosse comum a todos.
- A reorganização ou documentação das interfaces pode ser interpretada como mudança do protocolo OGS, embora deva permanecer local ao sample.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sample MUST apresentar um catálogo que classifique cada entidade como contrato OGS, contrato de transporte/admissão ou entidade do domínio Aimduck.
- **FR-002**: O catálogo MUST descrever, para cada entidade, seu propósito, responsável pelo estado, ciclo de vida quando aplicável e relação com entidades de outras categorias.
- **FR-003**: O contrato OGS MUST distinguir identidade do jogador, listagem mascarada, resolução de sala, instância operacional de sala e conexão admitida, sem tratar esses conceitos como entidades do jogo.
- **FR-004**: O contrato do domínio MUST distinguir sala e assentos de jogo, sessões de participantes, rodadas, placar e estado de simulação das entidades operacionais do OGS.
- **FR-005**: O estado que a sala compartilha com clientes MUST definir o significado e a categoria de cada campo de nível superior e de cada grupo de dados incluído no snapshot.
- **FR-006**: Os contratos MUST identificar dados próprios do destinatário e dados compartilhados entre participantes, preservando as regras de visibilidade e confidencialidade das credenciais.
- **FR-007**: As interfaces usadas pelo cliente e pelo servidor MUST manter significado compatível para as mensagens de gameplay e para os dados de estado que trocam.
- **FR-008**: Uma alteração local nas interfaces do sample MUST NOT ser apresentada como alteração normativa do protocolo OGS; alterações necessárias a contratos normativos ficam fora do escopo desta feature.
- **FR-009**: Os componentes e a documentação do sample MUST usar nomes e rótulos consistentes com a categoria e o significado dos contratos que representam.
- **FR-010**: Os contratos MUST continuar distinguindo estado operacional da sala, como ativa ou em drenagem, da fase de lobby ou partida definida pelo Aimduck.

### Key Entities

- **PlayerIdentity**: identidade autenticada de um jogador validada pelo serviço; entidade OGS.
- **DiscoveryListing**: descrição pública e mascarada de uma sala encontrada; entidade OGS que não contém endereço de conexão.
- **RoomResolution**: resultado da resolução autenticada de uma sala, incluindo os dados temporários necessários para admissão; entidade OGS.
- **RoomInstance**: instância operacional registrada no Discovery, com estado e ciclo de vida próprios; entidade OGS.
- **RoomConnection**: contexto de uma admissão autenticada e de uma sessão de transporte entre jogador e sala; contrato de transporte/admissão.
- **RoomSocketSession**: representação da sessão de participante autenticada durante o transporte; contrato local que realiza a conexão, não uma entidade de jogo.
- **GameRoom**: agregado autoritativo das regras de lobby e partida do Aimduck; entidade do jogo associada a uma RoomInstance.
- **LobbySeat**: lugar e estado de prontidão/reserva de um participante no lobby; entidade do jogo.
- **PlayerSession**: estado do participante dentro da partida Aimduck; entidade do jogo associada à identidade OGS.
- **MatchRound**: rodada, papel e resultados definidos pelas regras Aimduck; entidade do jogo.
- **Scoreboard**: pontuação e resultado da partida calculados pela sala; entidade do jogo.
- **Room Snapshot**: representação entregue ao cliente que reúne grupos de dados OGS, de participante e de jogo sem fundir suas responsabilidades.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em uma revisão sem acesso à implementação interna, pelo menos 90% dos desenvolvedores avaliados classificam corretamente as dez entidades nomeadas no primeiro cenário em até dois minutos.
- **SC-002**: 100% dos campos de nível superior e grupos nomeados do snapshot possuem categoria, significado e responsável identificáveis no contrato.
- **SC-003**: Em testes de contrato entre cliente e servidor, 100% das mensagens e snapshots válidos aceitos pelo emissor são interpretados segundo o mesmo contrato pelo receptor.
- **SC-004**: Nenhum dos cenários de teste de contrato observa a fase do jogo substituindo ou sendo rotulada como estado operacional OGS.
- **SC-005**: A revisão da feature confirma zero alterações a endpoints, semântica ou requisitos normativos do protocolo OGS.

## Assumptions

- O PRD `prd/aimduck-playable-game.md` continua sendo a origem do objetivo de tornar claras as fronteiras OGS/Aimduck, e sua conclusão de viabilidade é “viable with caveats”.
- A feature complementa a implementação existente do sample e não reabre as regras ou o escopo de gameplay já especificados para Aimduck.
- OGS e Aimduck são vocabulários separados: contratos locais podem mapear conceitos OGS, mas as políticas de lobby, papéis, rodada, simulação e placar permanecem próprias do exemplo de jogo.
- A clareza de interfaces abrange tipos e mensagens trocados pelo cliente e servidor, além dos rótulos e do material de referência do sample; não exige que os contratos sejam publicados como novos padrões OGS.
- O modelo de ameaças e os limites de confiança existentes em `prd/architecture.md` continuam aplicáveis; esta feature não reduz controles de identidade, admissão ou confidencialidade.
