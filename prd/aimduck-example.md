# PRD — Exemplo de Jogo Aimduck no OGS

**Versão:** 2026.10.11-1  
**Status:** Supersedida como escopo ativo por [aimduck-playable-game.md](./aimduck-playable-game.md)  
**Escopo:** Rascunho anterior de documentação pública do fluxo de lobby e conectividade.

## Viability

**Conclusion:** viable.

- **Technical viability:** o site já documenta descoberta de salas, emissão de join tickets, conexão direta e protocolo de sala. O Aimduck pode demonstrar esses contratos sem exigir código de jogo ou mudança no protocolo.
- **Security and privacy impact:** nenhum comportamento de runtime é alterado. O exemplo deve preservar o mascaramento de endereços, a validação de tickets e o estabelecimento seguro de sessão descritos pelo OGS.
- **Compatibility impact:** não há mudança compatível ou incompatível no protocolo. Políticas próprias do exemplo, como prontidão e reconexão, serão identificadas como ilustrativas e não normativas.
- **Effort and complexity:** baixo; trata-se de criar conteúdo público em inglês e integrá-lo à navegação e às páginas de exemplos existentes.
- **Rejected alternatives:** criar uma implementação de jogo agora, ou acrescentar regras de lobby ao protocolo central. Ambas ampliariam o escopo além do pedido, que nesta etapa é melhorar a documentação.

## 1. Objetivo e motivação

Usar Aimduck como um exemplo concreto que ajude desenvolvedores a entender como um jogo pode organizar uma sala de espera e levar seus jogadores da descoberta até uma partida usando o Open Game Server Ecosystem (OGS). A documentação atual apresenta os conceitos centrais do OGS, mas as páginas de exemplos de cliente e sala ainda não mostram um jogo completo.

O material de jogo fornecido descreve uma partida multiplayer 1v7: um jogador atua como atirador e sete como patos; a partida tem oito rodadas, com rotação do papel de atirador, e pontuação por acertos e travessias.

## 2. Resultado esperado

Um leitor deve conseguir acompanhar:

1. como jogadores encontram uma sala Aimduck disponível;
2. como escolhem e entram em uma sala de lobby;
3. como a sala acompanha presença, prontidão e atribuição de papéis;
4. como a partida progride e encerra; e
5. como a conexão segura do cliente à sala se relaciona com os contratos existentes do OGS.

O conteúdo distinguirá o estado operacional de uma sala OGS das fases de lobby e partida próprias do Aimduck. Decisões de jogo usadas para tornar o exemplo concreto não alteram nem ampliam o protocolo OGS.

## 3. Escopo

### Dentro do escopo

- Criar documentação pública em inglês para Aimduck como exemplo de uso do OGS.
- Documentar lobby para oito participantes, prontidão, início, papéis e ciclo de oito rodadas.
- Mostrar o percurso do cliente desde a descoberta da sala até a conexão autenticada e a entrada no lobby.
- Explicar resultados visíveis ao jogador para sala lotada, ticket inválido ou expirado e interrupções de conexão.
- Referenciar as páginas existentes de Discovery e protocolo de sala, sem duplicar nem contradizer seus contratos.

### Fora do escopo

- Implementar cliente, sala, backend, matchmaking ou qualquer runtime de Aimduck.
- Definir um novo protocolo de lobby, sinalização ou reconexão para o OGS.
- Alterar contratos normativos, APIs, segurança ou semântica de transporte do OGS.
- Especificar modos de jogo opcionais ainda não selecionados.

## 4. Políticas ilustrativas do exemplo

- A sala comporta oito jogadores: um atirador e sete patos.
- Cada participante indica prontidão; a partida começa quando os oito lugares estão ocupados e todos estão prontos.
- O jogo tem oito rodadas e alterna o papel de atirador entre os participantes a cada rodada.
- Durante o lobby, uma desconexão mantém o lugar do participante por até 30 segundos; o retorno usa a identidade autenticada do mesmo jogador e uma nova credencial de entrada válida. Após esse prazo, o lugar fica disponível novamente.
- A recuperação de uma conexão interrompida durante uma partida é uma decisão específica do jogo e não é garantida pelo protocolo OGS.

Essas políticas são apenas escolhas explicativas para o exemplo Aimduck; não são requisitos do OGS nem do protocolo de sala.

## 5. Critérios de aceitação

- Um leitor consegue seguir, na ordem, autenticação, busca de sala, resolução, conexão segura e entrada no lobby.
- A documentação apresenta claramente as oito vagas, a condição ilustrativa de início e a rotação dos papéis.
- A documentação informa uma ação ou resultado para sala lotada, ticket inválido/expirado e desconexão no lobby, e identifica a reconexão durante a partida como específica do jogo.
- Todos os links para conceitos existentes do OGS levam às páginas correspondentes; nenhuma política ilustrativa é apresentada como contrato do protocolo.
- O conteúdo é público, em inglês, e acessível a partir da seção de exemplos de implementação.

## 6. Dependências

- Conceitos e contratos já documentados de listagem/resolução no Discovery e protocolo de sala.
- Descrição de gameplay Aimduck fornecida pelo solicitante.
- Convenções de idioma e audiência pública estabelecidas para `docs/`.
