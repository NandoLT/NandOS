import { useState } from 'react'
import type { FormEvent } from 'react'
import styled from '@emotion/styled'
import { prepareGuestAvatar } from '../../../shared/lib/guest-avatar-photo'
import {
  guestAvatars, guestAvatarSrc, MAX_GUEST_NAME_LENGTH, useGuestProfile,
} from '../../shell/application/guest-profile.store'
import type { GuestAvatar, GuestAvatarId } from '../../shell/application/guest-profile.store'

const ProfileForm = styled.form`
  display: grid;
  gap: 12px;
  font-size: 13px;

  label { display: block; font-weight: 700; }
  input { max-width: 100%; font: inherit; }
  input[type='text'] {
    width: 100%;
    padding: 6px 8px;
    border: var(--os-inset-border);
    border-radius: var(--os-control-radius);
    color: var(--os-input-text);
    background: var(--os-input);
  }
  input:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: 1px; }
`

const ProfileHeader = styled.div`
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  label { margin-bottom: 4px; }
`

const Portrait = styled.img`
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
`

const Preview = styled.div`
  padding: 3px;
  border: var(--os-inset-border);
  background: var(--os-input-muted);
`

const AvatarPicker = styled.fieldset`
  min-width: 0;
  margin: 0;
  padding: 7px 8px 8px;
  border: var(--os-inset-border);
  legend { font-weight: 700; }
`

const AvatarChoices = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(62px, 1fr));
  gap: 5px;
  margin-bottom: 10px;
`

const ProfileButton = styled.button`
  padding: 5px 9px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: var(--os-window);
  cursor: pointer;
  &:disabled { opacity: .6; cursor: wait; }
  &:active:not(:disabled) { border: var(--os-inset-border); }
  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: 1px; }
`

const AvatarChoice = styled(ProfileButton)`
  display: grid;
  justify-items: center;
  min-width: 0;
  gap: 4px;
  padding: 4px 2px;
  font-size: 10px;
  overflow-wrap: anywhere;
  img { width: 32px; height: 32px; }
  &[aria-pressed='true'] {
    border: var(--os-inset-border);
    color: var(--os-selected-text);
    background: var(--os-selected);
  }
`

const Upload = styled.div`
  display: grid;
  gap: 5px;
  small { color: var(--os-muted); }
`

const ProfileActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  [role='alert'] { color: var(--os-danger); }
  [role='status'] { color: var(--os-muted); }
`

const presetEntries = Object.entries(guestAvatars) as [GuestAvatarId, string][]

export function GuestProfileSettings() {
  const savedName = useGuestProfile((state) => state.name)
  const savedAvatar = useGuestProfile((state) => state.avatar)
  const saveProfile = useGuestProfile((state) => state.saveProfile)
  const [name, setName] = useState(savedName)
  const [avatar, setAvatar] = useState<GuestAvatar>(savedAvatar)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null)

  const loadPhoto = async (file: File) => {
    setFeedback(null)
    setBusy(true)
    try {
      setAvatar({ type: 'photo', src: await prepareGuestAvatar(file) })
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'No se ha podido cargar la foto.', error: true })
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (!name.trim()) {
      setFeedback({ text: 'Escribe un nombre de usuario.', error: true })
      return
    }
    try {
      saveProfile({ name, avatar })
      setName(name.trim())
      setFeedback({ text: 'Perfil guardado en este navegador.', error: false })
    } catch {
      setFeedback({ text: 'No se ha podido guardar el perfil en el navegador.', error: true })
    }
  }

  return (
    <>
      <h2>Usuario</h2>
      <p>Personaliza tu perfil de invitado. Tu nombre y avatar solo se guardan en este navegador.</p>
      <ProfileForm onSubmit={submit}>
        <ProfileHeader>
          <Preview><Portrait src={guestAvatarSrc(avatar)} alt="Vista previa del avatar" /></Preview>
          <div>
            <label htmlFor="guest-profile-name">Nombre de usuario</label>
            <input id="guest-profile-name" type="text" autoComplete="off" required
              maxLength={MAX_GUEST_NAME_LENGTH} value={name}
              onChange={(event) => { setName(event.target.value); setFeedback(null) }} />
          </div>
        </ProfileHeader>
        <AvatarPicker>
          <legend>Avatar</legend>
          <AvatarChoices>
            {presetEntries.map(([id, label]) => (
              <AvatarChoice key={id} type="button" disabled={busy}
                aria-pressed={avatar.type === 'preset' && avatar.id === id}
                onClick={() => { setAvatar({ type: 'preset', id }); setFeedback(null) }}>
                <Portrait src={guestAvatarSrc({ type: 'preset', id })} alt="" />
                {label}
              </AvatarChoice>
            ))}
          </AvatarChoices>
          <Upload>
            <label htmlFor="guest-profile-photo">Subir una foto</label>
            <input id="guest-profile-photo" type="file" disabled={busy}
              accept="image/jpeg,image/png,image/webp" aria-describedby="guest-photo-formats"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void loadPhoto(file)
              }} />
            <small id="guest-photo-formats">JPG, PNG o WebP · hasta 10 MB.</small>
          </Upload>
        </AvatarPicker>
        <ProfileActions>
          <ProfileButton type="submit" disabled={busy}>Guardar perfil</ProfileButton>
          {busy && <span role="status">Preparando imagen…</span>}
          {feedback && <span role={feedback.error ? 'alert' : 'status'}>{feedback.text}</span>}
        </ProfileActions>
      </ProfileForm>
    </>
  )
}
