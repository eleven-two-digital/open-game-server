# Modelo de dados: Contratos das entidades Aimduck

Este modelo descreve as responsabilidades e relações da implementação de exemplo. Ele não é uma extensão normativa do protocolo OGS.

## Entidades OGS

### PlayerIdentity

- **Propósito**: identidade do jogador autenticada pelo provedor e validada pelo serviço.
- **Proprietário**: IdP emite; Discovery e a sala validam as declarações relevantes.
- **Dados representáveis no domínio**: identificador estável, nome de exibição e metadados não secretos necessários ao jogo.
- **Ciclo de vida**: autenticação → uso durante descoberta/admissão → expiração do token.
- **Não inclui**: token bearer, segredo do IdP ou chave privada no snapshot de gameplay.

### DiscoveryListing

- **Propósito**: resumo público e mascarado de uma sala descoberta.
- **Proprietário**: Discovery, a partir do registro e dos heartbeats da instância.
- **Relação**: descreve uma RoomInstance sem publicar seu endereço real.
- **Regra**: não contém host, porta, ticket, certificado ou chave privada.

### RoomResolution

- **Propósito**: resultado autenticado da resolução de uma listagem para conexão e admissão.
- **Proprietário**: Discovery.
- **Relação**: associa temporariamente PlayerIdentity a uma RoomInstance.
- **Dados representáveis**: identificador de sala, endereço e transporte anunciados, ticket limitado por jogador/sala e validade.
- **Visibilidade**: apenas o fluxo de admissão; nunca é incluído no snapshot de gameplay nem em logs.

### RoomInstance

- **Propósito**: processo operacional registrado no Discovery que hospeda uma GameRoom.
- **Proprietário**: serviço de sala e registro do Discovery.
- **Estado operacional**: ativa, em drenagem ou indisponível; separado da fase da partida.
- **Ciclo de vida**: inicialização → registro mTLS → heartbeats/lease → drenagem, encerramento ou expiração do lease.
- **Relação**: hospeda a GameRoom; o estado da instância não é a fase da GameRoom.

## Entidades de admissão e transporte

### RoomConnection

- **Propósito**: contexto lógico de uma admissão autenticada e de uma conexão jogador-sala.
- **Proprietário**: fronteira de admissão/transporte.
- **Ciclo de vida**: resolução → ticket validado → handshake seguro → conexão ativa → encerramento/expiração.
- **Não inclui no snapshot**: ticket, token, material ECDH ou chaves derivadas.

### RoomSocketSession

- **Propósito**: contexto local associado à conexão WebSocket admitida.
- **Proprietário**: transporte da sala.
- **Campos operacionais locais**: identidade do jogador e da sala, nome de exibição e identificador do ticket para validar a sessão ativa.
- **Relação**: vincula o transporte ao participante; não é uma PlayerSession nem define regras da partida.
- **Visibilidade**: somente servidor; identificador de ticket não é encaminhado ao cliente após a admissão.

## Entidades do domínio Aimduck

### GameRoom

- **Propósito**: agregado autoritativo das regras do lobby e da partida Aimduck.
- **Proprietário**: serviço de sala, camada de jogo.
- **Conteúdo**: fase (`lobby`, `in_progress`, `complete`), assentos, participantes, rodada e placar.
- **Relação**: é hospedada por uma RoomInstance; fase não substitui estado operacional OGS.
- **Transições**: lobby → partida quando as condições Aimduck forem atendidas → completa após a última rodada.

### LobbySeat

- **Propósito**: posição estável no lobby, incluindo ocupação, prontidão, conexão e reserva.
- **Proprietário**: GameRoom.
- **Regras**: número de assento estável; uma identidade não ocupa assentos duplicados; reserva e liberação seguem as regras Aimduck existentes.
- **Visibilidade**: estado comum da sala, sem credenciais.

### PlayerSession

- **Propósito**: estado de um participante no contexto da partida.
- **Proprietário**: GameRoom.
- **Relação**: liga PlayerIdentity a um assento e à partida; contém papel, conectividade e pontuação de jogo, não dados de autenticação.
- **Visibilidade**: instância destinatária pode aparecer como `me`; os demais como `others`. Campos de placar/assento também podem ser apresentados em estado comum conforme o contrato do sample.

### MatchRound

- **Propósito**: rodada com número, papéis, prazo, transições e resultado por Duck.
- **Proprietário**: GameRoom.
- **Transições**: pendente → contagem regressiva → ativa → resultados.
- **Regras**: Shooter, participantes, outcomes e deadlines são definidos pela lógica Aimduck; não são conceitos OGS.

### Scoreboard

- **Propósito**: pontuações acumuladas e vencedores/empates.
- **Proprietário**: GameRoom.
- **Regras**: apenas resultados autoritativos da sala alteram pontuações; valores são estado de jogo compartilhado.

### ArenaSnapshot

- **Propósito**: projeção da simulação necessária para desenhar a arena no cliente.
- **Proprietário**: simulação Aimduck da sala.
- **Conteúdo**: projeções de jogadores e projéteis. Não é autoridade para colisões, papéis ou pontuação.
- **Visibilidade**: estado compartilhado de gameplay; sem informação de admissão.

## RoomSnapshot

O RoomSnapshot é uma projeção para o destinatário, não uma entidade persistida nem um novo conceito normativo OGS. Cada grupo tem uma responsabilidade:

| Grupo    | Categoria                                   | Conteúdo e responsabilidade                                                                                                           |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `server` | Telemetria local do sample / referência OGS | Identificador de sala como referência à RoomInstance, uptime, tick e revisão. Não rotula a fase da partida como estado OGS.           |
| `game`   | Aimduck                                     | Projeção agregada da partida: fase, assentos, rodada, placar e revisão do jogo. As sessões individuais não são repetidas neste grupo. |
| `me`     | Aimduck, específico do destinatário         | PlayerSession autenticada correspondente ao destinatário; nulabilidade segue explicitamente o ciclo de vida do snapshot.              |
| `others` | Aimduck, compartilhado                      | Lista das PlayerSessions dos demais participantes; exclui o destinatário.                                                             |
| `arena`  | Simulação Aimduck                           | Posições/outcomes visuais e projéteis compartilhados, sem autoridade de jogo no cliente.                                              |

`server.roomId` referencia a RoomInstance OGS. `game.phase` é a fase Aimduck; a fase operacional da RoomInstance não é adicionada ao snapshot de jogo nem derivada dela. Os schemas definem presença, nulabilidade e visibilidade de cada campo. Campos de conexão, tokens, tickets, chaves, segredos e material de handshake não pertencem a nenhum grupo do snapshot.

## Relações principais

```text
PlayerIdentity ── autentica/admite ── RoomConnection ── usa ── RoomInstance
                                              │                     │
                                              │                     └── hospeda ── GameRoom
                                              └── representa transporte ── RoomSocketSession
                                                                            │
GameRoom ── agrega ── LobbySeat / PlayerSession / MatchRound / Scoreboard    │
       └── projeta estado ── RoomSnapshot (me / others / game / arena) ◀────┘

DiscoveryListing ── resolve autenticado para ── RoomResolution ── RoomInstance
```
