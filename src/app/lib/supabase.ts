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

// Test connection function with more detailed error logging
export async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // First test: Check if we can reach the API
    const { data: healthData, error: healthError } = await supabase.from('waste_records').select('count', { count: 'exact', head: true })
    
    if (healthError) {
      console.error('❌ Supabase connection failed - Database error:', {
        message: healthError.message,
        code: healthError.code,
        details: healthError.details
      })
      return false
    }
    
    console.log('✅ Supabase connection successful! Database is reachable.')
    return true
  } catch (error: any) {
    console.error('❌ Supabase connection failed - Network error:', {
      message: error.message,
      name: error.name,
      code: error.code
    })
    
    // Provide helpful error messages
    if (error.message?.includes('Failed to fetch')) {
      console.error('💡 Tip: Check if your Supabase project is paused. Visit https://app.supabase.com to reactivate it.')
    } else if (error.message?.includes('Invalid API key')) {
      console.error('💡 Tip: Your Supabase anon key might be incorrect. Check your .env.local file.')
    } else if (error.message?.includes('fetch failed')) {
      console.error('💡 Tip: Check your internet connection or try restarting your development server.')
    }
    
    return false
  }
}

// Session refresh with retry for network issues
export async function refreshSessionWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Refreshing session... (attempt ${i + 1}/${retries})`)
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error.message)
        throw error
      }
      
      console.log('✅ Session refreshed successfully')
      return data
    } catch (err: any) {
      const isNetworkError = err.message?.includes('Failed to fetch') || err.message?.includes('fetch failed')
      
      if (isNetworkError && i < retries - 1) {
        const delay = 1000 * Math.pow(2, i) // Exponential backoff: 1s, 2s, 4s
        console.log(`⚠️ Network error, retrying in ${delay}ms... (${i + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      console.error('❌ Session refresh failed after all retries:', err.message)
      throw err
    }
  }
  
  throw new Error('Session refresh failed after maximum retries')
}

// Function to check if Supabase is reachable with timeout
export async function checkSupabaseHealth(timeout = 5000): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch (error: any) {
    clearTimeout(timeoutId)
    console.error('Health check failed:', error.message)
    return false
  }
}

// Function to get detailed connection status
export async function getConnectionStatus() {
  const status = {
    url: supabaseUrl,
    urlValid: false,
    reachable: false,
    databaseAccessible: false,
    authAccessible: false,
    error: null as string | null
  }
  
  // Validate URL
  try {
    new URL(supabaseUrl)
    status.urlValid = true
  } catch {
    status.error = 'Invalid URL format'
    return status
  }
  
  // Check reachability
  status.reachable = await checkSupabaseHealth()
  
  if (!status.reachable) {
    status.error = 'Supabase server not reachable (project may be paused)'
    return status
  }
  
  // Check database access
  const dbResult = await testSupabaseConnection()
  status.databaseAccessible = dbResult
  
  // Check auth access
  try {
    const { error } = await supabase.auth.getSession()
    status.authAccessible = !error
  } catch {
    status.authAccessible = false
  }
  
  if (!status.databaseAccessible) {
    status.error = 'Database access failed - check RLS policies'
  }
  
  return status
}