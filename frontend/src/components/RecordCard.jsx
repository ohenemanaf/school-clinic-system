import { Link } from 'react-router-dom';
import { IconPrinter, IconPill } from '@tabler/icons-react';
import { formatLongDate } from '../utils/format';

// One visit: diagnosis, notes and medicines, with a link to the printable prescription.
export default function RecordCard({ record }) {
    const meds = record.prescriptions || [];
    return (
        <article className="rounded-lg border border-slate-200 p-3.5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] text-slate-500">
                        {formatLongDate(record.slot_date)} · Dr. {record.staff_first_name} {record.staff_last_name}
                    </p>
                    <h3 className="mt-0.5 text-sm font-semibold text-slate-900">{record.diagnosis}</h3>
                </div>
                {meds.length > 0 && (
                    <Link
                        to={`/prescriptions/${record.record_id}`}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <IconPrinter size={14} /> Prescription
                    </Link>
                )}
            </div>

            {record.notes && <p className="mt-2 text-xs leading-relaxed text-slate-600">{record.notes}</p>}

            {meds.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 rounded-lg bg-slate-50">
                    {meds.map((m) => (
                        <li key={m.prescription_id} className="flex gap-2 px-3 py-2">
                            <IconPill size={14} className="mt-0.5 shrink-0 text-blue-500" />
                            <div className="text-xs">
                                <p className="font-medium text-slate-800">{m.medicine_name}</p>
                                <p className="text-slate-500">
                                    {[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ') || 'As directed'}
                                </p>
                                {m.instructions && <p className="mt-0.5 text-slate-500">{m.instructions}</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Records written before itemised prescriptions existed keep their free-text field. */}
            {!meds.length && record.legacy_prescription && (
                <p className="mt-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Prescription:</span> {record.legacy_prescription}
                </p>
            )}
        </article>
    );
}
