// Legacy endpoint name retained. Privileged keys never leave this server.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createStaffHandler } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(
  createStaffHandler(Deno.env.get('APP_ORIGIN'), {
    async getCaller(token) {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return null;
      const { data: profile, error: profileError } = await admin
        .from('staff_profiles')
        .select('role,active')
        .eq('id', data.user.id)
        .single();
      return profileError || !profile ? null : { id: data.user.id, ...profile };
    },
    async createIdentity(_username, password) {
      const { data, error } = await admin.auth.admin.createUser({
        // Opaque internal Auth identifier; no mailbox or outgoing mail is used.
        email: `staff.${crypto.randomUUID()}@accounts.agendacred.invalid`,
        password,
        email_confirm: true,
      });
      return error || !data.user ? null : { id: data.user.id };
    },
    async saveProfile(token, profile) {
      // Recheck current authorization in PostgreSQL using the caller's session.
      const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { error } = await client.rpc('mutate_cred', { action: 'save_staff', p: profile });
      return !error;
    },
    async deleteIdentity(id) {
      const { error } = await admin.auth.admin.deleteUser(id);
      return !error;
    },
    async resetPassword(token, id, password) {
      const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { error: denied } = await client.rpc('mutate_cred', {
        action: 'authorize_password_reset',
        p: { id },
      });
      if (denied) return 'denied';
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      return error ? 'failed' : 'ok';
    },
  }),
);
