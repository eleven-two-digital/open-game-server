# Feature Specification: Aimduck Lobby and Connectivity Example

**Feature Branch**: none created (spec directory: `002-aimduck-lobby-connectivity`)

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "eu quero implementar a documentação do jogo aimduck para ser um exemplo de implementação do OGS

eu quero por hora apenas melhorar a documentaçaõ dele incluindo a feature de lobby e conectividade"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand the Aimduck lobby (Priority: P1)

Um desenvolvedor de jogo quer entender como os jogadores passam de uma sala de espera para uma partida Aimduck, incluindo vagas, prontidão e papéis, para usar o exemplo ao projetar um jogo sobre OGS.

**Why this priority**: O lobby é a funcionalidade nova explicitamente solicitada e torna o exemplo de jogo concreto.

**Independent Test**: Um leitor consulta a página de Aimduck e explica a capacidade do lobby, a condição ilustrativa de início e como os papéis mudam ao longo da partida.

**Acceptance Scenarios**:

1. **Given** um leitor que conhece apenas a visão geral do Aimduck, **When** consulta a documentação do lobby, **Then** identifica que a sala comporta oito participantes, com um atirador e sete patos.
2. **Given** oito participantes no lobby, **When** todos indicam prontidão, **Then** a documentação explica que a partida ilustrativa pode começar e que o papel de atirador alterna nas oito rodadas.

### User Story 2 - Follow the client connection journey (Priority: P1)

Um desenvolvedor de cliente precisa seguir o caminho de um jogador desde a busca de uma sala Aimduck até a entrada autenticada no lobby, sem expor nem contornar os controles de segurança do OGS.

**Why this priority**: Sem um fluxo de conectividade, o lobby não demonstra como Aimduck usa a arquitetura descentralizada do OGS.

**Independent Test**: O leitor reordena corretamente as etapas descritas, desde a descoberta até a conexão direta e a entrada no lobby.

**Acceptance Scenarios**:

1. **Given** um jogador autenticado procurando uma partida, **When** segue o fluxo do exemplo, **Then** entende que descobre uma sala, resolve a sala escolhida, recebe credenciais de entrada e conecta-se diretamente à sala.
2. **Given** um ticket inválido ou expirado, **When** o cliente tenta entrar, **Then** a documentação explica que a sala não autoriza a entrada e que o jogador deve obter uma resolução/ticket válido antes de tentar novamente.

### User Story 3 - Understand connectivity interruptions (Priority: P2)

Um desenvolvedor quer saber o que a documentação promete quando uma sala enche ou uma conexão cai, para distinguir o contrato geral do OGS das decisões específicas do Aimduck.

**Why this priority**: Explicitar limites e resultados evita que leitores confundam uma política de exemplo com garantia do protocolo.

**Independent Test**: Um leitor encontra a ação esperada para os casos de sala cheia, desconexão no lobby e interrupção durante a partida.

**Acceptance Scenarios**:

1. **Given** uma sala que fica cheia entre a listagem e a entrada, **When** o jogador tenta resolvê-la, **Then** a documentação direciona o cliente a atualizar a busca e escolher uma sala disponível.
2. **Given** uma desconexão enquanto o jogador ainda está no lobby, **When** ele retorna em até 30 segundos com a mesma identidade autenticada e uma nova credencial de entrada válida, **Then** a política ilustrativa preserva sua vaga; após o prazo, a vaga pode ser liberada.
3. **Given** uma desconexão durante uma partida, **When** o leitor consulta a documentação, **Then** ela deixa claro que a recuperação depende da política específica do jogo e não é garantida pelo protocolo OGS.

### Edge Cases

