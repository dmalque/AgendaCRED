import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { useData } from '../../shared/lib/data';
import { ageLabel } from '../../shared/lib/dates';
import { ChildForm } from './ChildForm';
export default function ChildrenPage() {
  const { children } = useData();
  const [search, setSearch] = useState(''),
    [archived, setArchived] = useState(false),
    [form, setForm] = useState(false),
    [page, setPage] = useState(0);
  const matching = children.filter(
    (c) =>
      c.archived === archived &&
      `${c.full_name} ${c.document_number} ${c.history_number} ${c.guardian_name}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="overline">PADRÓN DEL CONSULTORIO</p>
          <h1>Niños y niñas</h1>
          <p>Una sola ficha para su programación y seguimiento.</p>
        </div>
        <button className="button primary" onClick={() => setForm(true)}>
          <Plus size={17} />
          Registrar niño
        </button>
      </div>
      <div className="surface">
        <div className="filter-bar">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Buscar niño"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="DNI, CNV, historia, nombre o cuidador"
            />
          </label>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => {
                setArchived(e.target.checked);
                setPage(0);
              }}
            />
            Ver archivados
          </label>
        </div>
        <div className="record-list">
          {matching.slice(page * 20, (page + 1) * 20).map((c) => (
            <article className="child-row" key={c.id}>
              <span className="avatar">{c.full_name[0]}</span>
              <div className="grow">
                <Link to={`/ninos/${c.id}`} className="record-title">
                  {c.full_name}
                </Link>
                <p className="small muted">
                  {c.document_type} {c.document_number} · {ageLabel(c.birth_date)}
                </p>
                <p className="small muted">Cuidador: {c.guardian_name}</p>
              </div>
              <Link className="button" to={`/ninos/${c.id}`}>
                Abrir ficha →
              </Link>
            </article>
          ))}
        </div>
        {!matching.length && (
          <div className="empty-state">No hay niños que coincidan con la búsqueda.</div>
        )}
        <div className="pagination">
          <span>{matching.length} fichas</span>
          <button className="button" disabled={!page} onClick={() => setPage(page - 1)}>
            Anterior
          </button>
          <span>{page + 1}</span>
          <button
            className="button"
            disabled={(page + 1) * 20 >= matching.length}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
      {form && <ChildForm onClose={() => setForm(false)} onSaved={() => setForm(false)} />}
    </>
  );
}
