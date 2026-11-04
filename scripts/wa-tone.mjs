// Tone check with the real Claude (costs a few cents): fake leads, prints what the bot would answer.
// Run: ~/.local/node/bin/node --env-file=.env.local scripts/wa-tone.mjs
const { think } = await import('../api/_lib/wa-brain.js');
const chats = [
  ['free sample'],
  ['hi i saw your reel of the tower', 'how can i get this for my project?'],
  ['ciao ho visto il video della torre', 'quanto costa?'],
  ['hello', 'we are a developer in tashkent, 3 towers, we have the 3d model and plans', 'we want the interactive 3d where clients choose floor'],
  ['can i learn to do it myself?'],
  ['are you a bot?'],
  ['[file: plan_block_A.pdf]', 'this is the apartment'],
  ['when can you deliver if we start now?'],
  ['мне нужен бесплатный образец'],
  ['ciao vorrei fare dei render della mia villa', 'ho le piante e il modello sketchup'],
];
for (const c of chats) {
  const log = c.map((t) => ({ r: 'lead', t }));
  const out = await think(log, { name: '' });
  console.log('\n> ' + c.join(' | '));
  console.log(`  [${out.decision}${out.reason !== 'none' ? ':' + out.reason : ''}]`);
  for (const m of out.messages) console.log('  bot: ' + m);
  console.log('  per nico: ' + out.summary_it);
}
