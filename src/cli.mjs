import { ask, buildIndex, loadCorpus } from './rag.mjs';

const args = process.argv.slice(2);
const live = args.includes('--live');
const question = args.filter(x => x !== '--live').join(' ') || 'Como recuperar a senha e quanto tempo dura o link de recuperação?';
try {
  const result = await ask(buildIndex(await loadCorpus()), question, { live });
  console.log(JSON.stringify({ question, ...result }, null, 2));
} catch (error) {
  console.error(error.name === 'TimeoutError' ? 'Tempo limite do provedor excedido.' : error.message);
  process.exitCode = 1;
}
