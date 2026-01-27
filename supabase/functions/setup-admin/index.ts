import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // SECURITY: Check if any super_admin already exists
    const { data: existingAdmins, error: checkError } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1)

    if (checkError) {
      console.error('Error checking existing admins:', checkError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // If super_admin already exists, require authentication from existing super_admin
    if (existingAdmins && existingAdmins.length > 0) {
      console.log('Super admin exists - requiring authentication')
      
      const authHeader = req.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Authentication required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const token = authHeader.replace('Bearer ', '')

      // Create a client with the user's token to verify their identity
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })

      // Verify the token and get the user
      const { data: userData, error: userError } = await userClient.auth.getUser()
      if (userError || !userData?.user) {
        console.error('Auth error:', userError)
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const callerId = userData.user.id

      // Check if caller is super_admin
      const { data: roleData, error: roleError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', callerId)
        .single()

      if (roleError || roleData?.role !== 'super_admin') {
        console.error('Authorization failed - not super_admin:', roleError)
        return new Response(
          JSON.stringify({ error: 'Forbidden - Only existing super admins can create new admins' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      console.log('Caller verified as super_admin:', callerId)
    } else {
      console.log('No super_admin exists - allowing initial setup')
    }

    // Parse request body
    const { email, password, fullName } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)
    
    if (existingUser) {
      // Update password if user exists
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        existingUser.id,
        { password }
      )
      
      if (updateError) {
        console.error('Error updating admin:', updateError)
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Ensure user has super_admin role
      const { data: existingRole } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', existingUser.id)
        .single()

      if (!existingRole) {
        await adminClient.from('user_roles').insert({
          user_id: existingUser.id,
          role: 'super_admin',
        })
      } else if (existingRole.role !== 'super_admin') {
        await adminClient
          .from('user_roles')
          .update({ role: 'super_admin' })
          .eq('user_id', existingUser.id)
      }

      console.log('Admin user updated successfully:', email)
      return new Response(
        JSON.stringify({ message: 'Admin password updated successfully', userId: existingUser.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new admin user (role is NOT set in user_metadata to prevent bypass)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || 'Super Admin',
        // NOTE: Role is NOT set here - trigger defaults to pump_owner, we override below
      }
    })

    if (createError) {
      console.error('Error creating admin:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Manually set super_admin role (overriding the trigger default of pump_owner)
    if (newUser.user) {
      await adminClient
        .from('user_roles')
        .update({ role: 'super_admin' })
        .eq('user_id', newUser.user.id)

      await adminClient
        .from('profiles')
        .update({ role: 'super_admin' })
        .eq('user_id', newUser.user.id)
    }

    console.log('New admin created successfully:', email)
    return new Response(
      JSON.stringify({ 
        message: 'Admin account created successfully', 
        userId: newUser.user?.id,
        email: newUser.user?.email 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
