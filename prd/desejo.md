# Especificação de Servidor de Jogos Genérico - PRD / Desejo

**Versão da Especificação:** 2026.09.02-1  
**Status:** Rascunho Inicial / Validação de Desejo


## Viability

**Conclusion:** viable with caveats.

- **Technical viability:** the naming standard is a documentation-level protocol cleanup with no runtime effect; compatibility is primarily editorial and can be enforced by repo-wide search and docs build validation.
- **Security and privacy impact:** the renames do not change trust boundaries or cryptographic flows; they reduce ambiguity for clients and operators and improve auditability.
- **Compatibility impact:** the change is breaking for published draft identifiers, but no implementation or live clients exist yet. The migration is a protocol revision only, documented in the PRD and in the canonical identifier table.
- **Effort and complexity:** low complexity because the scope is documentation-only and the canonical mappings are explicit; the main cost is cross-file review and the docs build gate.
- **Rejected alternatives:** keep the old names forever, accept multiple names for the same concept, or defer the standardization until implementation exists. All three would preserve drift and increase integration risk.

---

## 1. Visão Geral e Motivação

O objetivo deste projeto é definir uma **especificação aberta, padronizada e genérica para arquitetura de servidores de jogos multiplayer**. A especificação visa ser totalmente agnóstica de engine de jogo (Unity, Unreal, Godot, Web, etc.) ou linguagem de programação, proporcionando alta escalabilidade, desacoplamento entre infraestrutura e lógica de jogo, eficiência no tráfego de dados e segurança dinâmica por sala.

---

## 2. Arquitetura e Componentes Principais

### 2.1. Servidor Proxy / Discovery (Discovery)
- Funciona como um agregador central e ponto de entrada inicial para os clientes.
- Mantém o catálogo atualizado de todas as instâncias de salas ativas na rede.
- Mascara os endereços reais das salas na fase inicial de busca/listagem.

### 2.2. Auto-Registro de Salas no DNS
- Instâncias de salas são descentralizadas e podem rodar em múltiplos hosts ou containers independentes.
- **Mecanismo de Registro:** No momento do build/subida do container ou processo, a sala recebe parâmetros de ambiente/configuração referentes ao Servidor Proxy (DNS) e realiza seu auto-registro, informando sua presença, capacidade e metadados iniciais.

### 2.3. Salas Descentralizadas (Stateless / Standalone)
- Cada sala gerencia o ciclo de vida da sua partida (rodada em andamento, limites de jogadores, definição de times, comunicação interna do lobby).
- Aplica as regras de propagação de pacotes e inputs com base nos schemas acordados.

### 2.4. Handshake & Criptografia Dinâmica (Acordo de Sala e Cliente)
- O cliente obtém a localização da sala via Proxy/DNS e conecta-se diretamente a ela.
- É realizado um **handshake de acordo de sessão**, onde sala e cliente estabelecem uma **criptografia dinâmica e exclusiva**.
- Impede que clientes não autorizados façam requisições ou forjem pacotes para salas das quais não fazem parte.

### 2.5. Acordo de Schemas e Caching Otimizado (`_id` + `ttl_ms`)
- Após o handshake, a sala define o schema dinâmico das trocas de estado com o cliente.
- A estrutura de dados é representada como um dicionário parametrizado em camadas, por exemplo:
  - `$.server`: Estado global enxergado pelo servidor.
  - `$.me`: Dados específicos do jogador atual.
  - `$.others`: Dados dos demais jogadores.
- **Boa Prática de Caching:** Todos os atributos no nível raiz contêm obrigatoriamente os campos `_id` (hash/versão do estado) e `ttl_ms` (time-to-live). O cliente apenas reprocessa o atributo quando o `ttl_ms` expirar ou quando o `_id` for alterado.

### 2.6. Multi-Transporte Flexível e Híbrido
- A comunicação pode utilizar **HTTP Tradicional**, **WebSockets** e **Server-Sent Events (SSE)**.
- Esses transportes podem ser utilizados em paralelo ou configurados conforme o perfil do jogo e necessidade da sala.

### 2.7. Discovery de Capacidades via Resource `well-known`
- As salas expõem um endpoint padronizado (`/.well-known/game-room`) contendo suas capacidades, rotas disponíveis, protocolos de transporte suportados e versão da especificação.

### 2.8. Moderação e Administração Dinâmica (Admin API)
- A arquitetura permite que agentes administradores (Game Masters, Bots ou moderadores humanos) se conectem à sala usando um token emitido por um terceiro de confiança (ex: o DNS ou um IdP exclusivo).
- Admins podem alterar o ciclo de vida da sala (pausar, encerrar), expulsar jogadores abusivos (kick/ban) e injetar eventos dinâmicos na partida (ex: spawn de inimigos, distribuição de itens).

---

## 3. Endpoints Principais (Visão de Alto Nível)

### 3.1. Servidor Proxy / DNS
- `POST /v1/discovery/register` — Endpoint utilizado pelas salas (no boot/deploy) para auto-registro no DNS.
- `GET /v1/rooms` — Consulta de salas disponíveis com estado inicial mascarado pelo proxy.
- `POST /v1/rooms/resolve` — Resolução do endpoint direto da sala escolhida para início de conexão direta.

### 3.2. Instância da Sala (Game Room Host) - Jogadores
- `GET /.well-known/game-room` — Recursos, protocolos aceitos (HTTP, WS, SSE) e capacidades da sala.
- `POST /v1/handshake` — Acordo inicial de sessão e geração da chave de criptografia dinâmica por cliente.
- `GET /v1/schema` — Definição do schema dos dicionários de payload (`$.server`, `$.me`, `$.others`).
- `GET/POST/WS/SSE /v1/ws` ou `/v1/state` — Troca reativa de pacotes e estado respeitando as regras de `_id` e `ttl_ms`.

### 3.3. Instância da Sala (Game Room Host) - Administração
- `POST /v1/admin/handshake` — Autenticação do administrador via token confiável (ex: Signed Admin Ticket).
- `POST /v1/admin/state` — Manipulação do estado global da sala (pausar, resumir, encerrar).
- `DELETE /v1/admin/players/{player_id}` — Moderação: expulsão/banimento de jogadores.
- `POST /v1/admin/events` — Injeção de eventos dinâmicos customizados no stream da partida.
