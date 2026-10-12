# Catálogo de entidades e fronteiras Aimduck

**Escopo**: catálogo local da amostra Aimduck, para implementação e documentação. Não é um padrão normativo do OGS.

| Entidade            | Categoria                             | Quem define/possui o estado                     | Ciclo de vida / relação                                                                              |
| ------------------- | ------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `PlayerIdentity`    | OGS — identidade                      | Provedor de identidade; validada pelos serviços | Autenticada para descoberta e admissão; associada a sessões locais de jogo                           |
| `DiscoveryListing`  | OGS — descoberta                      | Discovery                                       | Resumo mascarado e temporário de uma RoomInstance                                                    |
| `RoomResolution`    | OGS — resolução/admissão              | Discovery                                       | Resultado autenticado com endereço e ticket limitado para a sala selecionada                         |
| `RoomInstance`      | OGS — sala operacional                | Processo da sala e registro Discovery           | Registrada, ativa/drenando, renovada por lease e removida ao encerrar                                |
| `RoomConnection`    | Admissão/transporte                   | Fluxo de admission entre cliente e sala         | Resolução, validação do ticket, handshake, conexão e encerramento                                    |
| `RoomSocketSession` | Transporte local                      | Transporte WebSocket do serviço de sala         | Contexto do participante conectado; não é o estado de jogo                                           |
| `GameRoom`          | Aimduck — jogo                        | Lógica autoritativa da sala                     | Hospedada por uma RoomInstance; mantém lobby e partida                                               |
| `LobbySeat`         | Aimduck — lobby                       | GameRoom                                        | Ocupada/reservada/liberada conforme regras do lobby                                                  |
| `PlayerSession`     | Aimduck — participante                | GameRoom                                        | Participante associado a um assento e partida; separável em `me` e `others` para cada destinatário   |
| `MatchRound`        | Aimduck — rodada                      | GameRoom                                        | Progressa de pendente a resultados segundo regras de jogo                                            |
| `Scoreboard`        | Aimduck — pontuação                   | GameRoom                                        | Atualizado apenas a partir de outcomes decididos pela sala                                           |
| `ArenaSnapshot`     | Aimduck — projeção da simulação       | Simulação da sala                               | Projeção visual compartilhada; não torna o cliente autoritativo                                      |
| `RoomSnapshot`      | Projeção de transporte para o cliente | Serviço de sala, por destinatário               | Agrupa referências operacionais, estado de jogo, dados do destinatário, demais jogadores e simulação |

## Fronteiras que não podem ser inferidas

- `RoomInstance` ativa/drenando é estado operacional OGS; `GameRoom` lobby/em andamento/completa é estado Aimduck. Um não é alias nem substituto do outro.
- `RoomResolution` contém detalhes temporários de admissão; `DiscoveryListing` permanece mascarada; nenhum deles é uma entidade da partida.
- `RoomConnection`/`RoomSocketSession` autenticam e transportam mensagens; `PlayerSession` descreve estado do jogador na partida.
- Regras de readiness, papéis, rounds, outcomes e scoring pertencem ao Aimduck, não são requisitos de uma sala OGS.
- O snapshot nunca transporta tokens, tickets, chaves, certificados ou segredos. O identificador da RoomInstance pode ser uma referência, não uma exposição de credenciais/endereço oculto.

## Responsabilidade de UI

| Elemento visível                            | Entidades representadas                                | Categoria indicada                    |
| ------------------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| Identidade autenticada e listagem/resolução | `PlayerIdentity`, `DiscoveryListing`, `RoomResolution` | OGS                                   |
| Endereço/admission/handshake em progresso   | `RoomInstance`, `RoomConnection`                       | OGS operacional e transporte/admissão |
| Assentos e prontidão                        | `GameRoom`, `LobbySeat`                                | Aimduck                               |
| Papel e score do participante               | `PlayerSession`, `MatchRound`, `Scoreboard`            | Aimduck                               |
| Estado visual da arena                      | `ArenaSnapshot`                                        | Simulação Aimduck                     |

Rótulos e cores podem reforçar, mas não substituir, os nomes textuais que distinguem estado operacional de fase de jogo.
