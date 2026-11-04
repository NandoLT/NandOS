import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { WikiSynchronizationStatus } from '@nandoos/contracts'
import { wikiSynchronizationKey } from '../application/wiki-api'
import type { WikiSynchronizationRepository } from '../application/wiki-api'
import * as S from './wiki.styles'

const labels = { updated: 'Actualizado', outdated: 'Desactualizado', syncing: 'Sincronizando',
  'not-configured': 'Sin configurar', error: 'No se pudo comprobar' } as const

export function WikiSynchronization({ scope, repository }: { scope: string; repository?: WikiSynchronizationRepository }) {
  const client = useQueryClient()
  const queryKey = wikiSynchronizationKey(scope)
  const query = useQuery({ queryKey, queryFn: () => repository!.status(), enabled: Boolean(repository), retry: false,
    staleTime: 0, refetchOnWindowFocus: true,
    refetchInterval: (query) => query.state.data?.state === 'syncing' ? 1500 : 30_000 })
  const synchronization = useMutation({
    mutationFn: () => repository!.synchronize(),
    onMutate: async () => { await client.cancelQueries({ queryKey }) },
    onSuccess: (status) => { client.setQueryData<WikiSynchronizationStatus>(queryKey, status) },
    onSettled: () => { void client.invalidateQueries({ queryKey }) },
  })
  const checking = Boolean(repository) && query.isFetching && !synchronization.isPending
  const state = !repository ? 'not-configured' : synchronization.isPending ? 'syncing' : query.isError ? 'error' : query.data?.state
  const label = checking || !state ? 'Comprobando…' : labels[state]
  const busy = state === 'syncing'
  const canSynchronize = Boolean(repository) && !checking && !busy && (state === 'updated' || state === 'outdated')
  const message = query.isError ? 'No se pudo consultar el estado. Comprueba la conexión y vuelve a intentarlo.'
    : query.data?.message ?? (state === 'not-configured' ? 'La sincronización no está configurada en este entorno.'
    : state === 'outdated' ? 'Hay publicaciones pendientes de sincronizar con el índice de nandBot.'
    : state === 'updated' ? 'El índice coincide con la versión publicada de la wiki.'
    : state === 'syncing' ? 'Preparando el índice. Puedes seguir editando borradores; no cierres esta página hasta confirmar el resultado.' : '')

  return <S.SyncCard aria-label="Sincronización de la wiki" aria-busy={busy || checking}>
    <div>
      <S.SyncHeading><h3>Índice de nandBot</h3><S.SyncBadge role="status" aria-live="polite" $state={state}>
        {state === 'updated' && !checking ? '✓ ' : state === 'outdated' && !checking ? '! ' : ''}<span>{label}</span>
      </S.SyncBadge></S.SyncHeading>
      <p>{message}</p>
      <small>Solo se sincronizan artículos publicados. Guardar un borrador no cambia este estado.</small>
      {query.data?.publishedArticles != null && <small>
        Publicados: {query.data.publishedArticles} · En el índice: {query.data.indexedArticles ?? '—'} · Fragmentos: {query.data.indexedChunks ?? '—'}
      </small>}
      {synchronization.isError && <S.Notice $error role="alert">{synchronization.error.message}</S.Notice>}
    </div>
    <S.Actions>
      <S.Button type="button" disabled={!repository || checking || busy} onClick={() => {
        synchronization.reset()
        void query.refetch()
      }}>Comprobar estado</S.Button>
      <S.Button type="button" $primary disabled={!canSynchronize} onClick={() => synchronization.mutate()}>
        {busy ? 'Sincronizando…' : 'Sincronizar wiki'}
      </S.Button>
    </S.Actions>
  </S.SyncCard>
}
