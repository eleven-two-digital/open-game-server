# Feature Specification: Jogo Aimduck jogável no browser

**Feature Branch**: `003-aimduck-game`

**Created**: 2026-10-12

**Status**: Draft

**Input**: Implementar de fato o jogo em `samples/aimduck`, com experiência jogável no browser, design system explícito alinhado às entidades OGS, instâncias de sala e Discovery conteinerizados e Docker Compose para subir a demonstração completa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Descobrir e entrar em uma sala (Priority: P1)

Como jogador, quero abrir Aimduck no browser, entrar com uma identidade de demonstração, comparar salas disponíveis e entrar em uma sala escolhida para que eu possa participar de uma partida sem conhecer endereços internos.

**Why this priority**: A entrada autentica e mediada por Discovery valida a integração central do sample com OGS e precede lobby e gameplay.

**Independent Test**: Iniciar o ambiente local, abrir o cliente em dois browsers/sessões, autenticar, listar salas e entrar em uma sala; verificar que a listagem mascara endereços e que apenas uma resolução válida permite admissão.

**Acceptance Scenarios**:

1. **Given** um jogador autenticado e uma ou mais salas disponíveis, **When** ele abre a busca de salas, **Then** vê a capacidade, ocupação e estado de cada sala sem ver endereço ou porta de conexão.
2. **Given** uma sala com assentos livres, **When** o jogador a seleciona, **Then** o cliente resolve a sala, recebe credencial de entrada e conecta ao endereço anunciado para o browser.
3. **Given** uma identidade ou credencial de entrada inválida ou expirada, **When** o jogador tenta entrar, **Then** o acesso é negado com mensagem acionável e sem revelar segredos.

---

### User Story 2 - Jogar uma partida Aimduck completa (Priority: P1)

Como jogador, quero ocupar um assento no lobby, marcar prontidão e jogar as rodadas como Shooter ou Duck para competir em uma partida multiplayer com regras, placar e resultado consistentes.

**Why this priority**: O objetivo principal é tornar o jogo realmente jogável, não apenas demonstrar conectividade ou exibir telas.

**Independent Test**: Conectar oito sessões de browser à mesma sala, iniciar a partida, completar as oito rodadas e comparar papéis, eventos, placares e resultado observados por todos os clientes.

**Acceptance Scenarios**:

1. **Given** uma sala com menos de oito participantes, **When** um jogador entra e indica prontidão, **Then** o lobby mostra seu assento e estado, mas a partida não começa.
2. **Given** oito assentos ocupados e todos os jogadores prontos, **When** a última prontidão é registrada, **Then** a sala inicia uma partida e atribui um Shooter e sete Ducks.
3. **Given** uma rodada ativa, **When** os Ducks atravessam o mapa e o Shooter lança pedras, **Then** a sala simula movimento e colisões e encerra a rodada quando cada Duck cruzou ou foi atingido.
4. **Given** uma rodada ativa, **When** um jogador move ou lança uma pedra, **Then** a sala valida a ação e atualiza o estado compartilhado; o cliente não pode declarar diretamente acerto ou pontuação.
5. **Given** uma rodada concluída, **When** as oito rodadas são encerradas, **Then** a sala mostra o placar acumulado e anuncia o jogador vencedor ou um empate.
6. **Given** um participante desconectado durante o lobby, **When** ele retorna autenticado como a mesma identidade antes de 30 segundos, **Then** recupera o mesmo assento; se o prazo expirar, o assento volta a ficar livre.

---

### User Story 3 - Compreender as entidades e estados do OGS (Priority: P2)

Como desenvolvedor que integra um jogo ao OGS, quero que a interface e seus componentes mostrem claramente as entidades e transições OGS para que eu consiga distinguir identidade, Discovery, sala, ticket e conexão do estado específico do Aimduck.

**Why this priority**: O sample é também uma referência de integração; uma separação visual e conceitual clara torna seu valor educativo verificável.

**Independent Test**: Revisar telas de descoberta, entrada, lobby e partida com a especificação de entidades, confirmar que cada entidade OGS possui representação/estado visível e que estados da partida não substituem o estado operacional da sala.

**Acceptance Scenarios**:

1. **Given** o cliente em busca de salas ou em uma conexão ativa, **When** o jogador observa os painéis de estado, **Then** identidade, listagem/Discovery, sala selecionada, ticket/conexão e estado de jogo são apresentados como conceitos distintos.
2. **Given** uma sala em estado operacional ativo e um lobby ainda aguardando participantes, **When** ambos os estados são exibidos, **Then** o cliente não os apresenta como um único estado OGS.
3. **Given** um jogador usa apenas teclado para navegar entre descoberta, lobby e ações disponíveis, **When** percorre os fluxos críticos, **Then** o foco e as mensagens de estado são identificáveis sem depender de cor.

