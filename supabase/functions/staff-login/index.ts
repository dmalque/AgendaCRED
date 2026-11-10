import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createLoginHandler } from './handler.ts';
const url = Deno.env.get('SUPABASE_URL')!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options);
Deno.serve(
  createLoginHandler(Deno.env.get('APP_ORIGIN'), {
    async takeAttempt(username) {
      const { data, error } = await admin.rpc('take_staff_login_attempt', {
        login_username: username,
      });
      if (error) throw error;
      return data === true;
    },
    async authenticate(username, password) {
      const { data: profile, error } = await admin
        .from('staff_profiles')
        .select('id,active')
        .eq('username', username)
        .maybeSingle();
      if (error) throw error;
      if (!profile?.active) return null;
      const { data: identity, error: identityError } = await admin.auth.admin.getUserById(
        profile.id,
      );
      if (identityError || !identity.user?.email) return null;
      // A fresh, nonprivileged Auth client per attempt prevents sharing sessions.
      const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, options);
      const { data, error: authError } = await client.auth.signInWithPassword({
        email: identity.user.email,
        password,
      });
      if (authError || !data.session) return null;
      return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
    },
  }),
);