- A sala fica lotada depois de aparecer nos resultados de descoberta e antes de ser resolvida.
- Um ticket de entrada é inválido ou expira antes da conexão ser estabelecida.
- O jogador perde conectividade antes do início da partida, durante a janela ilustrativa de 30 segundos ou após sua expiração.
- A conexão cai durante uma rodada; o exemplo não deve sugerir uma semântica de reconexão geral que o OGS não define.
- O leitor confunde o estado operacional da sala com os estados de prontidão, lobby e rodada do jogo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A documentação pública do Aimduck MUST ser escrita em inglês e MUST ser acessível a partir da seção de exemplos de implementação.
- **FR-002**: A documentação MUST apresentar o Aimduck como um exemplo de jogo 1v7 com oito jogadores, oito rodadas e rotação do papel de atirador; MUST indicar que o atirador ganha três pontos por pato atingido, que cada pato ganha um ponto ao chegar ao outro lado e que vence quem tiver a maior pontuação acumulada após as oito rodadas.
- **FR-003**: A documentação MUST descrever o lobby ilustrativo de oito vagas, a prontidão dos participantes e a condição de início quando todos estiverem presentes e prontos.
- **FR-004**: A documentação MUST distinguir estado operacional da sala OGS de presença/prontidão no lobby e de fase/rodada da partida.
- **FR-005**: A documentação MUST mostrar, em ordem, como o cliente autenticado encontra uma sala, seleciona e resolve essa sala, obtém credenciais assinadas de entrada e estabelece uma conexão segura diretamente com ela.
- **FR-006**: A documentação MUST explicar que a listagem não revela o endereço real da sala, que a sala valida as credenciais de entrada e que a negociação segura de sessão ocorre antes da participação no lobby.
- **FR-007**: A documentação MUST explicar que o cliente escolhe entre os meios de conexão anunciados pela sala e MUST apresentar ao menos um fluxo de exemplo apropriado para atualizações em tempo real, sem declarar obrigatório um meio que a sala não anuncie.
- **FR-008**: A documentação MUST identificar o estado do lobby e da partida como estado específico do Aimduck, associado aos conceitos de estado de servidor, jogador atual e outros jogadores já descritos pelo OGS.
- **FR-009**: A documentação MUST descrever o resultado visível ao jogador quando a sala está cheia ou quando a credencial de entrada é inválida/expirada, incluindo atualizar a busca ou obter uma nova credencial válida.
- **FR-010**: A documentação MUST descrever como política ilustrativa a retenção de uma vaga no lobby por até 30 segundos após desconexão, com retorno da mesma identidade autenticada usando uma nova credencial de entrada válida, e MUST indicar que reconexão durante a partida é específica do Aimduck, não uma garantia do protocolo OGS.
- **FR-011**: A documentação MUST marcar explicitamente prontidão, início de partida e reconexão como políticas ilustrativas do exemplo, não como requisitos normativos do OGS.
- **FR-012**: A documentação MUST referenciar os guias existentes de Discovery e protocolo de sala para detalhes normativos e MUST NOT contradizer seus contratos.
- **FR-013**: Esta entrega MUST limitar-se à documentação; MUST NOT implementar código de jogo nem alterar os contratos ou requisitos normativos do protocolo OGS.

### Key Entities *(include if feature involves data)*

- **Jogador**: participante autenticado identificado de forma estável durante sua participação no lobby e na partida.
- **Lobby**: sala de espera específica do Aimduck que reúne até oito participantes antes do início da partida.
- **Sala de jogo**: instância OGS que hospeda uma sessão do Aimduck; possui estado operacional distinto do estado interno do jogo.
- **Credencial de entrada (join ticket)**: credencial assinada e vinculada ao jogador e à sala, usada para autorizar a entrada.
- **Partida e rodada**: partida composta por oito rodadas, com pontuação e papéis definidos pelas regras do Aimduck.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em uma revisão com cinco leitores sem conhecimento prévio do exemplo, pelo menos quatro conseguem ordenar corretamente as cinco etapas de conectividade descritas em FR-005.
- **SC-002**: A documentação comunica sem ambiguidade os quatro fatos centrais do lobby: oito vagas, prontidão de todos antes do início, oito rodadas e rotação do atirador.
- **SC-003**: Todos os quatro cenários de falha prioritários — sala cheia, credencial inválida/expirada, desconexão no lobby e desconexão durante a partida — têm resultado ou limite explícito na documentação.
- **SC-004**: Nenhuma política ilustrativa de Aimduck é interpretada por revisores como requisito normativo do OGS, e cada conceito normativo citado possui um link para sua documentação existente.
- **SC-005**: A documentação apresenta corretamente a atribuição de pontos por acerto e travessia e determina o vencedor pela maior pontuação acumulada ao final das oito rodadas.

## Assumptions

- O material fornecido pelo solicitante é a fonte das regras de gameplay: um atirador, sete patos, oito rodadas, rotação do atirador, três pontos por pato atingido e um ponto por pato que cruza.
- Como o material não define regras de lobby, o exemplo usa oito vagas e início após todos os participantes indicarem prontidão; essa é uma escolha ilustrativa e revisável do Aimduck.
- A janela de 30 segundos para retorno ao lobby é uma política explicativa do exemplo; o jogador precisa obter uma nova credencial de entrada válida, e o prazo não é uma capacidade já garantida pelo protocolo OGS.
- A recuperação após desconexão durante a partida permanece específica do jogo e deve ser identificada como tal, sem inventar uma garantia compartilhada.
- Os contratos atuais documentados de Discovery, join tickets e protocolo de sala são a fonte normativa para o fluxo de conectividade.
- A mudança nesta fase não implementa código, nem publica um novo contrato de protocolo.
