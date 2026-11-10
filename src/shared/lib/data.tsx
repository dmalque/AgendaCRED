import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { supabase } from './supabase';
import type { Appointment, Child, ClosedDay, Encounter, Followup, Settings, Staff } from '../types';

export function db() {
  if (!supabase) throw new Error('Configura Supabase para utilizar la agenda.');
  return supabase;
}
export function messageFor(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (e.code === '23P01')
    return 'El horario se cruza con otro control del niño, la enfermera o el consultorio.';
  if (e.code === '23505')
    return 'Ya existe ese documento o registro. Actualiza la pantalla y verifica el historial.';
  if (e.code === '40001')
    return 'Otra persona modificó este registro. Actualiza y vuelve a intentarlo.';
  if (e.message?.startsWith('CRED:')) return e.message.slice(5).trim();
  if (['42P01', 'PGRST202', 'PGRST205'].includes(e.code || ''))
    return 'Falta aplicar las migraciones de la agenda en Supabase. Consulta la guía INSTALAR.md.';
  if (e.code === '23514' || e.code === '23502' || e.code === '22P02')
    return 'Revisa los campos y los rangos permitidos antes de guardar.';
  if (e.code === '42501')
    return 'Tu cuenta no tiene permiso para esta operación. Solicita al administrador que revise tu acceso.';
  return 'No se pudo completar la operación. Comprueba la conexión y vuelve a intentarlo.';
}
export async function getRows<T>(
  table: string,
  filters: Record<string, string> = {},
): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; offset < 100000;) {
    let query = db()
      .from(table)
      .select('*', { count: 'exact' })
      .order(table === 'closed_days' ? 'date' : 'id')
      .range(offset, offset + 999);
    for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
    const { data, error, count } = await query;
    if (error) throw error;
    all.push(...(data as T[]));
    if (!data.length || (count !== null && all.length >= count)) return all;
    offset += data.length;
  }
  throw new Error('Dataset too large');
}
export async function mutate(action: string, payload: Record<string, unknown>) {
  const { data, error } = await db().rpc('mutate_cred', { action, p: payload });
  if (error) throw error;
  return data as { id: string };
}
type Data = {
  children: Child[];
  appointments: Appointment[];
  encounters: Encounter[];
  followups: Followup[];
  staff: Staff[];
  settings: Settings | null;
  closedDays: ClosedDay[];
};
type Context = Data & {
  loading: boolean;
  error: string;
  version: number;
  refresh: () => Promise<void>;
  notify: (text: string) => void;
};
const DataContext = createContext<Context | null>(null);
const empty: Data = {
  children: [],
  appointments: [],
  encounters: [],
  followups: [],
  staff: [],
  settings: null,
  closedDays: [],
};
export function DataProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<Data>(empty),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [version, setVersion] = useState(0);
  const refresh = useCallback(async () => {
    try {
      const [children, appointments, encounters, followups, staff, settings, closedDays] =
        await Promise.all([
          getRows<Child>('children'),
          getRows<Appointment>('appointments'),
          getRows<Encounter>('encounters'),
          getRows<Followup>('followups'),
          getRows<Staff>('staff_profiles'),
          getRows<Settings>('facility_settings'),
          getRows<ClosedDay>('closed_days'),
        ]);
      setData({
        children,
        appointments,
        encounters,
        followups,
        staff,
        settings: settings[0] || null,
        closedDays,
      });
      setVersion((v) => v + 1);
      setError('');
    } catch (error) {
      setError(messageFor(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true,
      subscribed = false;
    let debounce: ReturnType<typeof setTimeout>;
    const run = () => {
      if (active && document.visibilityState !== 'hidden') void refresh();
    };
    const channel = db()
      .channel('cred-workspace')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(run, 250);
      })
      .subscribe((status) => {
        subscribed = status === 'SUBSCRIBED';
      });
    void refresh();
    const timer = setInterval(() => {
      if (!subscribed) run();
    }, 60000);
    window.addEventListener('focus', run);
    return () => {
      active = false;
      clearInterval(timer);
      clearTimeout(debounce);
      window.removeEventListener('focus', run);
      void db().removeChannel(channel);
    };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 7000);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <DataContext.Provider value={{ ...data, loading, error, version, refresh, notify: setNotice }}>
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </DataContext.Provider>
  );
}
export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('DataProvider required');
  return context;
}
