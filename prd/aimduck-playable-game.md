# PRD — Aimduck Playable Browser Sample

**Versão:** 2026.10.12-1  
**Status:** Proposta  
**Escopo:** Implementação local e jogável de Aimduck no browser, conectada aos conceitos OGS e iniciada por Docker Compose.

## Viability

**Conclusion:** viable with caveats.

- **Technical viability:** o repositório já documenta os conceitos necessários de Discovery, registro de salas, tickets de entrada, transporte WebSocket e estado de jogo. Não há aplicação em `samples/aimduck` ainda; a amostra pode ser criada como um conjunto pequeno de serviços TypeScript e uma experiência 2D para browser. Os documentos atuais não definem todos os detalhes de wire protocol do handshake nem são perfeitamente consistentes entre si; o plano deve identificar e resolver as discrepâncias aplicáveis antes de afirmar interoperabilidade normativa. O primeiro resultado será uma demonstração local e autocontida, não uma implementação de produção.
- **Security and privacy impact:** a amostra deve preservar JWT/JWKS para identidade, mTLS entre Discovery e salas, tickets assinados e limitados por jogador/sala, e ECDH com AEAD para a sessão cliente-sala. O IdP, certificados e usuários incluídos na composição serão apenas para desenvolvimento local, sem chaves ou credenciais de produção no repositório. A aplicação deve validar entradas de gameplay e não confiar no cliente para colisões ou pontuação.
- **Compatibility impact:** o objetivo não é alterar o protocolo OGS. A amostra consumirá os nomes canônicos já registrados e demonstrará os comportamentos documentados. Qualquer mudança incompatível ou lacuna normativa que exija uma nova semântica do protocolo deverá ser separada, versionada e revisada; inconsistências editoriais existentes serão alinhadas como parte da revisão de documentação.
- **Effort and complexity:** médio/alto para um sample ainda inexistente: browser game, autoridade de sala, Discovery, identidade local, certificados, integração e testes de ponta a ponta. A composição local terá um número pequeno e fixo de serviços de sala para manter endereços acessíveis ao browser e tornar o fluxo demonstrável.
- **Rejected alternatives:** entregar apenas uma simulação client-side, pois não exercita salas autoritativas nem o fluxo de admissão OGS; omitir Discovery ou tickets, pois isso contradiria o objetivo da amostra; permitir que containers criem irmãos via Docker socket, pois amplia desnecessariamente o privilégio e a superfície de ataque; tratar configuração local de desenvolvimento como pronta para produção.

## 1. Objetivo e motivação

Implementar o Aimduck descrito em `docs/docs/implementation/aimduck.md` como um jogo 1v7 que usuários possam jogar no browser. A amostra também deve tornar visíveis as fronteiras entre entidades OGS (identidade, Discovery, sala, ticket e conexão) e o domínio do jogo (lobby, assentos, rodada e pontuação), para que desenvolvedores consigam entender como uma aplicação concreta usa o ecossistema.

## 2. Resultado esperado

Um desenvolvedor consegue iniciar a demonstração local com Docker Compose; abrir o cliente web; autenticar uma identidade de demonstração; descobrir e resolver uma sala; entrar com um ticket válido; e jogar uma partida de oito participantes com estado autoritativo, oito rodadas, papéis rotativos e pontuação compartilhada. O browser consegue conectar diretamente ao endereço publicado da sala, sem depender de nomes DNS internos do Docker.

## 3. Escopo

### Dentro do escopo

- Criar em `samples/aimduck` o cliente browser, o serviço Discovery necessário à demonstração, o serviço de sala autoritativo e arquivos de containerização.
- Oferecer uma interface de lobby/descoberta e gameplay com um design system explícito, organizado em torno das entidades do OGS e dos dados do domínio Aimduck.
- Manter o fluxo de identidade, listagem mascarada, resolução, ticket de entrada, registro mTLS das salas e conexão direta conforme os contratos OGS selecionados.
- Demonstrar a partida de oito jogadores: oito assentos, prontidão, um Shooter e sete Ducks por rodada, rotação de Shooter por oito rodadas, acerto valendo três pontos e travessia valendo um ponto.
- Fornecer identidades e configuração de IdP apenas para demonstração local, mantendo a validação JWT/JWKS.
- Fornecer um Docker Compose que inicie o cliente, o IdP local, uma instância Discovery e múltiplas instâncias de sala com endereços acessíveis pelo browser.
- Documentar inicialização, teste manual, limites de segurança e natureza não produtiva da configuração local.

