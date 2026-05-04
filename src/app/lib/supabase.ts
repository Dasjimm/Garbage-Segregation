import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Better error handling for missing environment variables
if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Validate URL format
try {
  new URL(supabaseUrl)
  console.log('✅ Supabase URL format is valid:', supabaseUrl)
} catch {
  console.error('❌ Invalid Supabase URL format:', supabaseUrl)
  throw new Error('Invalid Supabase URL format')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-application-name': 'ecowaste-recycling',
    },
  },
})

// Test connection function
export async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    const { data: healthData, error: healthError } = await supabase
      .from('waste_records')
      .select('count', { count: 'exact', head: true })
    
    if (healthError) {
      console.error('❌ Supabase connection failed - Database error:', {
        message: healthError.message,
        code: healthError.code,
        details: healthError.details
      })
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    return true
  } catch (error: any) {
    console.error('❌ Supabase connection failed - Network error:', {
      message: error.message,
      name: error.name,
      code: error.code
    })
    return false
  }
}

// Session refresh with retry
export async function refreshSessionWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Refreshing session... (${i + 1}/${retries})`)
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) throw error
      
      console.log('✅ Session refreshed successfully')
      return data
    } catch (err: any) {
      const isNetworkError =
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('fetch failed')

      if (isNetworkError && i < retries - 1) {
        const delay = 1000 * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw err
    }
  }

  throw new Error('Session refresh failed after maximum retries')
}

// ✅ FIXED FUNCTION (this caused your Vercel error)
export async function checkSupabaseHealth(timeout = 5000): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // ✅ Explicit check (fixes TypeScript error)
    if (!supabaseAnonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch (error: any) {
    clearTimeout(timeoutId)
    console.error('Health check failed:', error.message)
    return false
  }
}

// Connection status checker
export async function getConnectionStatus() {
  const status = {
    url: supabaseUrl,
    urlValid: false,
    reachable: false,
    databaseAccessible: false,
    authAccessible: false,
    error: null as string | null,
  }

  try {
  new URL(supabaseUrl!) // ✅ FIXED
  status.urlValid = true
} catch {
  status.error = 'Invalid URL format'
  return status
}
  status.reachable = await checkSupabaseHealth()

  if (!status.reachable) {
    status.error = 'Supabase server not reachable'
    return status
  }

  status.databaseAccessible = await testSupabaseConnection()

  try {
    const { error } = await supabase.auth.getSession()
    status.authAccessible = !error
  } catch {
    status.authAccessible = false
  }

  if (!status.databaseAccessible) {
    status.error = 'Database access failed'
  }

  return status
}