---

### User Story 4 - Subir e validar a demonstração local (Priority: P1)

Como desenvolvedor, quero iniciar cliente, identidade local, Discovery e múltiplas salas com uma única composição Docker para que eu possa jogar e testar o fluxo sem provisionar infraestrutura remota.

**Why this priority**: Uma amostra que não pode ser iniciada de forma reproduzível não demonstra a integração completa nem permite validação prática.

**Independent Test**: Em uma máquina com Docker Engine e Docker Compose, subir a composição conforme o quickstart e verificar health, registro das salas, listagem no browser e acesso a uma partida.

**Acceptance Scenarios**:

1. **Given** Docker Engine e Compose instalados, **When** o desenvolvedor executa o comando documentado para iniciar a demonstração, **Then** o cliente, IdP local, Discovery e pelo menos duas salas ficam disponíveis sem etapas manuais fora da preparação documentada.
2. **Given** a composição ativa, **When** uma instância de sala fica indisponível, **Then** Discovery deixa de oferecer essa instância após expiração/retirada do registro e outras salas continuam acessíveis.
3. **Given** endereços publicados pelo Compose, **When** o browser resolve uma sala, **Then** conecta usando o host e a porta do host publicados, nunca um nome de serviço privado da rede Docker.
4. **Given** uma sala iniciada, **When** ela registra e renova seu lease com Discovery usando autenticação de infraestrutura, **Then** aparece na listagem mascarada enquanto ativa e deixa de ser oferecida após expiração do lease.

### Edge Cases

- A sala está lotada ou torna-se indisponível entre a listagem e a resolução.
- A identidade do jogador ou o ticket expirou antes da admissão.
- Um serviço inicia antes de sua dependência estar saudável ou uma sala não consegue autenticar-se no Discovery.
- Uma sala reinicia durante uma partida ou perde seu heartbeat.
- Um jogador desconecta no lobby e retorna antes ou depois dos 30 segundos de reserva.
- Uma ação de jogo está fora dos limites, excede a cadência permitida ou tenta falsificar um hit/placar.
- Dois jogadores disputam o último assento simultaneamente.
- Um empate ocorre ao fim da oitava rodada.
- O browser não confia na CA de desenvolvimento ou o endereço anunciado não corresponde a uma porta alcançável.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer uma experiência jogável em browser para o jogo Aimduck multiplayer.
- **FR-002**: O sistema MUST autenticar identidades de jogador e validar as credenciais de acesso a salas antes da admissão.
- **FR-003**: O sistema MUST permitir listar salas sem expor endereços reais, resolver uma sala selecionada e conectar diretamente ao endereço anunciado dessa sala.
- **FR-004**: O sistema MUST apresentar componentes e estados visuais organizados pelas entidades OGS — identidade, Discovery/listagem, sala, ticket de entrada e conexão — e distingui-los das entidades próprias do jogo.
- **FR-005**: O sistema MUST oferecer navegação e feedback essenciais acessíveis por teclado e sem depender apenas de cor.
- **FR-006**: Cada sala de jogo MUST admitir até oito participantes, informar assentos ocupados e livres e permitir que cada jogador indique prontidão no lobby.
- **FR-007**: A partida MUST iniciar somente quando os oito lugares estiverem ocupados e todos os participantes estiverem prontos.
- **FR-008**: Cada partida MUST conter oito rodadas; cada rodada MUST ter um Shooter e sete Ducks, e o papel de Shooter MUST rotacionar entre os participantes.
- **FR-009**: A sala MUST ser autoridade para validar movimento e ações, resolver colisões, determinar travessias/acertos, controlar o avanço das rodadas e calcular pontuações.
- **FR-010**: Cada Duck que atravessar com sucesso MUST receber um ponto e o Shooter MUST receber três pontos por Duck atingido; ao fim da partida, o maior placar MUST vencer e empates MUST ser informados como empate.
- **FR-011**: O estado relevante do lobby, da rodada e do placar MUST ser sincronizado e consistente entre todos os clientes admitidos à mesma sala.
- **FR-012**: Instâncias de sala MUST registrar-se e renovar seu lease junto ao Discovery com autenticação de infraestrutura; uma instância indisponível MUST deixar de aparecer como disponível.
- **FR-013**: O ambiente local MUST conter uma instância Discovery e múltiplas instâncias independentes de sala, além do cliente browser e da identidade de demonstração necessários para executar o fluxo completo.
- **FR-014**: A configuração local MUST ser iniciável por um único Docker Compose documentado; cada sala MUST anunciar ao browser um endereço/porta publicados e alcançáveis pelo host.
- **FR-015**: Credenciais, certificados, chaves e usuários de demonstração MUST ser claramente limitados ao ambiente local e MUST NOT ser apresentados como adequados a produção.
- **FR-016**: O cliente MUST tratar sala cheia/indisponível, credenciais inválidas/expiradas e falha de conectividade com mensagens acionáveis.
- **FR-017**: O cliente MUST permitir retorno à vaga reservada durante o lobby pela mesma identidade autenticada dentro de 30 segundos; a restauração automática de uma partida interrompida MUST NOT ser prometida nesta versão.
- **FR-018**: A implementação MUST distinguir a disponibilidade operacional da sala no Discovery dos estados de lobby e partida definidos por Aimduck.
- **FR-019**: O gameplay MUST representar Ducks tentando cruzar o mapa e pedras lançadas pelo Shooter com movimento e colisão simulados pela sala; cada rodada MUST terminar depois que cada Duck cruzar ou for atingido.

