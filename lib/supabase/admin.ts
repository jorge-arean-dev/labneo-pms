import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase admin client with service_role privileges
 *
 * SECURITY WARNING:
 * - Only use this on the SERVER (server actions, API routes)
 * - NEVER expose service_role key to the client
 * - This client BYPASSES Row Level Security (RLS)
 * - Has full admin privileges (create/delete users, ban users, etc.)
 *
 * Use cases:
 * - Creating auth users (auth.admin.createUser)
 * - Deleting auth users (auth.admin.deleteUser)
 * - Banning users (auth.admin.updateUserById)
 * - Getting user data (auth.admin.getUserById)
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
