# The funnel check of Nico's Mac (~/Omnya Automazioni/controllo.py, launchd) after a funnel goes online (20/11/2026):
# its pages go in config.json → controllo.pagine, and the list of the Stripe links (dati/link_learn.json) is read again
# from the learn.ts that is ONLINE (origin/main), because launchd may not read the Documents folder (17/11) and the local
# main of the repo can be behind. Only after the push: a page that does not exist yet would ring the alarm.
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import time

AUTO = os.path.expanduser('~/Omnya Automazioni')
MAIN = os.path.expanduser('~/Documents/GitHub/omnya-assets')


def run(c, dry=False):
    cfgp = os.path.join(AUTO, 'config.json')
    if not os.path.exists(cfgp):
        print('Non trovo ~/Omnya Automazioni/config.json')
        return 2
    with open(cfgp, encoding='utf-8') as f:
        cfg = json.load(f)
    pages = cfg['controllo']['pagine']
    new = [p for p in (f"/{c['slug']}", f"/{c['slug']}/watch") if p not in pages]
    print('pagine nel controllo:', ', '.join(new) if new else 'già tutte dentro')
    # learn.ts as it is online
    subprocess.run(['git', '-C', MAIN, 'fetch', '-q', 'origin'], capture_output=True)
    r = subprocess.run(['git', '-C', MAIN, 'show', 'origin/main:src/lib/learn.ts'], capture_output=True, text=True)
    if r.returncode or f"id: 'full-{c['id']}'" not in r.stdout:
        print(f"learn.ts online non ha ancora full-{c['id']}: prima il push, poi questo comando")
        return 2
    if dry:
        print('(prova: niente scritto)')
        return 0
    if new:
        shutil.copy(cfgp, cfgp + '.bak-' + time.strftime('%Y%m%d-%H%M%S'))
        cfg['controllo']['pagine'] = pages + new
        with open(cfgp, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
            f.write('\n')
    sys.path.insert(0, AUTO)
    import controllo  # noqa: E402  (the module of the check itself, so the list is read exactly as it reads it)
    tmp = tempfile.NamedTemporaryFile('w', suffix='.ts', delete=False, encoding='utf-8')
    tmp.write(r.stdout)
    tmp.close()
    cfg2 = json.loads(json.dumps(cfg))
    cfg2['controllo']['learn_ts'] = tmp.name
    voci, avviso = controllo.leggi_learn_ts(cfg2, logging.getLogger('new-funnel'))
    os.unlink(tmp.name)
    mine = [v for v in voci if v['id'] in (f"free-{c['id']}", f"full-{c['id']}")]
    print(f"lista dei link del controllo: {sum(v['tipo'] == 'stripe' for v in voci)} link Stripe, {sum(v['tipo'] == 'pdf' for v in voci)} PDF; del funnel: " +
          ', '.join(f"{v['id']} {v['url']}" for v in mine) + (f' ({avviso})' if avviso else ''))
    return 0 if len(mine) == 2 else 1
