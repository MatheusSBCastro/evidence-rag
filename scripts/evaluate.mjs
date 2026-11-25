import { readFile, writeFile } from 'node:fs/promises';
import { ask, buildIndex, loadCorpus, retrieve } from '../src/rag.mjs';
const cases = JSON.parse(await readFile(new URL('../evals/questions.json', import.meta.url), 'utf8'));
const index = buildIndex(await loadCorpus());
const rows = [];
for (const item of cases) {
  const passages = retrieve(index, item.question);
  const rank = item.documentId ? passages.findIndex(p => p.documentId === item.documentId) + 1 : 0;
  const result = await ask(index, item.question);
  rows.push({ ...item, rank, retrieved: passages.map(p => p.documentId), status: result.answer.status });
}
const positive = rows.filter(r => r.documentId), negative = rows.filter(r => !r.documentId);
const report = {
  scope: 'Offline: recuperação por documento, abstenção fora de domínio e contrato extrativo. Não avalia geração LLM.',
  corpusDocuments: 8, corpusChunks: index.chunks.length, cases: rows.length,
  recallAt3: positive.filter(r => r.rank > 0).length / positive.length,
  mrrAt3: positive.reduce((n, r) => n + (r.rank ? 1 / r.rank : 0), 0) / positive.length,
  outOfDomainAbstention: negative.filter(r => r.status === 'abstained').length / negative.length,
  results: rows,
};
await writeFile(new URL('../evals/report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.recallAt3 < 0.9 || report.outOfDomainAbstention < 1) process.exitCode = 1;
