import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const guestAvatars = {
  default: 'Predeterminado',
  robot: 'Robot',
  cat: 'Gato',
  ghost: 'Fantasma',
  frog: 'Rana',
  alien: 'Extraterrestre',
} as const

export type GuestAvatarId = keyof typeof guestAvatars
export type GuestAvatar = { type: 'preset'; id: GuestAvatarId } | { type: 'photo'; src: string }

export const MAX_GUEST_NAME_LENGTH = 24

const defaultAvatar: GuestAvatar = { type: 'preset', id: 'default' }
export const defaultGuestProfile = { name: 'Invitado', avatar: defaultAvatar }

type GuestProfile = {
  name: string
  avatar: GuestAvatar
}

type GuestProfileStore = GuestProfile & {
  saveProfile: (profile: GuestProfile) => void
}

export function guestAvatarSrc(avatar: GuestAvatar) {
  return avatar.type === 'preset' ? `/guest-${avatar.id}.svg` : avatar.src
}

export const useGuestProfile = create<GuestProfileStore>()(
  persist(
    (set) => ({
      ...defaultGuestProfile,
      saveProfile: ({ name, avatar }) => set({ name: name.trim().slice(0, MAX_GUEST_NAME_LENGTH) || 'Invitado', avatar }),
    }),
    {
      name: 'nandos:guest-profile',
      version: 1,
      partialize: ({ name, avatar }) => ({ name, avatar }),
    },
  ),
)
