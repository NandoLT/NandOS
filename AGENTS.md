# Estándar de commits

- Haz un commit por cambio lógico: una funcionalidad, una corrección o un ajuste de infraestructura. Agrupa con el cambio sus pruebas y documentación.
- Si coinciden cambios de áreas distintas, prepara y revisa cada grupo por separado con `git diff --cached`. Usa selección por bloques si un archivo contiene cambios de varios grupos. Conserva intactos los cambios ajenos a la entrega.
- Usa un mensaje descriptivo con el prefijo que corresponda, como `feat:`, `fix:`, `ci:` o `docs:`. Cada commit debe dejar el repositorio en un estado coherente.
- Integra mediante un pull request que pase **Verify monorepo**. Si un pull request contiene varios commits que deben quedar separados, usa integración por rebase para conservarlos en `main`.
