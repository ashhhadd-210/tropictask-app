import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Initialize Supabase client
// In development without keys, we fall back to local mock data
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseConfigured = () => !!supabase

// ═══════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════

export async function signIn(email, password) {
  if (!supabase) return { error: 'Supabase not configured — using local mode' }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signUp(email, password, metadata = {}) {
  if (!supabase) return { error: 'Supabase not configured — using local mode' }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  })
  return { data, error }
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ═══════════════════════════════════════════
// DATABASE HELPERS
// ═══════════════════════════════════════════

export async function fetchProperties(userId, role) {
  if (!supabase) return []
  let query = supabase.from('properties').select('*')
  if (role === 'owner') {
    query = query.eq('owner_id', userId)
  } else if (role === 'tenant') {
    // Tenant sees the property they're assigned to — fetched via profile.property_id
    // We fetch all and filter client-side, or use RLS
    query = query // RLS handles tenant visibility
  } else {
    // Default: manager sees properties they manage
    query = query.eq('manager_id', userId)
  }
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) { console.error('fetchProperties:', error); return [] }
  return data
}

// Fetch ALL properties this user can see — RLS handles visibility
export async function fetchAllUserProperties(userId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchAllUserProperties:', error); return [] }
  return data || []
}

export async function updateProperty(propertyId, updates) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('properties')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', propertyId)
    .select()
    .single()
  if (error) { console.error('updateProperty:', error); return null }
  return data
}

export async function deleteProperty(propertyId) {
  if (!supabase) return false
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)
  if (error) { console.error('deleteProperty:', error); return false }
  return true
}

export async function fetchWorkOrders(filters = {}) {
  if (!supabase) return []
  let query = supabase.from('work_orders').select('*')
  if (filters.property_id) query = query.eq('property_id', filters.property_id)
  if (filters.contractor_id) query = query.eq('contractor_id', filters.contractor_id)
  if (filters.submitted_by) query = query.eq('submitted_by', filters.submitted_by)
  if (filters.stage_lt) query = query.lt('stage', filters.stage_lt)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) { console.error('fetchWorkOrders:', error); return [] }
  return data
}

export async function updateWorkOrderStage(woId, newStage, updates = {}) {
  if (!supabase) return null
  const payload = { stage: Number(newStage) }
  if (updates.contractor_id) payload.contractor_id = updates.contractor_id
  const { data, error } = await supabase
    .from('work_orders')
    .update(payload)
    .eq('id', woId)
    .select()
    .single()
  if (error) { console.error('updateWorkOrderStage:', error); return null }
  return data
}

export async function createWorkOrder(wo) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('work_orders')
    .insert(wo)
    .select()
    .single()
  if (error) { console.error('createWorkOrder:', error); return null }
  return data
}

export async function createProperty(property) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single()
  if (error) { console.error('createProperty:', error); return null }
  return data
}

export async function createPayment(payment) {
  if (!supabase) return null
  // Strip fields that don't exist in the payment_requests schema
  const { title, ...dbPayment } = payment
  // Store title in the note field if note is empty
  if (title && !dbPayment.note) dbPayment.note = title
  const { data, error } = await supabase
    .from('payment_requests')
    .insert(dbPayment)
    .select()
    .single()
  if (error) { console.error('createPayment:', error); return null }
  // Add title back for UI display
  if (title) data.title = title
  return data
}

export async function updatePaymentStatus(paymentId, status) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('payment_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', paymentId)
    .select()
    .single()
  if (error) { console.error('updatePaymentStatus:', error); return null }
  return data
}

export async function fetchPayments(filters = {}) {
  if (!supabase) return []
  let query = supabase.from('payment_requests').select('*')
  if (filters.created_by) query = query.eq('created_by', filters.created_by)
  if (filters.recipient_id) query = query.eq('recipient_id', filters.recipient_id)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) { console.error('fetchPayments:', error); return [] }
  return data
}

export async function fetchComponents(filters = {}) {
  if (!supabase) return []
  let query = supabase.from('components').select('*')
  if (filters.property_id) query = query.eq('property_id', filters.property_id)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) { console.error('fetchComponents:', error); return [] }
  return data
}

export async function fetchReviews(filters = {}) {
  if (!supabase) return []
  let query = supabase.from('reviews').select('*')
  if (filters.contractor_id) query = query.eq('contractor_id', filters.contractor_id)
  if (filters.manager_id) query = query.eq('manager_id', filters.manager_id)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) { console.error('fetchReviews:', error); return [] }
  return data
}

export async function fetchProfile(userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) { console.error('fetchProfile:', error); return null }
  return data
}

export async function fetchProfiles(filters = {}) {
  if (!supabase) return []
  let query = supabase.from('profiles').select('*')
  if (filters.manager_id) query = query.eq('manager_id', filters.manager_id)
  if (filters.role) query = query.contains('roles', [filters.role])
  const { data, error } = await query.order('name', { ascending: true })
  if (error) { console.error('fetchProfiles:', error); return [] }
  return data
}

export async function searchProfiles(query, managerId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, roles, property_id')
    .eq('manager_id', managerId)
    .ilike('name', `%${query}%`)
    .limit(10)
  if (error) { console.error('searchProfiles:', error); return [] }
  return data
}

export async function updateProfile(userId, updates) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) { console.error('updateProfile:', error); return null }
  return data
}

// ═══════════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ═══════════════════════════════════════════

export function subscribeToWorkOrders(callback) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('work_orders_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, callback)
    .subscribe()
  return () => supabase.removeChannel(channel)
}
