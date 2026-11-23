import importlib.util
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('agent_check', Path(__file__).with_name('check.py'))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


class CorpusTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for path in check.ENTRYPOINTS:
            self.write(path, '# Contexto\n')
        self.write('.codex/config.toml', '[agents]\nmax_concurrent_threads_per_session = 2\n')
        self.write('.codex/agents/test-reviewer.toml', 'name="test-reviewer"\ndescription="Revisa"\ndeveloper_instructions="Lee sin editar"\n')
        self.skill = '.agents/skills/test-skill/SKILL.md'
        self.write(self.skill, '---\nname: "test-skill"\ndescription: "Verifica una entrega"\n---\n\n[Contexto](../../../docs/development.md)\n')

    def write(self, path, text):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)

    def errors(self, staged=False):
        return check.validate(check.Snapshot(self.root, staged))

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.root, check=True, capture_output=True)

    def test_recursive_glob_includes_root_and_deep_documents(self):
        for path in ('docs/design.md', 'docs/adr/0001-one.md', 'docs/design/reviews/mobile.md'):
            self.assertTrue(check.matches_parts(Path(path).parts, Path('docs/**/*.md').parts))
        self.assertFalse(check.matches_parts(Path('other/design.md').parts, Path('docs/**/*.md').parts))

    def test_valid_corpus(self):
        self.assertEqual(self.errors(), [])

    def test_missing_context(self):
        (self.root / 'docs/design.md').unlink()
        self.assertTrue(any('falta entrada' in e for e in self.errors()))

    def test_invalid_metadata(self):
        self.write(self.skill, '---\nname: "wrong"\ndescription: "Ayuda"\n---\n')
        self.assertTrue(any('nombre inválido' in e for e in self.errors()))

    def test_duplicate_metadata(self):
        self.write(self.skill, '---\nname: "test-skill"\nname: "test-skill"\ndescription: "Ayuda"\n---\n')
        self.assertTrue(self.errors())

    def test_broken_and_escaping_link(self):
        self.write('docs/design.md', '[Roto](missing.md)\n[Fuera](../../outside.md)\n')
        errors = self.errors()
        self.assertTrue(any('enlace roto' in e for e in errors))
        self.assertTrue(any('fuera del repositorio' in e for e in errors))

    def test_agent_cannot_claim_permission_override(self):
        path = '.codex/agents/test-reviewer.toml'
        self.write(path, (self.root/path).read_text()+'sandbox_mode="danger-full-access"\n')
        self.assertTrue(any('no permisos/modelo' in e for e in self.errors()))

    def test_config_cannot_expand_scope(self):
        self.write('.codex/config.toml', '[agents]\nmax_concurrent_threads_per_session=20\n')
        self.assertTrue(any('dos auxiliares' in e for e in self.errors()))

    def test_config_rejects_float_for_integer_limit(self):
        self.write('.codex/config.toml', '[agents]\nmax_concurrent_threads_per_session=2.0\n')
        self.assertTrue(any('dos auxiliares' in e for e in self.errors()))

    def test_ui_rejects_wrong_indentation(self):
        self.write('.agents/skills/test-skill/agents/openai.yaml', 'interface:\ndisplay_name: "Test"\nshort_description: "Descripción válida de la prueba"\ndefault_prompt: "Usa $test-skill"\n')
        self.assertTrue(any('sangría' in e for e in self.errors()))

    def prepare_hook_fixture(self):
        project = Path(__file__).resolve().parents[2]
        self.write('.githooks/pre-commit', (project / '.githooks/pre-commit').read_text())
        self.write('scripts/agents/check.py', (project / 'scripts/agents/check.py').read_text())
        # Lint-staged belongs to the existing JS checks, outside this fixture's scope.
        self.write('bin/pnpm', '#!/bin/sh\nexit 0\n')
        (self.root / 'bin/pnpm').chmod(0o755)
        self.git('init', '-q')
        self.git('add', '.')

    def run_hook(self):
        return subprocess.run(['sh', '.githooks/pre-commit'], cwd=self.root,
                              env=dict(os.environ, PATH=str(self.root / 'bin') + os.pathsep + os.environ['PATH']),
                              capture_output=True, text=True)

    def test_hook_runs_staged_validator(self):
        self.prepare_hook_fixture()
        self.assertEqual(self.run_hook().returncode, 0)
        good = (self.root / 'scripts/agents/check.py').read_text()
        self.write('scripts/agents/check.py', 'raise SystemExit(42)\n')
        self.git('add', 'scripts/agents/check.py')
        self.write('scripts/agents/check.py', good)
        self.assertEqual(self.run_hook().returncode, 42)

    def test_hook_rejects_removed_code_link_target(self):
        self.write('docs/design.md', '[Código](../apps/target.ts)\n')
        self.write('apps/target.ts', 'export const target = 1\n')
        self.prepare_hook_fixture()
        self.assertEqual(self.run_hook().returncode, 0)
        self.git('rm', '--cached', 'apps/target.ts')
        result = self.run_hook()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('enlace roto', result.stderr)

    def test_staged_content_is_not_worktree_content(self):
        self.git('init', '-q')
        self.git('add', '.')
        self.write('docs/design.md', '[Roto](missing.md)\n')
        self.assertEqual(self.errors(staged=True), [])
        self.git('add', 'docs/design.md')
        self.write('docs/design.md', '# Ahora válido, pero sin preparar\n')
        self.assertEqual(self.errors(), [])
        self.assertTrue(any('enlace roto' in e for e in self.errors(staged=True)))

    def test_staged_deleted_link_target_is_rejected(self):
        self.write('docs/design.md', '[Recurso](resource.md)\n')
        self.write('docs/resource.md', '# Recurso\n')
        self.git('init', '-q')
        self.git('add', '.')
        self.git('rm', '--cached', 'docs/resource.md')
        self.assertTrue((self.root / 'docs/resource.md').exists())
        self.assertTrue(any('enlace roto' in e for e in self.errors(staged=True)))

    def test_ui_and_adr_validation(self):
        self.write('.agents/skills/test-skill/agents/openai.yaml', 'interface:\n  display_name: "Test"\n  short_description: "corto"\n  default_prompt: "No menciona skill"\n')
        self.write('docs/adr/0001-uno.md', '# Primero\n')
        self.write('docs/adr/0001-dos.md', '# Duplicado\n')
        errors = self.errors()
        self.assertTrue(any('referencia a skill' in e for e in errors))
        self.assertTrue(any('ADR inválido' in e for e in errors))


if __name__ == '__main__':
    unittest.main()
