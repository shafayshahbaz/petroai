import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // CRITICAL: Verify the caller is authenticated and is a super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No valid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create a client with the user's token to verify their identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verify the token and get the user
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = userData.user.id;

    // Create admin client to check caller's role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if caller is super_admin using service role client
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .single();

    if (roleError || roleData?.role !== "super_admin") {
      console.error("Authorization failed - not super_admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Forbidden - Only super admins can delete accounts permanently" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { userId, clientId } = await req.json();

    if (!userId || !clientId) {
      return new Response(
        JSON.stringify({ error: "Missing userId or clientId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (userId === callerId) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting permanent deletion for user: ${userId}, client: ${clientId}`);

    // Step 1: Delete from clients table (this will cascade if foreign keys are set)
    const { error: clientError } = await adminClient
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (clientError) {
      console.error("Error deleting client:", clientError);
      return new Response(
        JSON.stringify({ error: `Failed to delete client record: ${clientError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Delete from profiles table
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
      // Continue anyway - profile deletion is secondary
    }

    // Step 3: Delete from user_roles table
    const { error: roleDeleteError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (roleDeleteError) {
      console.error("Error deleting user roles:", roleDeleteError);
      // Continue anyway - role deletion is secondary
    }

    // Step 4: Delete from auth.users (this is the final step - user cannot login after this)
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("Error deleting auth user:", authError);
      return new Response(
        JSON.stringify({ error: `Failed to delete auth user: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully deleted user ${userId} permanently`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account deleted permanently. User can no longer access the system." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
