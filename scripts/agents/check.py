#!/usr/bin/env python3
"""Validate NandOS-owned agent guidance, offline. Python >= 3.11, no packages."""
from __future__ import annotations

import argparse
import fnmatch
import json
import re
import subprocess
import sys
import tomllib
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

ENTRYPOINTS = ('AGENTS.md', 'docs/development.md', 'docs/engineering.md',
               'docs/design.md', 'docs/architecture.md', 'docs/adr/README.md')
NAME = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*')
LINK = re.compile(r'\[[^\]]*\]\(([^)]+)\)')


def matches_parts(path: tuple[str, ...], pattern: tuple[str, ...]) -> bool:
    if not pattern:
        return not path
    if pattern[0] == '**':
        return matches_parts(path, pattern[1:]) or bool(path) and matches_parts(path[1:], pattern)
    return bool(path) and fnmatch.fnmatchcase(path[0], pattern[0]) and matches_parts(path[1:], pattern[1:])


class Snapshot:
    def __init__(self, root: Path, staged: bool = False):
        self.root = root.resolve()
        self.staged = staged
        self.index: set[str] = set()
        if staged:
            result = subprocess.run(['git', 'ls-files', '--cached', '-z'], cwd=root,
                                    check=True, capture_output=True)
            self.index = set(result.stdout.decode().strip('\0').split('\0'))

    def files(self, pattern: str) -> list[str]:
        if self.staged:
            return sorted(p for p in self.index if matches_parts(PurePosixPath(p).parts, PurePosixPath(pattern).parts))
        return sorted(str(p.relative_to(self.root)) for p in self.root.glob(pattern) if p.is_file())

    def read(self, name: str) -> str:
        if self.staged:
            return subprocess.run(['git', 'show', f':{name}'], cwd=self.root,
                                  check=True, capture_output=True).stdout.decode()
        return (self.root / name).read_text()

    def exists(self, name: str) -> bool:
        if self.staged:
            return name in self.index or any(p.startswith(name.rstrip('/') + '/') for p in self.index)
        return (self.root / name).exists()


def flat_metadata(text: str) -> dict[str, str]:
    """Owned skill subset: name + description, JSON-quoted strings, no general YAML."""
    match = re.match(r'\A---\r?\n(.*?)\r?\n---\r?\n', text, re.S)
    if not match:
        raise ValueError('falta frontmatter delimitado')
    result = {}
    for line in match[1].splitlines():
        key, sep, raw = line.partition(':')
        if not sep or key not in ('name', 'description') or key in result:
            raise ValueError('frontmatter propio: solo name y description únicos')
        value = json.loads(raw.strip())
        if not isinstance(value, str) or not value.strip():
            raise ValueError('metadato vacío o no textual')
        result[key] = value
    if set(result) != {'name', 'description'}:
        raise ValueError('faltan name o description')
    return result


def local_target(source: str, href: str) -> str | None:
    href = href.strip().strip('<>')
    parsed = urlsplit(href)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    if parsed.path.startswith('/'):
        raise ValueError('enlace local absoluto no portable')
    pieces = list(PurePosixPath(source).parent.parts)
    for part in PurePosixPath(unquote(parsed.path)).parts:
        if part == '..':
            if not pieces:
                raise ValueError('enlace fuera del repositorio')
            pieces.pop()
        elif part != '.':
            pieces.append(part)
    return '/'.join(pieces)


