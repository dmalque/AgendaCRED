import { Plus } from 'lucide-react';
import { facility } from '../config/facility';
export function Brand() {
  return <div className="brand"><span className="brand-mark"><Plus size={23} strokeWidth={3} aria-hidden="true" /></span><div><span>CRED<span className="brand-suffix">agenda</span></span><span className="brand-facility">{facility.shortName}</span></div></div>;
}
