# Manual de Integração - FidelitiPro API

Este documento destina-se à equipe técnica responsável pelo sistema de caixa (PDV/ERP) deste estabelecimento.

## Objetivo
Automatizar o lançamento de pontos no FidelitiPro a cada venda realizada.

## 1. Credenciais
Para iniciar, o proprietário do estabelecimento deve gerar sua **Chave de API** no painel do FidelitiPro:
- Acesse `Dashboard > Configurações > Integração`.
- Clique em **Gerar Chave de Acesso**.
- A chave terá o formato: `fp_live_XXXXXXXXXXXXXXXXXXXX`.

> **Segurança:** Esta chave é secreta. Armazene-a de forma segura no banco de dados do PDV.

## 2. Endpoint da API
Envie uma requisição HTTP POST para:

```http
POST https://us-central1-fidelitipro.cloudfunctions.net/addPoints
Content-Type: application/json
```

## 3. Corpo da Requisição (JSON)
Envie os seguintes dados a cada venda finalizada:

```json
{
  "apiKey": "fp_live_abc123...",    // (Obrigatório) Chave da loja
  "cpf": "123.456.789-00",          // (Obrigatório) CPF do cliente (com ou sem pontuação)
  "value": 150.00,                  // (Obrigatório) Valor da compra (numérico)
  "name": "Nome do Cliente"         // (Opcional) Envie para auto-cadastrar clientes novos
}
```

## 4. Comportamento

| Cenário | Resposta HTTP | Ação |
| :--- | :--- | :--- |
| **Sucesso** | `200 OK` | Pontos lançados. |
| **Cliente Novo (Com Nome)** | `200 OK` | Cliente cadastrado automaticamente e pontos lançados. |
| **Cliente Novo (SEM Nome)** | `200 OK` | Cliente cadastrado como "Cliente [Iniciais]" |
| **Chave Inválida** | `401 Unauthorized` | Verifique se a chave está correta. |
| **Assinatura Vencida** | `403 Forbidden` | A loja está com pendências no FidelitiPro. |

## 5. Exemplo em cURL
```bash
curl -X POST https://us-central1-fidelitipro.cloudfunctions.net/addPoints \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "fp_live_EXAMPLE_KEY",
    "cpf": "12345678900",
    "value": 50.50,
    "name": "Cliente Exemplo"
  }'
```

---
**Suporte Técnico:**
Em caso de dúvidas, contate o administrador do FidelitiPro.
