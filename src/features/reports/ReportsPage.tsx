import { roomLabel } from '../../shared/lib/rooms';
import { DateInput } from '../../shared/ui/DateInput';
import { useState } from 'react';
import { FileDown, Printer } from 'lucide-react';
import { useData, messageFor } from '../../shared/lib/data';
import { addDays, dateOnly, showDate, timeOnly, todayLima } from '../../shared/lib/dates';
import { Field, Status, statusLabels } from '../../shared/ui/Forms';
import { filterReport } from './report.logic';
export default function ReportsPage() {
  const { appointments, encounters, children, staff, followups, settings } = useData();
  const [from, setFrom] = useState(addDays(todayLima(), -30)),
    [to, setTo] = useState(todayLima()),
    [nurse, setNurse] = useState(''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [basis, setBasis] = useState<'scheduled' | 'performed'>('scheduled');
  const valid = from <= to,
    rows = valid ? filterReport(appointments, encounters, { from, to, nurse, status, basis }) : [];
  const actual = new Map(
    encounters.filter((e) => e.status === 'final').map((e) => [e.appointment_id, e.performed_on]),
  );
  async function exportExcel() {
    setBusy(true);
    setError('');
    try {
      const { default: ExcelJS } = await import('exceljs');
      const book = new ExcelJS.Workbook();
      book.creator = 'CSMI El Milagro';
      book.created = new Date();
      const sheet = book.addWorksheet('Agenda CRED');
      sheet.columns = [
        { header: 'Fecha programada', key: 'date', width: 20 },
        { header: 'Fecha real de control', key: 'performed', width: 23 },
        { header: 'Hora programada', key: 'time', width: 20 },
        { header: 'Niño o niña', key: 'name', width: 32 },
        { header: 'Documento', key: 'doc', width: 22 },
        { header: 'Enfermera', key: 'nurse', width: 30 },
        { header: 'Consultorio', key: 'room', width: 30 },
        { header: 'Estado', key: 'state', width: 20 },
      ];
      rows.forEach((a) => {
        const c = children.find((c) => c.id === a.child_id);
        sheet.addRow({
          date: dateOnly(a.starts_at),
          performed: actual.get(a.id) || '',
          time: timeOnly(a.starts_at),
          name: c?.full_name || '',
          doc: c?.document_number || '',
          nurse: staff.find((s) => s.id === a.nurse_id)?.full_name || '',
          room: roomLabel(a.room, settings),
          state: statusLabels[a.status],
        });
      });
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176E62' } };
      sheet.autoFilter = 'A1:H1';
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      const metadata = book.addWorksheet('Información');
      metadata.addRows([
        ['Establecimiento', 'CSMI El Milagro'],
        ['IPRESS', '00005222'],
        ['Desde', from],
        ['Hasta', to],
        ['Criterio de fecha', basis === 'performed' ? 'Fecha real de control' : 'Fecha programada'],
        ['Alcance', 'Agenda interna. No equivale a envío o validación HIS.'],
        ['Zona horaria', 'America/Lima'],
      ]);
      metadata.columns = [{ width: 25 }, { width: 80 }];
      const buffer = await book.xlsx.writeBuffer(),
        blob = new Blob([new Uint8Array(buffer)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = `AgendaCRED_${from}_${to}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading no-print">
        <div>
          <p className="overline">INFORMACIÓN DEL CONSULTORIO</p>
          <h1>Reportes y listas</h1>
          <p>Exporta el periodo que necesitas o imprime la lista filtrada.</p>
        </div>
      </div>
      <div className="surface no-print">
        <div className="filter-bar">
          <Field label="Criterio de fecha">
            <select
              value={basis}
              onChange={(e) => {
                setBasis(e.target.value as 'scheduled' | 'performed');
                setStatus('');
              }}
            >
              <option value="scheduled">Agenda por fecha programada</option>
              <option value="performed">Controles por fecha real</option>
            </select>
          </Field>
          <Field label="Desde">
            <DateInput
              value={from}
              onChange={(e) => {
                if (e.target.value) setFrom(e.target.value);
              }}
            />
          </Field>
          <Field label="Hasta">
            <DateInput
              value={to}
              onChange={(e) => {
                if (e.target.value) setTo(e.target.value);
              }}
            />
          </Field>
          <Field label="Enfermera">
            <select value={nurse} onChange={(e) => setNurse(e.target.value)}>
              <option value="">Todas</option>
              {staff
                .filter((s) => s.role === 'nurse')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Estado">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              {(basis === 'performed'
                ? ['completed']
                : [
                    'scheduled',
                    'arrived',
                    'in_progress',
                    'completed',
                    'no_show',
                    'cancelled',
                    'rescheduled',
                  ]
              ).map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="row-actions">
          <button
            className="button primary"
            disabled={busy || !valid || !rows.length}
            onClick={() => void exportExcel()}
          >
            <FileDown size={16} />
            {busy ? 'Preparando Excel…' : 'Descargar Excel (.xlsx)'}
          </button>
          <button className="button" disabled={!valid} onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir lista
          </button>
        </div>
        <p className="hint">
          La exportación incluye identificación y programación, sin notas clínicas ni datos de
          contacto. No se envía información al HIS.
        </p>
      </div>
      {(!valid || error) && (
        <div className="error-notice" role="alert">
          {error || 'La fecha inicial debe ser anterior o igual a la final.'}
        </div>
      )}
      <div className="stats-grid no-print">
        <div className="stat-card">
          <span>Registros filtrados</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="stat-card">
          <span>Controles realizados</span>
          <strong>{rows.filter((a) => a.status === 'completed').length}</strong>
        </div>
        <div className="stat-card">
          <span>Inasistencias</span>
          <strong>{rows.filter((a) => a.status === 'no_show').length}</strong>
        </div>
        <div className="stat-card">
          <span>Seguimientos abiertos (total)</span>
          <strong>{followups.filter((f) => f.status !== 'resolved').length}</strong>
        </div>
      </div>
      <section className="surface">
        <h2>CSMI El Milagro · Agenda CRED</h2>
        <p className="hint">
          IPRESS 00005222 · {showDate(from)} a {showDate(to)} ·{' '}
          {basis === 'performed' ? 'Fecha real del control' : 'Fecha programada'} ·{' '}
          {nurse ? staff.find((s) => s.id === nurse)?.full_name : 'Todo el equipo'} ·{' '}
          {status ? statusLabels[status] : 'Todos los estados'}
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Programación</th>
                <th>Fecha real</th>
                <th>Niño / documento</th>
                <th>Enfermera</th>
                <th>Consultorio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const c = children.find((c) => c.id === a.child_id);
                return (
                  <tr key={a.id}>
                    <td>
                      {showDate(dateOnly(a.starts_at))}
                      <br />
                      {timeOnly(a.starts_at)}
                    </td>
                    <td>{actual.get(a.id) ? showDate(actual.get(a.id)!) : '—'}</td>
                    <td>
                      {c?.full_name}
                      <br />
                      <span className="muted small">{c?.document_number}</span>
                    </td>
                    <td>{staff.find((s) => s.id === a.nurse_id)?.full_name}</td>
                    <td>{roomLabel(a.room, settings)}</td>
                    <td>
                      <Status value={a.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && (
            <div className="empty-state">Sin registros en el periodo seleccionado.</div>
          )}
        </div>
      </section>
    </>
  );
}
