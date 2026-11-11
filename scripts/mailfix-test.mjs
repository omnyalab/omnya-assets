// node scripts/mailfix-test.mjs — the slips in the buyer's address that the site puts right (api/_lib/mail-fix.js)
import assert from 'node:assert/strict';
import { fixEmail } from '../api/_lib/mail-fix.js';

assert.equal(fixEmail('piper446@hoymail.com'), 'piper446@hotmail.com'); // the real one of 11/11
assert.equal(fixEmail('Ana.Maria@GMIAL.COM'), 'Ana.Maria@gmail.com'); // the name is left as typed
assert.equal(fixEmail('a@gmail.con'), 'a@gmail.com');
assert.equal(fixEmail('a@outlok.com'), 'a@outlook.com');
assert.equal(fixEmail('a@iclould.com'), 'a@icloud.com');
for (const good of ['a@gmail.com', 'a@hotmail.com', 'a@hotmail.co.uk', 'a@hotmail.it', 'dhill@darylhill.com', 'hello@blkdmd.ca', 'a@mail.com', 'a@email.com', 'a@ymail.com', 'a@gmx.com'])
  assert.equal(fixEmail(good), good); // real domains are never touched
assert.equal(fixEmail(undefined), undefined);
assert.equal(fixEmail(''), '');
assert.equal(fixEmail('no-at-sign'), 'no-at-sign');
console.log('mail-fix: ok');
