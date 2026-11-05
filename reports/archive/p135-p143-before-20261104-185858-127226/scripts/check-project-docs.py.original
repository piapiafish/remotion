"""Check live documentation links; optionally verify the 2026-11-01 migration baseline."""
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'node_modules', '.venv', '.git', '__pycache__', 'dist', 'output', 'work', 'update-backups'}
LINK = re.compile(r'!?\[[^\]\n]*\]\((<[^>\n]+>|[^\s)\n]+)(?:\s+[\"\'][^\n]*?[\"\'])?\)')


def markdown_files():
    for base, dirs, names in os.walk(ROOT):
        dirs[:] = sorted(d for d in dirs if d not in SKIP)
        for name in sorted(names):
            if name.endswith('.md'):
                yield Path(base) / name


def link_spans(text):
    fenced = False
    offset = 0
    for line_number, line in enumerate(text.splitlines(keepends=True), 1):
        if line.lstrip().startswith(('```', '~~~')):
            fenced = not fenced
        elif not fenced:
            for match in LINK.finditer(line):
                yield offset + match.start(1), offset + match.end(1), match.group(1), line_number
        offset += len(line)


def local_target(parent, value):
    value = value.strip('<>')
    if not value or value.startswith('#') or re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:', value):
        return None
    path = unquote(urlsplit(value).path)
    if not path:
        return None
    return ((ROOT if path.startswith('/') else parent) / path.lstrip('/')).resolve()


def sha256(file):
    result = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()


def integrity_check():
    manifest = json.loads((ROOT / 'reports/current/file-organization.json').read_text(encoding='utf-8'))
    errors = []
    checked = 0
    for relative, expected in manifest['protectedFilesBefore'].items():
        file = ROOT / relative
        if not file.is_file() or sha256(file) != expected:
            errors.append({'path': relative, 'error': 'protected file missing or changed'})
        checked += 1
    for operation in manifest['operations']:
        # Readable archived Markdown has repaired links. Its exact original remains in ZIP.
        if operation['action'] == 'archive_before_update' or operation['to'].endswith('.md'):
            continue
        file = ROOT / operation['to']
        if not file.is_file() or sha256(file) != operation['sha256Before']:
            errors.append({'path': operation['to'], 'error': 'migrated evidence/asset differs'})
        checked += 1
    backup = manifest['originalDocumentsBackup']
    if sha256(ROOT / backup['path']) != backup['sha256']:
        errors.append({'path': backup['path'], 'error': 'original document backup differs'})
    return {'checked': checked + 1, 'errors': errors, 'status': 'PASS' if not errors else 'FAIL'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--integrity', action='store_true', help='check only this organization baseline too')
    args = parser.parse_args()
    required = ['README.md', 'AGENTS.md', 'IMPLEMENTATION_ROADMAP.md', 'DEVELOPMENT_LOG.md',
                'ISSUES_LOG.md', 'docs/ARCHITECTURE.md', 'docs/TESTING.md',
                'reports/current/README.md', 'reports/archive/README.md', '.env.example']
    errors = [{'path': name, 'error': 'required file missing'} for name in required if not (ROOT / name).is_file()]
    warnings = []
    files = list(markdown_files())
    for file in files:
        relative = file.relative_to(ROOT).as_posix()
        historical = relative.startswith(('reports/archive/', 'docs/reference/'))
        for _, _, value, line in link_spans(file.read_text(encoding='utf-8-sig')):
            target = local_target(file.parent, value)
            if target is not None and not target.exists():
                entry = {'file': relative, 'line': line, 'target': value}
                (warnings if historical else errors).append(entry)
    for name in ['current_plan.md', 'docs/WORK_PLAN.md', 'CONTEXT.md', 'AI_PROMO_START_HERE.md']:
        file = ROOT / name
        if not file.exists() or len(file.read_text(encoding='utf-8').splitlines()) > 12 or 'IMPLEMENTATION_ROADMAP.md' not in file.read_text(encoding='utf-8'):
            errors.append({'path': name, 'error': 'legacy entry must only redirect to the one roadmap'})
    ignore = (ROOT / '.gitignore').read_text(encoding='utf-8')
    if '!.env.example' not in ignore:
        errors.append({'path': '.gitignore', 'error': 'example environment must remain distributable'})
    integrity = integrity_check() if args.integrity else {'status': 'NOT_RUN'}
    report = {'date': datetime.now(timezone(timedelta(hours=8))).isoformat(),
              'markdownFilesChecked': len(files), 'errors': errors, 'historicalLinkWarnings': warnings,
              'integrity': integrity, 'status': 'PASS' if not errors and integrity['status'] != 'FAIL' else 'FAIL'}
    destination = ROOT / 'reports/current/document-check.json'
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
