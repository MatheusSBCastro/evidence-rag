<div align="center">

# Evidence RAG

**Respostas com evidências. Avaliações que você pode reproduzir.**

RAG em português · BM25 · Structured Outputs · Node.js 24 · Zero dependências

[Começar](#executar-em-um-minuto) · [Arquitetura](#como-funciona) · [Avaliações](#avaliações) · [Limites](#limites-conhecidos)

</div>

## O problema

Um assistente de suporte precisa encontrar a informação relevante e mostrar de onde ela veio. Este laboratório implementa esse caminho com uma base de conhecimento **fictícia**, recuperação lexical, respostas estruturadas e validação das citações antes de exibir o resultado.

É um projeto de portfólio para estudar engenharia de sistemas com LLMs. O desenvolvimento inicial foi assistido por IA; as decisões, os testes e os limites estão documentados para revisão.

## Executar em um minuto

Requer Node.js 24 ou superior. Não precisa instalar pacotes, criar conta nem configurar chave para a demonstração.

```sh
git clone https://github.com/MatheusSBCastro/evidence-rag.git
cd evidence-rag
npm run demo
npm run ask -- "Como validar a assinatura dos webhooks?"
npm test
npm run eval
```

A demonstração usa **extração literal do trecho mais relevante**, identificada no JSON como `extractive-demo`. Ela não chama nem simula uma geração por LLM. Perguntas sem dois termos correspondentes no mesmo trecho produzem abstenção.

Exemplo resumido:

```json
{
  "mode": "extractive-demo",
  "answer": {
    "status": "supported",
    "claims": [{
      "text": "Os webhooks enviam eventos por HTTP POST...",
      "sourceId": "integration:<hash-do-trecho>",
      "quote": "Os webhooks enviam eventos por HTTP POST..."
    }]
  }
}
```

O exemplo acima foi abreviado; a execução retorna o trecho completo, fontes, pontuação e latência.

## Como funciona

```mermaid
flowchart LR
    A[Pergunta] --> B[Normalização em português]
    D[Documentos fictícios] --> E[Chunks por parágrafo + IDs estáveis]
    E --> C[Índice BM25]
    B --> C
    C --> F{Contexto recuperado?}
    F -->|Não| G[Abstenção local]
    F -->|Sim| H[Demo extrativa ou Responses API]
    H --> I[Validar contrato, fonte e citação literal]
    I --> J[Resposta + fontes + uso + latência]
```

| Decisão | Por quê |
| --- | --- |
| BM25 implementado localmente | Baseline legível e reproduzível; facilita inspecionar erros antes de adicionar embeddings. |
| Um parágrafo por chunk, ID com SHA-256 | Fontes permanecem estáveis ao reordenar documentos. |
| Top 3 e pelo menos dois termos correspondentes | Reduz recuperação por coincidência de uma única palavra; é uma heurística ajustável, sem calibração estatística. |
| JSON Schema e validação local | O contrato é aplicado mesmo se o provedor retornar uma resposta inadequada. |
| IDs e citações validados contra o contexto | Rejeita fontes inventadas e citações que não existem nos trechos recuperados. |
| Geração opcional e injetável | Testes cobrem o adapter sem rede ou cobrança. |

## Usar um modelo real

O adapter usa a [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create) com [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), `store: false`, timeout de 20 segundos e limite de saída. Escolha um modelo da sua conta que aceite essa configuração.

No PowerShell, configure as variáveis **somente no seu terminal**:

```powershell
$env:OPENAI_API_KEY = 'SUA_CHAVE'
$env:OPENAI_MODEL = 'MODELO_COMPATIVEL_DA_SUA_CONTA'
npm.cmd run ask -- --live "Como recuperar a senha?"
```

No Bash, use `export OPENAI_API_KEY=...` e `export OPENAI_MODEL=...`. `.env.example` documenta as variáveis; arquivos `.env` não são carregados automaticamente. Nunca coloque chaves no código.

O modo `--live` envia a pergunta e os trechos recuperados à OpenAI e pode gerar cobrança. A resposta informa o uso de tokens reportado pelo provedor. O projeto não estima preços. **A integração real não foi executada nesta versão**; o contrato HTTP e os fluxos de erro foram testados com respostas controladas.

## Avaliações

O comando `npm run eval` regenera [`evals/report.json`](evals/report.json). O conjunto tem **20 perguntas sintéticas**: 16 com documento esperado e 4 fora de domínio, sobre 8 documentos/16 chunks.

| Métrica offline | Resultado inicial |
| --- | --- |
| Recall@3 por documento | 1,00 |
| MRR@3 por documento | 1,00 |
| Abstenção nas 4 perguntas fora de domínio | 1,00 |

Esses números são um **smoke test pequeno, escrito junto da implementação**, com vocabulário próximo da base. Não são um benchmark independente, não medem generalização, a precisão do trecho exato nem qualidade da geração. Não há dados reais de usuários.

Os 15 testes automatizados verificam recuperação, IDs estáveis, limites de entrada, fontes forjadas, citações alteradas, contrato, erros HTTP, recusas, JSON inválido, respostas incompletas e timeout. O teste que verifica a separação entre instruções e dados **não comprova resistência a prompt injection de um modelo real**.

## Limites conhecidos

- Uma citação existente não prova que a afirmação é semanticamente sustentada. O validador verifica origem e integridade literal; revisão de entailment é trabalho futuro.
- Correspondência lexical não entende sinônimos, negações nem perguntas sem resposta que compartilham o vocabulário da base. O modo extrativo pode recuperar um trecho relacionado sem responder à dúvida.
- As fontes são fictícias e locais; não há crawler, ingestão de PDF, autenticação, índice vetorial, reranking ou serviço de produção.
- Prompt injection é tratado no contrato de instruções e pela ausência de ferramentas de ação, mas não há garantia de neutralização de instruções maliciosas.
- A latência de demonstração não representa a latência de um provedor LLM. Geração, custo e fidelidade com modelo real ainda precisam de avaliação.

## Próximos experimentos

1. Conjunto de avaliação independente, com paráfrases, negativas difíceis e perguntas sem resposta dentro do domínio.
2. Comparar BM25 com embeddings e recuperação híbrida sob o mesmo protocolo.
3. Avaliar fidelidade por afirmação e resposta completa com modelo real; registrar configuração, tokens e latência.

## Estrutura

```text
src/rag.mjs          # índice, BM25, contrato e adapter OpenAI
src/cli.mjs          # interface de linha de comando
data/knowledge.json # base fictícia versionada
evals/              # perguntas e relatório reproduzível
scripts/evaluate.mjs
tests/rag.test.mjs
.github/workflows/ci.yml
```

Licença MIT. Veja [LICENSE](LICENSE).
