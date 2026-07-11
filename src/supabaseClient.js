import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Kullanıcı adları bu sahte alan adıyla e-postaya çevrilir (Supabase Auth e-posta ister)
export const EPOSTA_ALANI = '@ogrenci.portal'
export const kullaniciAdindanEposta = (kadi) => kadi.trim().toLowerCase() + EPOSTA_ALANI

export const supabase = createClient(url, anonKey)

// Admin yeni öğrenci oluştururken kendi oturumu bozulmasın diye ikinci istemci
export const kayitIstemcisi = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
