'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/app/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simple function to get user profile with direct query
  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('Loading profile for user ID:', authUser.id);
      
      // Direct query with explicit headers to debug
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile error details:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        });
        
        // If we get a permissions error, try to create the profile using service role
        if (profileError.code === '42501') { // Permission denied
          console.log('Permission denied, attempting to create profile via RPC...');
          
          // Try to insert directly
          const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              email: authUser.email,
              full_name: fullName,
              role: 'user'
            });
            
          if (insertError) {
            console.error('Insert failed:', insertError);
          } else {
            console.log('Profile created successfully');
          }
        }
        
        // Still set user with basic info
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          role: 'user'
        });
        return;
      }

      if (profile) {
        console.log('Profile found:', profile);
        setUser({
          id: profile.id,
          email: profile.email || authUser.email || '',
          name: profile.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          role: profile.role || 'user'
        });
      } else {
        console.log('No profile found, creating one...');
        
        const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: fullName,
            role: 'user'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create profile:', insertError);
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            name: fullName,
            role: 'user'
          });
        } else if (newProfile) {
          console.log('Profile created:', newProfile);
          setUser({
            id: newProfile.id,
            email: newProfile.email || authUser.email || '',
            name: newProfile.full_name || fullName,
            role: newProfile.role || 'user'
          });
        }
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        role: 'user'
      });
    }
  };

  // Initialize auth
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        setLoading(true);
        console.log('Initializing auth...');
        
        // First, test if we can access the profiles table
        const { error: testError } = await supabase
          .from('profiles')
          .select('count', { count: 'exact', head: true });
        
        if (testError) {
          console.error('Profiles table access test failed:', testError);
        } else {
          console.log('Profiles table is accessible');
        }
        
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        if (session?.user && isMounted) {
          await loadUserProfile(session.user);
        }
        
        if (isMounted) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Init auth error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to initialize auth');
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' && session?.user && isMounted) {
          await loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT' && isMounted) {
          setUser(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;
      
      if (data.user) {
        await loadUserProfile(data.user);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (signUpError) throw signUpError;
      
      return { success: true };
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (error: any) {
      console.error('Logout error:', error);
      setError(error.message || 'Failed to logout');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      signup,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  return context;
}