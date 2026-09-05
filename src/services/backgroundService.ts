import { createClient, type Session, type User } from '@supabase/supabase-js'
import type { BackgroundOption } from '../utils/photoUtils'

export type BackgroundRecord = BackgroundOption & {
  storage_path: string
  is_active: boolean
  sort_order: number
  created_at: string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string | undefined

export function isAdminUser(user: User | null): boolean {
  return Boolean(user?.email && adminEmail && user.email.toLowerCase() === adminEmail.toLowerCase())
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signInAdmin(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOutAdmin(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function fetchActiveBackgrounds(): Promise<BackgroundRecord[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('backgrounds')
    .select('id,name,image_url,storage_path,is_active,sort_order,created_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map((background) => ({
    ...background,
    image: background.image_url,
    color: '#d9f1e7',
  })) as BackgroundRecord[]
}

export async function fetchAllBackgrounds(): Promise<BackgroundRecord[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('backgrounds')
    .select('id,name,image_url,storage_path,is_active,sort_order,created_at')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map((background) => ({
    ...background,
    image: background.image_url,
    color: '#d9f1e7',
  })) as BackgroundRecord[]
}

export async function uploadBackground(
  name: string,
  file: File,
  sortOrder: number,
): Promise<void> {
  if (!supabase) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
  const storagePath = `${crypto.randomUUID()}/background.${extension}`
  const { error: uploadError } = await supabase.storage
    .from('photo-backgrounds')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('photo-backgrounds').getPublicUrl(storagePath)
  const { error: insertError } = await supabase.from('backgrounds').insert({
    name,
    image_url: data.publicUrl,
    storage_path: storagePath,
    is_active: true,
    sort_order: sortOrder,
  })

  if (insertError) {
    await supabase.storage.from('photo-backgrounds').remove([storagePath])
    throw insertError
  }
}

export async function updateBackgroundStatus(id: string, isActive: boolean): Promise<void> {
  if (!supabase) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  const { error } = await supabase.from('backgrounds').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}

export async function deleteBackground(background: BackgroundRecord): Promise<void> {
  if (!supabase) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  const { error: storageError } = await supabase.storage
    .from('photo-backgrounds')
    .remove([background.storage_path])

  if (storageError) throw storageError

  const { error: databaseError } = await supabase.from('backgrounds').delete().eq('id', background.id)
  if (databaseError) throw databaseError
}
