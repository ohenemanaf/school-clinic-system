import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconArrowLeft, IconPrinter } from '@tabler/icons-react';
import api from '../utils/api';
import { Button, Spinner, errorMessage } from '../components/ui';
import { formatLongDate } from '../utils/format';

const CLINIC_NAME = import.meta.env.VITE_CLINIC_NAME || 'Campus Clinic';
const CLINIC_ADDRESS = import.meta.env.VITE_CLINIC_ADDRESS || 'Student Health Services';

function ageOn(dob, on) {
    const [y, m, d] = dob.split('-').map(Number);
    const [oy, om, od] = on.split('-').map(Number);
    return oy - y - (om < m || (om === m && od < d) ? 1 : 0);
}

// Printable visit summary and prescription (layout ported from the Java CLINIC app).
export default function PrescriptionPrint() {
    const { recordId } = useParams();
    const navigate = useNavigate();
    const [record, setRecord] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/records/${recordId}`)
            .then((r) => setRecord(r.data))
            .catch((err) => setError(errorMessage(err, 'Could not load this record')));
    }, [recordId]);

    useEffect(() => {
        if (record) document.title = `Prescription RX-${String(record.record_id).padStart(5, '0')} · ${CLINIC_NAME}`;
        return () => { document.title = 'Campus Clinic'; };
    }, [record]);

    if (error) return <p className="p-8 text-center text-sm text-red-600">{error}</p>;
    if (!record) return <Spinner />;

    const meds = record.prescriptions || [];
    return (
        <div className="min-h-screen bg-slate-100 px-4 py-6 print:bg-white print:p-0">
            <div className="mx-auto mb-4 flex max-w-2xl justify-between print:hidden">
                <Button variant="secondary" onClick={() => navigate(-1)}><IconArrowLeft size={16} /> Back</Button>
                <Button onClick={() => window.print()}><IconPrinter size={16} /> Print or save as PDF</Button>
            </div>

            <article className="mx-auto max-w-2xl rounded-xl bg-white p-8 text-slate-800 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
                <header className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">{CLINIC_NAME}</h1>
                        <p className="text-xs text-slate-500">{CLINIC_ADDRESS}</p>
                    </div>
                    <div className="text-right text-xs">
                        <p className="text-sm font-bold tracking-wide text-slate-900">PRESCRIPTION</p>
                        <p className="mt-1">Rx no. <span className="font-mono">RX-{String(record.record_id).padStart(5, '0')}</span></p>
                        <p>Date: {formatLongDate(record.slot_date)}</p>
                    </div>
                </header>

                <section className="grid grid-cols-2 gap-4 border-b border-slate-200 py-4 text-xs">
                    <div>
                        <p className="text-slate-500">Patient</p>
                        <p className="text-sm font-semibold">{record.student_first_name} {record.student_last_name}</p>
                        <p>Student no. {record.student_number}{record.dob && ` · Age ${ageOn(record.dob, record.slot_date)}`}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Prescriber</p>
                        <p className="text-sm font-semibold">Dr. {record.staff_first_name} {record.staff_last_name}</p>
                        <p>{[record.specialization, record.room_number].filter(Boolean).join(' · ')}</p>
                    </div>
                </section>

                <section className="border-b border-slate-200 py-4 text-xs">
                    <p className="text-slate-500">Diagnosis</p>
                    <p className="text-sm">{record.diagnosis}</p>
                    {record.notes && <p className="mt-2 leading-relaxed text-slate-600">{record.notes}</p>}
                </section>

                <section className="py-4">
                    <div className="flex items-baseline gap-2">
                        <span className="font-serif text-3xl leading-none text-slate-900">℞</span>
                        <span className="text-xs text-slate-500">{meds.length ? `${meds.length} item${meds.length > 1 ? 's' : ''}` : 'No medicines prescribed'}</span>
                    </div>
                    {meds.length > 0 && (
                        <ol className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                            {meds.map((m, i) => (
                                <li key={m.prescription_id} className="flex gap-3 py-2.5 text-xs">
                                    <span className="w-4 text-slate-400">{i + 1}.</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-900">{m.medicine_name}</p>
                                        <p className="mt-0.5 text-slate-600">
                                            {[m.dosage && `Dose: ${m.dosage}`, m.frequency && `Take: ${m.frequency}`, m.duration && `For: ${m.duration}`]
                                                .filter(Boolean)
                                                .join('   ·   ') || 'As directed'}
                                        </p>
                                        {m.instructions && <p className="mt-0.5 italic text-slate-600">{m.instructions}</p>}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                    {!meds.length && record.legacy_prescription && <p className="mt-2 text-sm">{record.legacy_prescription}</p>}
                </section>

                <footer className="mt-10 flex items-end justify-between text-xs">
                    <p className="max-w-xs text-[11px] text-slate-500">
                        Valid for 30 days from the date of issue. Bring this slip to the dispensary. Keep medicines out of reach of others.
                    </p>
                    <div className="w-48 border-t border-slate-400 pt-1 text-center text-slate-600">Prescriber's signature</div>
                </footer>
            </article>
        </div>
    );
}