### Fora do escopo

- Hospedagem pública ou implantação de produção, auto-scaling, cluster Kubernetes, observabilidade operacional completa ou provisionamento cloud.
- Suporte a plataformas nativas, outras variantes de gameplay ou mais de oito participantes por sala.
- Alterações silenciosas ou breaking changes aos contratos normativos OGS.
- Usar o Docker socket dentro de serviços de jogo para criar dinamicamente containers irmãos.
- Implementar um provedor de identidade de produção ou armazenar contas persistentes de jogadores.

## 4. Regras de jogo

- Cada sala de jogo admite oito jogadores.
- A partida começa quando os oito assentos estão ocupados e todos os participantes estão prontos.
- Cada uma das oito rodadas tem um Shooter e sete Ducks; o papel Shooter percorre os participantes na ordem dos assentos.
- Os Ducks atravessam o mapa enquanto o Shooter lança pedras com movimento e colisões físicas; uma rodada termina quando cada Duck atravessou com sucesso ou foi atingido.
- O servidor da sala decide colisões, travessias, resultados de rodada e pontuação.
- Cada Duck que atravessa com sucesso recebe um ponto; o Shooter recebe três pontos por Duck atingido.
- Ao fim da oitava rodada, vence o jogador com maior pontuação acumulada; empates são apresentados como empate.
- Durante o lobby, o assento de um jogador desconectado fica reservado por até 30 segundos; reconexão durante a partida não é prometida nesta versão.

## 5. Critérios de aceitação

- Um desenvolvedor consegue subir a composição local documentada e abrir a interface no browser sem iniciar serviços manualmente fora do Compose.
- A página permite autenticar, listar salas mascaradas, resolver uma sala disponível e entrar nela após validação de identidade e ticket.
- A listagem não revela endereços internos das salas; a resolução retorna um endereço realmente acessível pelo browser host.
- As salas registram e renovam seu estado com Discovery usando identidade de infraestrutura autenticada; salas paradas deixam de aparecer.
- O cliente mostra claramente as entidades de identidade/Discovery/sala/ticket/conexão e separa estados operacionais OGS dos estados de jogo.
- Oito participantes podem completar lobby, prontidão, gameplay, resultados das rodadas e placar final sem divergência de estado entre clientes.
- Uma partida completa produz corretamente oito rodadas, a rotação dos oito papéis de Shooter, o placar e o vencedor ou empate.
- O cliente funciona em browsers desktop atuais; controles essenciais de navegação e feedback textual são acessíveis por teclado e não dependem apenas de cor.
- A documentação deixa explícito que credenciais, certificados e configuração do Compose são exclusivos de desenvolvimento local e não devem ser usados em produção.

## 6. Dependências e riscos

- A amostra depende das definições públicas de listagem/resolução, registro/heartbeat, tickets, handshake, transportes e schema de estado.
- Os textos atuais sobre resolução, tickets e handshake possuem diferenças de detalhe. O planejamento deve fixar o contrato canônico já registrado em `specs/001-standardize-resource-naming/contracts/canonical-identifiers.md` e registrar eventuais lacunas que exijam uma decisão protocolar separada.
- Docker Compose precisa publicar cada sala em um endereço e porta distintos que o browser possa alcançar; endereços apenas internos da rede Compose não são válidos para o cliente.
- Uma configuração local de OIDC e uma CA/certificados de desenvolvimento são necessários para exercitar os trust zones sem incorporar segredos reutilizáveis.
- A descrição de Aimduck é a política de exemplo; a implementação não deve apresentar essas regras como exigências gerais do OGS.
