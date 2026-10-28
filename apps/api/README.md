# NandOS API

API Fastify desplegable como Vercel Function. La web estática usa un proxy del mismo origen para que las sesiones administrativas no dependan de cookies de terceros.

## Desarrollo local

1. Copia `.env.example` a `.env` y completa `DATABASE_URL` con la conexión pooled de Neon.
2. Genera una clave inicial larga, por ejemplo con `openssl rand -base64 48`, y guárdala en `ADMIN_BOOTSTRAP_KEY`. No uses `admin/admin` ni la publiques.
3. Mantén `FRONTEND_ORIGIN=http://localhost:5173`. Añade `BLOB_READ_WRITE_TOKEN` cuando conectes un almacén Blob.
4. Aplica el esquema y arranca el monorepo desde su raíz:

```bash
pnpm --filter @nandoos/api db:migrate
pnpm dev
```

El primer acceso administrativo aparece desde el login de Invitado. Si aún no existe una cuenta, el formulario solicita la clave inicial y permite crear un usuario y una contraseña de al menos 12 caracteres. Después de crear la cuenta, elimina `ADMIN_BOOTSTRAP_KEY` del entorno.

## Persistencia y seguridad

- Neon PostgreSQL y Drizzle guardan una cuenta administradora, sesiones revocables, el documento de contenido público/borrador, revisiones publicadas e historial de CV.
- Las contraseñas se derivan con scrypt; no se guardan en texto claro.
- La sesión usa una cookie `HttpOnly`, `Secure` en producción, `SameSite` y caducidad de siete días. Las mutaciones validan el origen web permitido.
- El visitante no inicia sesión en el backend: el acceso `Invitado` sigue siendo solo la simulación visual existente.
- El CV es público —como los PDF que ofrece actualmente la web— y se conserva en Vercel Blob. Se aceptan PDF de hasta 4 MB; la lista de versiones y la selección en borrador se guardan en PostgreSQL.
- El contenido pasa a producción solo después de pulsar «Publicar cambios».

## Vercel

En Vercel, el proyecto `nandos-api` usa `apps/api` como Root Directory y `nand-os` usa `apps/web`. En ambos proyectos activa **Include source files outside of the Root Directory** para que se empaquete el contrato compartido `packages/contracts`.

En Production, `nandos-api` necesita `DATABASE_URL` (Neon), `BLOB_READ_WRITE_TOKEN` (Blob), `FRONTEND_ORIGIN=https://nand-os.vercel.app` y `ADMIN_BOOTSTRAP_KEY`. Neon y Blob inyectan automáticamente sus variables al conectar los recursos. La clave inicial debe ser aleatoria, larga y guardarse como variable sensible; tras crear tu cuenta de administrador, elimínala. En `nand-os`, define `NANDOS_API_ORIGIN=https://nandos-api.vercel.app` y deja `VITE_API_URL` vacío para que el navegador use el proxy del mismo origen.

Aplica las migraciones antes de habilitar el acceso administrativo. Si se añade un dominio propio, actualiza `FRONTEND_ORIGIN` y `NANDOS_API_ORIGIN` con los orígenes HTTPS definitivos. Configura Preview con orígenes y ramas de base de datos separados antes de probar cambios desde previews.
