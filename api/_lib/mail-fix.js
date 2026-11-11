// The address typed at Stripe's checkout, with the slips people make on the big providers put right (11/11: a buyer
// wrote "hoymail.com" and his pack went to nobody). Only whole domains known to be a slip of gmail, hotmail, outlook,
// yahoo or icloud are touched: anything else comes back as it was typed, and the part before the @ is never changed.
const to = (right, ...slips) => slips.map((s) => [s, right]);
const SLIPS = new Map([
  ...to('hotmail.com', 'hoymail.com', 'hotmial.com', 'hotmai.com', 'hotmal.com', 'hotmil.com', 'hotnail.com', 'homail.com', 'hotmaill.com', 'htmail.com', 'hotmail.con', 'hotmail.cm', 'hotmail.om'),
  ...to('gmail.com', 'gmial.com', 'gmai.com', 'gmal.com', 'gmil.com', 'gnail.com', 'gamil.com', 'gmaill.com', 'gmali.com', 'gmail.con', 'gmail.cm', 'gmail.om', 'gmail.comm'),
  ...to('outlook.com', 'outlok.com', 'outllok.com', 'outloo.com', 'oulook.com', 'outlook.con', 'outlook.cm'),
  ...to('yahoo.com', 'yaho.com', 'yahooo.com', 'yhoo.com', 'yahoo.con', 'yahoo.cm'),
  ...to('icloud.com', 'iclud.com', 'icoud.com', 'iclould.com', 'icloud.con', 'icloud.cm'),
]);

export function fixEmail(email) {
  if (typeof email !== 'string') return email;
  const at = email.lastIndexOf('@');
  if (at < 1) return email;
  const right = SLIPS.get(email.slice(at + 1).trim().toLowerCase());
  return right ? `${email.slice(0, at)}@${right}` : email;
}