def validate(snapshot: Snapshot) -> list[str]:
    errors: list[str] = []
    for path in ENTRYPOINTS:
        if not snapshot.exists(path):
            errors.append(f'{path}: falta entrada de contexto')
    skill_paths = snapshot.files('.agents/skills/*/SKILL.md')
    role_paths = snapshot.files('.codex/agents/*.toml')
    if not skill_paths:
        errors.append('.agents/skills: no hay skills')
    if not role_paths:
        errors.append('.codex/agents: no hay perfiles')
    seen = set()
    for path in skill_paths:
        try:
            meta = flat_metadata(snapshot.read(path))
            name = meta['name']
            if not NAME.fullmatch(name) or len(name) > 64 or PurePosixPath(path).parent.name != name:
                raise ValueError('nombre inválido o distinto de su carpeta')
            if name in seen:
                raise ValueError('nombre de skill duplicado')
            seen.add(name)
            ui_path = str(PurePosixPath(path).parent / 'agents/openai.yaml')
            if snapshot.exists(ui_path):
                lines = snapshot.read(ui_path).splitlines()
                if not lines or lines[0] != 'interface:':
                    raise ValueError('metadatos UI propios: se espera interface')
                ui = {}
                for line in lines[1:]:
                    if not re.fullmatch(r'  [a-z_]+: .+', line):
                        raise ValueError('metadatos UI requieren sangría de dos espacios bajo interface')
                    key, sep, raw = line[2:].partition(':')
                    if not sep or key in ui or key not in ('display_name', 'short_description', 'default_prompt'):
                        raise ValueError('metadatos UI duplicados o no admitidos')
                    ui[key] = json.loads(raw.strip())
                    if not isinstance(ui[key], str) or not ui[key].strip():
                        raise ValueError('metadato UI no textual o vacío')
                if set(ui) != {'display_name', 'short_description', 'default_prompt'}:
                    raise ValueError('metadatos UI incompletos')
                if not 25 <= len(ui['short_description']) <= 64 or f'${name}' not in ui['default_prompt']:
                    raise ValueError('descripción UI o referencia a skill inválida')
        except (ValueError, KeyError, subprocess.CalledProcessError, OSError) as error:
            errors.append(f'{path}: {error}')
    roles = set()
    for path in role_paths:
        try:
            role = tomllib.loads(snapshot.read(path))
            if set(role) != {'name', 'description', 'developer_instructions'}:
                raise ValueError('perfil propio solo admite nombre, descripción e instrucciones; no permisos/modelo')
            if not all(isinstance(v, str) and v.strip() for v in role.values()):
                raise ValueError('campos obligatorios vacíos o no textuales')
            name = role['name']
            if not NAME.fullmatch(name) or PurePosixPath(path).stem != name or name in roles:
                raise ValueError('nombre inválido, duplicado o distinto del fichero')
            roles.add(name)
        except (ValueError, subprocess.CalledProcessError, OSError) as error:
            errors.append(f'{path}: {error}')
    try:
        config = tomllib.loads(snapshot.read('.codex/config.toml'))
        if (config != {'agents': {'max_concurrent_threads_per_session': 2}}
                or type(config.get('agents', {}).get('max_concurrent_threads_per_session')) is not int):
            errors.append('.codex/config.toml: solo se admite el límite local de dos auxiliares')
    except (ValueError, subprocess.CalledProcessError, OSError) as error:
        errors.append(f'.codex/config.toml: {error}')
    markdown = set(snapshot.files('docs/**/*.md') + snapshot.files('.agents/skills/**/SKILL.md') + ['AGENTS.md'])
    for path in sorted(markdown):
        if not snapshot.exists(path):
            continue
        # Ignore code fences. This is a scoped inline-link check, not a Markdown parser.
        text = re.sub(r'```.*?```', '', snapshot.read(path), flags=re.S)
        for href in LINK.findall(text):
            try:
                target = local_target(path, href)
                if target and not snapshot.exists(target):
                    errors.append(f'{path}: enlace roto → {target}')
            except ValueError as error:
                errors.append(f'{path}: {error}')
    adr_ids = set()
    for path in snapshot.files('docs/adr/[0-9]*.md'):
        number = PurePosixPath(path).name.split('-')[0]
        if number in adr_ids or not re.fullmatch(r'\d{4}', number):
            errors.append(f'{path}: identificador ADR inválido o duplicado')
        adr_ids.add(number)
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path)
    parser.add_argument('--staged', action='store_true')
    args = parser.parse_args()
    args.root = args.root or Path(__file__).resolve().parents[2]
    try:
        snapshot = Snapshot(args.root, staged=args.staged)
        errors = validate(snapshot)
    except (subprocess.CalledProcessError, OSError, UnicodeError) as error:
        print(f'No se pudo leer el corpus: {error}', file=sys.stderr)
        return 1
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print('Agentes: metadatos, perfiles y enlaces válidos (' + ('índice' if snapshot.staged else 'árbol de trabajo') + ').')
    return 0


if __name__ == '__main__':
    sys.exit(main())
