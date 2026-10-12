# Contrato local de mensagens e RoomSnapshot

> Este é o contrato do sample Aimduck entre seu cliente e seu serviço de sala. Não define nem altera um contrato normativo OGS.

## Envelope

Todas as mensagens de gameplay têm um envelope JSON validado pelo schema compartilhado:

| Campo      | Significado                                                                                |
| ---------- | ------------------------------------------------------------------------------------------ |
| `version`  | Versão local do contrato Aimduck; atualmente `1`. Não é versão do protocolo OGS.           |
| `type`     | Discriminador da variante da mensagem.                                                     |
| `sequence` | Número de sequência monotônico dentro da direção de envio, conforme o comportamento atual. |
| `payload`  | Payload tipado pela variante indicada por `type`.                                          |

O schema do envelope e os schemas dos payloads devem rejeitar campos inesperados onde o formato é fechado. Types TypeScript são inferidos dos schemas compartilhados, evitando declarar formatos independentes para cliente e servidor.

## Mensagens cliente → sala

| `type`         | Payload                                                                 | Responsabilidade                                                                    |
| -------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `player.ready` | `ready: boolean`                                                        | Solicita alterar a prontidão do próprio participante no lobby.                      |
| `player.input` | eixos de movimento limitados, `throw`, coordenadas de mira normalizadas | Expressa intenção de controle; não declara colisões, crossing, papel nem pontuação. |

Sequências, ranges numéricos e propriedades estranhas ao schema são validados antes do processamento. Regras de estado e rate limit continuam sendo impostas pelo serviço da sala.

## Mensagens sala → cliente

Variantes existentes: `room.snapshot`, `lobby.updated`, `match.started`, `round.updated`, `round.completed`, `match.completed` e `room.error`.

- Mensagens de estado devem usar os mesmos tipos e schemas nos dois extremos.
- As variantes de gameplay carregam um RoomSnapshot com forma explícita; eventos de simulação opcionais são definidos por seus próprios tipos, sem transformar o payload inteiro em mapa desconhecido.
- `room.error` carrega um código e texto público apropriados; nunca contém stack trace, ticket, token ou segredo.
- `sequence` e a versão são validados à entrada. Mudanças que quebrem o formato local devem ser coordenadas em cliente/servidor e não são mudanças do OGS.

## RoomSnapshot

Cada snapshot é produzido para um destinatário e tem estes grupos:

| Campo    | Categoria                                 | Visibilidade                                                                                                                |
| -------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `server` | Metadados locais e referência operacional | Inclui identificador da sala e telemetria não secreta, como uptime/tick/revisão. Não declara uma fase OGS derivada do jogo. |
| `game`   | Estado Aimduck agregado                   | Fase do jogo, assentos, rodada, placar e revisão. Não contém a lista de sessões individuais.                                |
| `me`     | Estado Aimduck próprio                    | PlayerSession associada à identidade autenticada do destinatário, com nulabilidade definida pelo ciclo de vida do snapshot. |
| `others` | Estado Aimduck compartilhado dos demais   | PlayerSessions dos outros participantes, excluindo o destinatário e sem credenciais.                                        |
| `arena`  | Estado de simulação Aimduck               | Projeções necessárias ao desenho; sem autoridade do cliente para determinar o resultado.                                    |

`server.roomId` identifica a RoomInstance como referência; `game.phase` representa somente a fase Aimduck. O contrato mantém estados distintos para as sessões: `me` identifica o destinatário autenticado, `others` exclui esse destinatário, e `game` não duplica a lista de sessões. Campos obrigatórios, opcionais e nullability são expressos no schema, não inferidos por casts ad hoc.

## Segurança e confidencialidade

O RoomSnapshot e os eventos de gameplay não carregam access token, join ticket, material de handshake, chave privada, chave de sessão, certificado, ou segredo de assinatura. Os identificadores de participante e nomes de exibição podem aparecer apenas como estado público do jogo conforme a política local do sample. Endereço real de sala e credenciais continuam limitados ao fluxo de resolução/admissão e não são acrescentados ao snapshot.
