# The judge of the generator (20/11/2026): rebuild a funnel that is already online on the repo as it was BEFORE that
# funnel existed (--base, e.g. the commit before it), then compare: the new pages with the pages online (--pages-vs,
# default HEAD) and the shared files with the commit that added the funnel by hand (--vs). Only the wanted differences
# may come out; everything else is a bug of the generator.
import difflib
import os
import shutil
import subprocess
import tempfile

from . import make as M


def git(repo, *a):
    return subprocess.run(['git', '-C', repo] + list(a), capture_output=True, text=True)


def show(repo, rev, rel):
    r = git(repo, 'show', f'{rev}:{rel}')
    return r.stdout if r.returncode == 0 else None


def run(REPO, ident, base, vs, pages_vs, cfg):
    tmp = tempfile.mkdtemp(prefix=f'funnel-judge-{ident}-')
    shutil.rmtree(tmp)
    r = git(REPO, 'worktree', 'add', '--detach', tmp, base)
    if r.returncode:
        print(r.stderr)
        return 2
    try:
        c = cfg(tmp, ident)
        files, notes = M.build_all(tmp, c)
        pages = {f"src/pages/{c['slug']}/watch.astro", f"src/pages/{c['slug']}.astro", f"src/styles/optin-{c['theme']}.css", f"src/components/{M.comp(c)}.astro"}
        tot = 0
        print(f'GIUDICE {ident}: rifatto sul repo com\'era a {base}; pagine confrontate con {pages_vs}, file comuni con {vs}\n')
        for rel, text, why in files:
            ref_rev = pages_vs if rel in pages else vs
            old = show(REPO, ref_rev, rel)
            if old is None:
                print(f'== {rel}: non esiste a {ref_rev}')
                continue
            d = list(difflib.unified_diff(old.splitlines(), text.splitlines(), f'{ref_rev}:{rel}', f'generato:{rel}', n=0, lineterm=''))
            ch = sum(1 for x in d if x[:1] in '+-' and x[:3] not in ('+++', '---'))
            tot += ch
            print(f"== {rel}: {'IDENTICO' if not ch else str(ch) + ' righe diverse'}")
            for x in d[2:]:
                print('   ' + (x if len(x) < 400 else x[:400] + ' …'))
        for n in notes:
            print('nota:', n)
        print(f'\nTotale righe diverse: {tot}')
        return 0
    finally:
        git(REPO, 'worktree', 'remove', '--force', tmp)