### Key Entities *(include if feature involves data)*

- **PlayerIdentity**: identidade autenticada do participante, representada na experiência do OGS pelo `player_id` e atributos públicos mínimos.
- **DiscoveryListing**: catálogo de salas com identificadores opacos, capacidade e estado operacional, sem endereço de conexão.
- **RoomResolution**: resultado de uma seleção válida, vinculando sala e jogador a endereço anunciado e ticket de curta duração.
- **RoomInstance**: instância operacional autônoma que mantém uma partida, expõe capacidades de conexão e registra seu lease no Discovery.
- **RoomConnection**: sessão direta entre cliente e sala, após validar identidade/ticket e negociar a proteção de sessão.
- **GameRoom**: sala Aimduck com estado operacional OGS separado de sua fase interna de lobby ou partida.
- **LobbySeat**: um dos oito lugares da sala, associado a um jogador, prontidão e eventual prazo de reserva.
- **PlayerSession**: participação autenticada de um jogador na conexão ativa e na partida corrente.
- **MatchRound**: uma rodada com número, Shooter, Ducks, ações, resultado e conclusão.
- **Scoreboard**: pontuação acumulada por jogador e resultado final, incluindo empate.
- **DesignSystemComponent**: elemento visual que representa entidade, estado ou ação do OGS ou do domínio Aimduck com rótulos e estados consistentes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após a preparação local inicial de certificados, um desenvolvedor consegue iniciar todos os serviços com um único comando documentado e abrir o cliente em até 5 minutos, sem provisionamento remoto.
- **SC-002**: O fluxo de autenticação de demonstração, listagem, resolução e admissão a uma sala pode ser concluído em até 60 segundos por um jogador com ambiente local saudável.
- **SC-003**: Oito sessões de browser concluem uma partida completa; em 100% dos eventos testados, papéis, fase, placar e resultado final são iguais nos clientes conectados.
- **SC-004**: A sala rejeita 100% das ações inválidas testadas que tentem declarar diretamente colisão, acerto ou pontuação.
- **SC-005**: Em teste moderado, pelo menos 90% dos desenvolvedores identificam corretamente os elementos de identidade, Discovery, sala, ticket/conexão e estado do jogo sem confundir disponibilidade da sala com fase da partida.
- **SC-006**: Todos os fluxos críticos de entrada, prontidão, gameplay e resultado podem ser operados por teclado; mensagens de estado incluem texto e não são codificadas somente por cor.
- **SC-007**: Nenhuma listagem devolvida ao cliente contém host/porta real da sala; toda conexão de sala no browser usa apenas endereço divulgado por uma resolução válida.

## Assumptions

- O browser desktop atual é o alvo inicial; suporte mobile/nativo e design responsivo avançado ficam fora do primeiro corte.
- O fluxo de demonstração inclui um provedor OIDC local com identidades pré-configuradas, sem criação de contas persistentes.
- A composição local usa um conjunto pequeno e fixo de salas para evitar dependência de criação dinâmica de containers e portas imprevisíveis.
- O cliente segue o fluxo Discovery → resolução → conexão direta, e não substitui OGS por matchmaking interno de framework.
- As regras de prontidão, pontuação, rotação e reconexão pertencem ao exemplo Aimduck e não alteram as regras gerais do protocolo OGS.
- A configuração local é demonstrativa; implantação e gestão de segredos de produção não fazem parte deste recurso.
