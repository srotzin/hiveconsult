# HiveConsult

Agent-to-agent reasoning-as-a-service. Provides structured reasoning, data analysis, decision support, and code/document review via REST API and MCP protocol.

## Endpoints

| Method | Path | Description | Cost |
|--------|------|-------------|------|
| GET | `/` | Service discovery | Free |
| GET | `/health` | Health check | Free |
| POST | `/v1/consult/reason` | Chain-of-thought reasoning | $0.01–$0.25 |
| POST | `/v1/consult/analyze` | Data analysis (trend/anomaly/forecast/comparison) | $0.05 |
| POST | `/v1/consult/decide` | Decision support with weighted criteria | $0.05 |
| POST | `/v1/consult/review` | Code/contract/document/strategy review | $0.05 |
| POST | `/v1/consult/batch` | Batch multiple consultations (max 10) | Per item |
| GET | `/v1/consult/stats` | Consultation metrics | Free |
| GET | `/v1/consult/history/:did` | Agent consultation history | Free |
| POST | `/mcp` | JSON-RPC 2.0 MCP endpoint | Per tool |
| GET | `/.well-known/ai-plugin.json` | AI plugin discovery | Free |

## Authentication

**Internal (platform-to-platform):**
```
x-hive-internal: <service_key>
```
Bypasses payment for inter-service calls.

**External (agent-to-agent):**
Uses x402 micropayment protocol. If no payment is provided, the API returns `402 Payment Required` with a payment challenge including USDC amount, recipient address, and accepted methods. Include payment proof in the `X-Payment` header.

## Reasoning Depths

| Depth | Cost | Steps | Description |
|-------|------|-------|-------------|
| `quick` | $0.01 | 3 | Fast heuristic analysis |
| `standard` | $0.05 | 6 | Balanced reasoning with evidence weighing |
| `deep` | $0.25 | 12 | Exhaustive multi-perspective analysis |

## MCP Integration

HiveConsult exposes an MCP-compatible JSON-RPC 2.0 endpoint at `/mcp`.

### Tool Discovery

```json
POST /mcp
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

### Available MCP Tools

- `hiveconsult_reason` — Structured reasoning with configurable depth
- `hiveconsult_analyze` — Data analysis (trend, anomaly, forecast, comparison)
- `hiveconsult_decide` — Multi-criteria decision support
- `hiveconsult_review` — Code/contract/document/strategy review

### Tool Invocation

```json
POST /mcp
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "hiveconsult_reason",
    "arguments": {
      "did": "did:hive:my_agent",
      "question": "Should we migrate from REST to GraphQL?",
      "reasoning_depth": "standard",
      "domain": "architecture"
    }
  }
}
```

## Quick Start

```bash
npm install
npm start
```

The server starts on port 3000 (configurable via `PORT` env var).

## Example: Reasoning Request

```bash
curl -X POST http://localhost:3000/v1/consult/reason \
  -H "Content-Type: application/json" \
  -H "x-hive-internal: <service_key>" \
  -d '{
    "did": "did:hive:my_agent",
    "question": "What is the optimal caching strategy for a read-heavy API?",
    "reasoning_depth": "standard",
    "domain": "backend"
  }'
```

## Example: Decision Support

```bash
curl -X POST http://localhost:3000/v1/consult/decide \
  -H "Content-Type: application/json" \
  -H "x-hive-internal: <service_key>" \
  -d '{
    "did": "did:hive:my_agent",
    "options": ["Redis", "Memcached", "CDN edge cache"],
    "criteria": ["latency", "cost", "complexity", "scalability"],
    "weights": [0.4, 0.2, 0.15, 0.25]
  }'
```

## License

MIT


---

## Hive Civilization

Hive Civilization is the cryptographic backbone of autonomous agent commerce — the layer that makes every agent transaction provable, every payment settable, and every decision defensible.

This repository is part of the **PROVABLE · SETTABLE · DEFENSIBLE** pillar.

- thehiveryiq.com
- hiveagentiq.com
- agent-card: https://hivetrust.onrender.com/.well-known/agent-card.json
