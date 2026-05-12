import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
    ArrowLeft, ChevronDown, ChevronLeft, ChevronRight,
    Search, Calendar, FileText, Users, TrendingUp, Clock, AlertCircle, Printer
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const calcularDiasLaborables = (mes) => {
    const [year, month] = mes.split('-').map(Number);
    const diasEnMes = new Date(year, month, 0).getDate();
    let count = 0;
    for (let d = 1; d <= diasEnMes; d++) {
        const diaSemana = new Date(year, month - 1, d).getDay();
        if (diaSemana !== 0) count++;
    }
    return count;
};

const fechaDia = (mes, d) => {
    const [y, m] = mes.split('-');
    return `${y}-${m}-${String(d).padStart(2, '0')}`;
};

const diasEnMesTotal = (mes) => {
    const [y, m] = mes.split('-').map(Number);
    return new Date(y, m, 0).getDate();
};

const diaSemanaInicio = (mes) => {
    const [y, m] = mes.split('-').map(Number);
    return new Date(y, m - 1, 1).getDay();
};

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Selector de Mes Visual (Dropdown) ───────────────────────────────────────

const SelectorMes = ({ filtroMes, onChange }) => {
    const [abierto, setAbierto] = useState(false);
    const [anioVista, setAnioVista] = useState(() => Number(filtroMes.split('-')[0]));
    const mesActual = Number(filtroMes.split('-')[1]) - 1;
    const anioActual = Number(filtroMes.split('-')[0]);
    const hoyAnio = new Date().getFullYear();
    const hoyMes = new Date().getMonth();

    const seleccionar = (mesIdx) => {
        const mm = String(mesIdx + 1).padStart(2, '0');
        onChange(`${anioVista}-${mm}`);
        setAbierto(false);
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => { setAbierto(!abierto); setAnioVista(anioActual); }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: abierto ? 'rgba(246,114,128,0.12)' : 'rgba(0,0,0,0.35)',
                    border: `1px solid ${abierto ? 'rgba(246,114,128,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
                }}
            >
                <Calendar size={13} color="#f67280" />
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, minWidth: 110 }}>
                    {MESES[mesActual]} {anioActual}
                </span>
                <ChevronDown size={13} color="rgba(255,255,255,0.4)"
                    style={{ transition: 'transform 0.2s', transform: abierto ? 'rotate(180deg)' : 'none' }}
                />
            </button>

            {abierto && (
                <>
                    <div onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                        background: '#1e0b34', border: '1px solid rgba(246,114,128,0.2)',
                        borderRadius: 14, padding: '14px', zIndex: 99,
                        boxShadow: '0 16px 40px rgba(0,0,0,0.6)', width: 240,
                        animation: 'fadeUp 0.15s ease',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <button onClick={() => setAnioVista(a => a - 1)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronLeft size={14} />
                            </button>
                            <span style={{ color: '#f8b195', fontWeight: 800, fontSize: 15 }}>{anioVista}</span>
                            <button onClick={() => setAnioVista(a => a + 1)} disabled={anioVista >= hoyAnio} style={{ background: anioVista >= hoyAnio ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)', border: 'none', color: anioVista >= hoyAnio ? 'rgba(255,255,255,0.2)' : '#fff', borderRadius: 8, width: 28, height: 28, cursor: anioVista >= hoyAnio ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                            {MESES_CORTO.map((m, i) => {
                                const esFuturo = anioVista > hoyAnio || (anioVista === hoyAnio && i > hoyMes);
                                const esSeleccionado = i === mesActual && anioVista === anioActual;
                                return (
                                    <button key={i} onClick={() => !esFuturo && seleccionar(i)} disabled={esFuturo} style={{
                                        background: esSeleccionado ? 'rgba(246,114,128,0.25)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${esSeleccionado ? 'rgba(246,114,128,0.5)' : 'rgba(255,255,255,0.06)'}`,
                                        color: esFuturo ? 'rgba(255,255,255,0.2)' : esSeleccionado ? '#f67280' : '#fff',
                                        borderRadius: 8, padding: '8px 4px', cursor: esFuturo ? 'not-allowed' : 'pointer',
                                        fontWeight: esSeleccionado ? 800 : 600, fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                                    }}>
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={() => { const hoy = new Date(); onChange(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`); setAbierto(false); }} style={{ marginTop: 10, width: '100%', background: 'rgba(248,177,149,0.08)', border: '1px solid rgba(248,177,149,0.2)', color: '#f8b195', borderRadius: 8, padding: '7px', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                            Mes Actual
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Mini Calendario de un empleado ──────────────────────────────────────────

const CalendarioEmpleado = ({ mes, asistencias, diaDescanso }) => {
    const total = diasEnMesTotal(mes);
    const inicio = diaSemanaInicio(mes);
    const [y, m] = mes.split('-').map(Number);
    const hoy = new Date().toISOString().split('T')[0];
    const fechasAsistio = new Set(asistencias.map(a => a.fecha));
    const celdas = [];

    for (let i = 0; i < inicio; i++) celdas.push(<div key={`v${i}`} />);

    for (let d = 1; d <= total; d++) {
        const fecha = fechaDia(mes, d);
        const diaSemana = new Date(y, m - 1, d).getDay();
        const esDescanso = diaDescanso !== null && diaDescanso !== undefined && diaSemana === Number(diaDescanso);
        const asistio = fechasAsistio.has(fecha);
        const esFuturo = fecha > hoy;

        let bg, color, title;

        // ── FIX: la asistencia real tiene prioridad absoluta ──
        // Si hay registro en Supabase → verde, sin importar si la fecha
        // parece "futura" por diferencia de zona horaria.
        if (asistio) {
            bg = 'rgba(74,222,128,0.15)'; color = '#4ade80'; title = 'Asistió';
        } else if (esDescanso && !esFuturo) {
            bg = 'rgba(96,165,250,0.15)'; color = '#60a5fa'; title = 'Descanso';
        } else if (!esFuturo && !esDescanso) {
            bg = 'rgba(248,113,113,0.15)'; color = '#f87171'; title = 'Falta';
        } else {
            bg = 'rgba(255,255,255,0.03)'; color = 'rgba(255,255,255,0.15)'; title = 'Futuro';
        }

        celdas.push(
            <div key={d} title={`${fecha} — ${title}`} style={{ background: bg, color, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, height: 28, border: `1px solid ${esFuturo && !asistio ? 'transparent' : color + '33'}`, cursor: 'default' }}>
                {d}
            </div>
        );
    }

    return (
        <div style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
                {DIAS_SEMANA.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, paddingBottom: 2 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>{celdas}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
                {[{ color: '#4ade80', label: 'Asistió' }, { color: '#f87171', label: 'Falta' }, { color: '#60a5fa', label: 'Descanso' }, { color: 'rgba(255,255,255,0.15)', label: 'Sin datos' }].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{label}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Tarjeta de Empleado (modo mes) ──────────────────────────────────────────

const TarjetaEmpleadoMes = ({ emp, mes, diasLaborables }) => {
    const [expandido, setExpandido] = useState(false);
    const pct = diasLaborables > 0 ? Math.round((emp.diasAsistidos / diasLaborables) * 100) : 0;
    const color = pct >= 85 ? '#4ade80' : pct >= 60 ? '#fbbf24' : '#f87171';
    const faltas = diasLaborables - emp.diasAsistidos;
    const minutosExtra = emp.asistencias.reduce((sum, a) => {
        if (!a.hora_entrada || !a.hora_salida) return sum;
        const [eh, em] = a.hora_entrada.split(':').map(Number);
        const [sh, sm] = a.hora_salida.split(':').map(Number);
        const trabajadas = (sh * 60 + sm) - (eh * 60 + em);
        return sum + Math.max(0, trabajadas - 480);
    }, 0);

    return (
        <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 12, marginBottom: 8, border: `1px solid ${expandido ? color + '33' : 'rgba(255,255,255,0.05)'}`, overflow: 'hidden' }}>
            <div onClick={() => setExpandido(!expandido)} style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', cursor: 'pointer', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}20`, border: `2px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color, flexShrink: 0 }}>
                    {emp.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.nombre}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                        PIN: {emp.pin_tarjeta || 'N/A'} · {faltas > 0 ? `${faltas} falta${faltas !== 1 ? 's' : ''}` : 'Sin faltas'}
                        {minutosExtra > 0 && ` · ${Math.floor(minutosExtra / 60)}h ${minutosExtra % 60}m extra`}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{emp.diasAsistidos}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>/{diasLaborables} días</div>
                    </div>
                    <div style={{ background: `${color}18`, border: `1px solid ${color}44`, color, borderRadius: 20, padding: '4px 11px', fontSize: 12, fontWeight: 800, minWidth: 50, textAlign: 'center' }}>{pct}%</div>
                    <div style={{ color: 'rgba(255,255,255,0.25)', transition: 'transform 0.2s', transform: expandido ? 'rotate(180deg)' : 'none' }}><ChevronDown size={15} /></div>
                </div>
            </div>

            {expandido && (
                <div style={{ padding: '4px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, marginBottom: 6 }}>
                        <StatChip icon={<Clock size={11} />} label="Asistencias" value={emp.diasAsistidos} color="#4ade80" />
                        <StatChip icon={<AlertCircle size={11} />} label="Faltas" value={faltas} color={faltas > 0 ? '#f87171' : 'rgba(255,255,255,0.3)'} />
                        {minutosExtra > 0 && <StatChip icon={<TrendingUp size={11} />} label="Horas extra" value={`${Math.floor(minutosExtra / 60)}h ${minutosExtra % 60}m`} color="#fbbf24" />}
                        {emp.hora_entrada && <StatChip icon={<Clock size={11} />} label="Horario" value={`${emp.hora_entrada?.slice(0,5)} - ${emp.hora_salida?.slice(0,5)}`} color="rgba(255,255,255,0.4)" />}
                    </div>
                    <CalendarioEmpleado mes={mes} asistencias={emp.asistencias} diaDescanso={emp.dia_descanso} />
                    {emp.asistencias.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Historial de entradas</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {emp.asistencias.map((a, i) => {
                                    const [, , d] = a.fecha.split('-');
                                    return (
                                        <div key={i} style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '5px 10px', fontSize: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <span style={{ fontWeight: 800, color: '#4ade80', fontSize: 13 }}>{d}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{a.hora_entrada?.slice(0,5)} → {a.hora_salida?.slice(0,5)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const StatChip = ({ icon, label, value, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '5px 10px', fontSize: 11 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{label}:</span>
        <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
);

// ─── Componente Principal ─────────────────────────────────────────────────────

const ControlAsistencia = () => {
    const navigate = useNavigate();
    const [empleados, setEmpleados] = useState([]);
    const [cargos, setCargos] = useState([]);
    const [asistencias, setAsistencias] = useState([]);
    const [loading, setLoading] = useState(true);

    const [busqueda, setBusqueda] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('dia');

    const idEmpresaLogueada = localStorage.getItem('id_empresa') || 1;

    const hoy = new Date();
    const fechaLocal = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const mesLocal = fechaLocal.substring(0, 7);

    const [filtroDia, setFiltroDia] = useState(fechaLocal);
    const [filtroMes, setFiltroMes] = useState(mesLocal);
    const [cargoAbierto, setCargoAbierto] = useState(null);

    useEffect(() => { fetchDatos(); }, [tipoFiltro, filtroDia, filtroMes]);

    const fetchDatos = async () => {
        setLoading(true);
        try {
            const { data: empData } = await supabase.from('empleados').select('*').eq('id_empresa', idEmpresaLogueada);
            const { data: carData } = await supabase.from('cargos').select('*').eq('id_empresa', idEmpresaLogueada);
            setEmpleados(empData || []);
            setCargos(carData || []);
            let query = supabase.from('registrosasistencia').select('*');
            if (tipoFiltro === 'dia') {
                query = query.eq('fecha', filtroDia);
            } else {
                query = query.gte('fecha', `${filtroMes}-01`).lte('fecha', `${filtroMes}-31`);
            }
            const { data: asisData, error } = await query;
            if (error) throw error;
            setAsistencias(asisData || []);
        } catch (e) {
            console.error('fetchDatos error:', e.message);
        } finally {
            setLoading(false);
        }
    };

    const diasLaborables = calcularDiasLaborables(filtroMes);

    const datosProcesados = cargos.map(cargo => {
        let staff = empleados.filter(e => e.id_cargo === cargo.id_cargo);
        if (busqueda) {
            const q = busqueda.toLowerCase();
            staff = staff.filter(e => e.nombre.toLowerCase().includes(q) || (e.pin_tarjeta && e.pin_tarjeta.toLowerCase().includes(q)));
        }
        const staffConAsistencia = staff.map(emp => {
            const asistenciasEmp = asistencias.filter(a => a.id_empleado === emp.id_empleado).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
            return { ...emp, asistencias: asistenciasEmp, asistioHoy: asistenciasEmp.length > 0, diasAsistidos: asistenciasEmp.length };
        });
        const totalStaff = staffConAsistencia.length;
        let porcentaje = 0;
        if (tipoFiltro === 'dia') {
            const asistieron = staffConAsistencia.filter(e => e.asistioHoy).length;
            porcentaje = totalStaff > 0 ? Math.round((asistieron / totalStaff) * 100) : 0;
        } else {
            const total = staffConAsistencia.reduce((s, e) => s + e.diasAsistidos, 0);
            const max = totalStaff * diasLaborables;
            porcentaje = max > 0 ? Math.round((total / max) * 100) : 0;
        }
        return { ...cargo, staff: staffConAsistencia, totalStaff, porcentaje };
    }).filter(c => c.totalStaff > 0);

    const totalEmpleados = datosProcesados.reduce((s, c) => s + c.totalStaff, 0);
    const totalAsistieron = tipoFiltro === 'dia'
        ? datosProcesados.reduce((s, c) => s + c.staff.filter(e => e.asistioHoy).length, 0)
        : datosProcesados.reduce((s, c) => s + c.staff.reduce((ss, e) => ss + e.diasAsistidos, 0), 0);
    const pctGlobal = tipoFiltro === 'dia'
        ? (totalEmpleados > 0 ? Math.round((totalAsistieron / totalEmpleados) * 100) : 0)
        : (totalEmpleados * diasLaborables > 0 ? Math.round((totalAsistieron / (totalEmpleados * diasLaborables)) * 100) : 0);

    const tituloFecha = () => {
        if (tipoFiltro === 'dia') {
            const [y, m, d] = filtroDia.split('-');
            return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));
        }
        const [y, m] = filtroMes.split('-');
        return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
    };

    const exportarPDF = () => {
        window.print();
    };

    const empleadoParaImprimirMes = (() => {
        if (tipoFiltro !== 'mes') return null;
        for (const cargo of datosProcesados) {
            if (cargo.staff.length > 0) return { emp: cargo.staff[0], cargo };
        }
        return null;
    })();

    const [mesY, mesM] = filtroMes.split('-').map(Number);
    const nombreMesActual = MESES[mesM - 1];

    // ─── Contenido de impresión modo MES ─────────────────────────────────────
    const PrintContenidoMes = () => {
        if (!empleadoParaImprimirMes) return null;
        const { emp, cargo } = empleadoParaImprimirMes;
        const pct = diasLaborables > 0 ? Math.round((emp.diasAsistidos / diasLaborables) * 100) : 0;
        const faltas = diasLaborables - emp.diasAsistidos;
        const minutosExtra = emp.asistencias.reduce((sum, a) => {
            if (!a.hora_entrada || !a.hora_salida) return sum;
            const [eh, em2] = a.hora_entrada.split(':').map(Number);
            const [sh, sm] = a.hora_salida.split(':').map(Number);
            return sum + Math.max(0, (sh * 60 + sm) - (eh * 60 + em2) - 480);
        }, 0);

        const total = diasEnMesTotal(filtroMes);
        const inicio = diaSemanaInicio(filtroMes);
        const hoyStr = new Date().toISOString().split('T')[0];
        const fechasAsistio = new Set(emp.asistencias.map(a => a.fecha));
        const celdas = [];
        for (let i = 0; i < inicio; i++) celdas.push(<td key={`v${i}`} style={{ padding: 4 }} />);
        for (let d = 1; d <= total; d++) {
            const fecha = fechaDia(filtroMes, d);
            const diaSemana = new Date(mesY, mesM - 1, d).getDay();
            const esDescanso = emp.dia_descanso !== null && emp.dia_descanso !== undefined && diaSemana === Number(emp.dia_descanso);
            const asistio = fechasAsistio.has(fecha);
            const esFuturo = fecha > hoyStr;
            let bg = '#eee', color2 = '#999', label = '';

            // ── FIX mismo en versión impresa ──
            if (asistio) {
                bg = '#dcfce7'; color2 = '#16a34a'; label = '✓';
            } else if (esDescanso && !esFuturo) {
                bg = '#dbeafe'; color2 = '#3b82f6'; label = 'D';
            } else if (!esFuturo) {
                bg = '#fee2e2'; color2 = '#dc2626'; label = '✗';
            } else {
                bg = '#f5f5f5'; color2 = '#ccc';
            }

            celdas.push(
                <td key={d} style={{ padding: 3, textAlign: 'center' }}>
                    <div style={{ background: bg, color: color2, borderRadius: 6, width: 32, height: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, margin: 'auto' }}>
                        <span style={{ fontSize: 11 }}>{d}</span>
                        {label && <span style={{ fontSize: 8 }}>{label}</span>}
                    </div>
                </td>
            );
        }
        const allCells = celdas;
        const rows = [];
        for (let i = 0; i < allCells.length; i += 7) rows.push(allCells.slice(i, i + 7));
        while (rows[rows.length - 1]?.length < 7) rows[rows.length - 1].push(<td key={`end${rows[rows.length - 1].length}`} />);

        return (
            <div className="print-only-mes" style={{ display: 'none' }}>
                <div style={{ borderBottom: '3px solid #f67280', paddingBottom: 14, marginBottom: 20 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1a0a2e' }}>Reporte de Asistencia Mensual</div>
                    <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{nombreMesActual} {mesY} · {diasLaborables} días laborables · Generado el {new Date().toLocaleDateString('es-GT')}</div>
                </div>

                <div style={{ display: 'flex', gap: 24, marginBottom: 20, background: '#f8f4ff', borderRadius: 12, padding: 16 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f67280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {emp.nombre.charAt(0)}
                    </div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#1a0a2e' }}>{emp.nombre}</div>
                        <div style={{ fontSize: 13, color: '#555', marginTop: 3 }}>PIN: {emp.pin_tarjeta || 'N/A'} · Cargo: {cargo.nombre_cargo}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                    {[
                        { label: 'Días Asistidos', value: emp.diasAsistidos, color: '#16a34a', bg: '#dcfce7' },
                        { label: 'Faltas', value: faltas, color: '#dc2626', bg: '#fee2e2' },
                        { label: '% Asistencia', value: `${pct}%`, color: pct >= 85 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626', bg: '#f5f5f5' },
                        { label: 'Horas Extra', value: minutosExtra > 0 ? `${Math.floor(minutosExtra / 60)}h ${minutosExtra % 60}m` : '—', color: '#d97706', bg: '#fef3c7' },
                    ].map(k => (
                        <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                            <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{k.label}</div>
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#f67280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Calendario de Asistencia</div>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3 }}>
                        <thead>
                            <tr>{DIAS_SEMANA.map(d => <th key={d} style={{ fontSize: 10, fontWeight: 700, color: '#888', textAlign: 'center', padding: '4px 0' }}>{d}</th>)}</tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => <tr key={i}>{row}</tr>)}
                        </tbody>
                    </table>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                        {[{ color: '#16a34a', bg: '#dcfce7', label: 'Asistió' }, { color: '#dc2626', bg: '#fee2e2', label: 'Falta' }, { color: '#3b82f6', bg: '#dbeafe', label: 'Descanso' }].map(l => (
                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555' }}>
                                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1px solid ${l.color}` }} />{l.label}
                            </div>
                        ))}
                    </div>
                </div>

                {emp.asistencias.length > 0 && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#f67280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Historial de Entradas</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f0e8ff' }}>
                                    {['Fecha', 'Día', 'Hora Entrada', 'Hora Salida', 'Horas Trabajadas'].map(h => (
                                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#f67280' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {emp.asistencias.map((a, i) => {
                                    const [ay, am, ad] = a.fecha.split('-');
                                    const diaNombre = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date(ay, am - 1, ad));
                                    let horasTrab = '—';
                                    if (a.hora_entrada && a.hora_salida) {
                                        const [eh, em2] = a.hora_entrada.split(':').map(Number);
                                        const [sh, sm] = a.hora_salida.split(':').map(Number);
                                        const mins = (sh * 60 + sm) - (eh * 60 + em2);
                                        horasTrab = `${Math.floor(mins / 60)}h ${mins % 60}m`;
                                    }
                                    return (
                                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{ad}/{am}/{ay}</td>
                                            <td style={{ padding: '8px 12px', color: '#555', textTransform: 'capitalize' }}>{diaNombre}</td>
                                            <td style={{ padding: '8px 12px', color: '#16a34a', fontWeight: 700 }}>{a.hora_entrada?.slice(0,5) || '—'}</td>
                                            <td style={{ padding: '8px 12px', color: '#16a34a', fontWeight: 700 }}>{a.hora_salida?.slice(0,5) || '—'}</td>
                                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{horasTrab}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // ─── Contenido de impresión modo DÍA ─────────────────────────────────────
    const PrintContenidoDia = () => {
        const [dY, dM, dD] = filtroDia.split('-');
        const fechaLegible = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dY, dM - 1, dD));
        const totalPres = datosProcesados.reduce((s, c) => s + c.staff.filter(e => e.asistioHoy).length, 0);
        const totalAus = totalEmpleados - totalPres;

        return (
            <div className="print-only-dia" style={{ display: 'none' }}>
                <div style={{ borderBottom: '3px solid #f67280', paddingBottom: 14, marginBottom: 20 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#1a0a2e' }}>Control de Asistencia Diaria</div>
                    <div style={{ fontSize: 13, color: '#555', marginTop: 4, textTransform: 'capitalize' }}>{fechaLegible} · Generado el {new Date().toLocaleDateString('es-GT')}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                    {[
                        { label: 'Total Empleados', value: totalEmpleados, color: '#7c3aed', bg: '#f3e8ff' },
                        { label: 'Presentes', value: totalPres, color: '#16a34a', bg: '#dcfce7' },
                        { label: 'Ausentes', value: totalAus, color: '#dc2626', bg: '#fee2e2' },
                    ].map(k => (
                        <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
                            <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>{k.label}</div>
                        </div>
                    ))}
                </div>

                {datosProcesados.map(cargo => {
                    const presentes = cargo.staff.filter(e => e.asistioHoy).length;
                    const ausentes = cargo.totalStaff - presentes;
                    return (
                        <div key={cargo.id_cargo} style={{ marginBottom: 28 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0e8ff', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                                <div>
                                    <span style={{ fontSize: 15, fontWeight: 800, color: '#f67280' }}>{cargo.nombre_cargo}</span>
                                    <span style={{ fontSize: 12, color: '#888', marginLeft: 10 }}>{cargo.totalStaff} empleado{cargo.totalStaff !== 1 ? 's' : ''}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>✓ {presentes} presentes</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>✗ {ausentes} ausentes</span>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed' }}>{cargo.porcentaje}%</span>
                                </div>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#fafafa' }}>
                                        {['PIN', 'Empleado', 'Hora Entrada', 'Hora Salida', 'Estado'].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#f67280', borderBottom: '2px solid #f0e8ff' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {cargo.staff.map((emp, i) => (
                                        <tr key={emp.id_empleado} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '9px 12px', color: '#888', fontSize: 12 }}>{emp.pin_tarjeta || 'N/A'}</td>
                                            <td style={{ padding: '9px 12px', fontWeight: 700, color: '#1a0a2e' }}>{emp.nombre}</td>
                                            <td style={{ padding: '9px 12px', color: emp.asistioHoy ? '#16a34a' : '#ccc', fontWeight: 700 }}>{emp.asistencias[0]?.hora_entrada?.slice(0,5) || '--:--'}</td>
                                            <td style={{ padding: '9px 12px', color: emp.asistioHoy ? '#16a34a' : '#ccc', fontWeight: 700 }}>{emp.asistencias[0]?.hora_salida?.slice(0,5) || '--:--'}</td>
                                            <td style={{ padding: '9px 12px' }}>
                                                <span style={{ background: emp.asistioHoy ? '#dcfce7' : '#fee2e2', color: emp.asistioHoy ? '#16a34a' : '#dc2626', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                                    {emp.asistioHoy ? '✓ Asistió' : '✗ Ausente'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return (
        <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div style={spinnerStyle} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Cargando registros...</span>
        </div>
    );

    return (
        <div style={containerStyle}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; }
                input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); cursor: pointer; }
                ::-webkit-scrollbar { width: 5px; }
                ::-webkit-scrollbar-thumb { background: rgba(246,114,128,0.25); border-radius: 3px; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
                    .ca-ui { display: none !important; }
                    .print-only-dia, .print-only-mes { display: none; }
                    ${tipoFiltro === 'dia' ? '.print-only-dia { display: block !important; }' : ''}
                    ${tipoFiltro === 'mes' ? '.print-only-mes { display: block !important; }' : ''}
                    .print-wrapper { display: block !important; background: #fff; color: #111; font-family: 'DM Sans', sans-serif; padding: 24px 32px; max-width: 100%; }
                }
            `}</style>

            <div className="print-wrapper" style={{ display: 'none' }}>
                <PrintContenidoDia />
                <PrintContenidoMes />
            </div>

            <div className="ca-ui" style={{ maxWidth: 1060, width: '100%', animation: 'fadeUp 0.4s ease' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 26 }}>
                    <div>
                        <button className="no-print" onClick={() => navigate('/dashboard')} style={backButtonStyle}>
                            <ArrowLeft size={15} /> Volver al Dashboard
                        </button>
                        <h1 style={titleStyle}>Control de Asistencia</h1>
                        <p style={subtitleStyle}>{tituloFecha()}</p>
                    </div>
                    <button onClick={exportarPDF} style={exportBtnStyle} className="no-print">
                        <Printer size={15} />
                        {tipoFiltro === 'dia' ? 'Exportar Reporte Diario' : busqueda ? `Exportar — ${datosProcesados[0]?.staff[0]?.nombre || 'Empleado'}` : 'Exportar PDF'}
                    </button>
                </div>

                {tipoFiltro === 'mes' && !busqueda && (
                    <div className="no-print" style={{ background: 'rgba(248,177,149,0.08)', border: '1px solid rgba(248,177,149,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertCircle size={16} color="#f8b195" />
                        <span style={{ fontSize: 13, color: '#f8b195' }}>
                            <strong>Tip:</strong> En vista mensual, busca un empleado específico para exportar solo su reporte de asistencia mensual.
                        </span>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
                    <StatCard icon={<Users size={18} />} label="Total Empleados" value={totalEmpleados} color="#f8b195" />
                    <StatCard icon={<TrendingUp size={18} />} label={tipoFiltro === 'dia' ? 'Asistieron Hoy' : 'Registros del Mes'} value={totalAsistieron} color="#4ade80" />
                    <StatCard icon={<Calendar size={18} />} label="Asistencia Global" value={`${pctGlobal}%`} color={pctGlobal >= 85 ? '#4ade80' : pctGlobal >= 60 ? '#fbbf24' : '#f87171'} />
                </div>

                <div style={filterBarStyle}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
                            {[{ id: 'dia', label: 'Por Día' }, { id: 'mes', label: 'Por Mes' }].map(({ id, label }) => (
                                <button key={id} onClick={() => setTipoFiltro(id)} style={{ background: tipoFiltro === id ? 'rgba(246,114,128,0.18)' : 'transparent', border: tipoFiltro === id ? '1px solid rgba(246,114,128,0.4)' : '1px solid transparent', color: tipoFiltro === id ? '#f67280' : 'rgba(255,255,255,0.35)', padding: '7px 15px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        {tipoFiltro === 'dia' ? (
                            <div style={inputWrapStyle}>
                                <Calendar size={13} color="#f67280" />
                                <input type="date" style={dateInputStyle} value={filtroDia} onChange={e => setFiltroDia(e.target.value)} />
                            </div>
                        ) : (
                            <SelectorMes filtroMes={filtroMes} onChange={setFiltroMes} />
                        )}
                    </div>
                    <div style={searchWrapStyle}>
                        <Search size={13} color="rgba(255,255,255,0.25)" />
                        <input placeholder={tipoFiltro === 'mes' ? 'Buscar empleado para exportar...' : 'Buscar empleado o PIN...'} style={searchInputStyle} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                    </div>
                </div>

                {datosProcesados.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.15)' }}>
                        <Calendar size={44} color="rgba(255,255,255,0.08)" style={{ marginBottom: 14 }} />
                        <div style={{ fontSize: 15 }}>No hay registros para este período.</div>
                    </div>
                )}

                {datosProcesados.map(cargo => {
                    const abierto = cargoAbierto === cargo.id_cargo;
                    const pctColor = cargo.porcentaje >= 85 ? '#4ade80' : cargo.porcentaje >= 60 ? '#fbbf24' : '#f87171';
                    const presentes = cargo.staff.filter(e => e.asistioHoy).length;
                    const ausentes = cargo.totalStaff - presentes;

                    return (
                        <div key={cargo.id_cargo} style={{ background: '#1b0b30', borderRadius: 16, marginBottom: 12, border: `1px solid ${abierto ? 'rgba(246,114,128,0.25)' : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}>
                            <div onClick={() => setCargoAbierto(abierto ? null : cargo.id_cargo)} style={{ padding: '17px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: abierto ? 'rgba(246,114,128,0.04)' : 'transparent' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                                        <svg width="48" height="48" style={{ transform: 'rotate(-90deg)' }}>
                                            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                                            <circle cx="24" cy="24" r="20" fill="none" stroke={pctColor} strokeWidth="3.5" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - cargo.porcentaje / 100)}`} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                                        </svg>
                                        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 10, fontWeight: 800, color: pctColor }}>{cargo.porcentaje}%</span>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 17, color: '#f8b195' }}>{cargo.nombre_cargo}</div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                                            {cargo.totalStaff} empleado{cargo.totalStaff !== 1 ? 's' : ''}
                                            {tipoFiltro === 'mes' && ` · ${diasLaborables} días laborables`}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    {tipoFiltro === 'dia' && (
                                        <div style={{ display: 'flex', gap: 14 }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80' }}>{presentes}</div>
                                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Presentes</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 18, fontWeight: 800, color: '#f87171' }}>{ausentes}</div>
                                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Ausentes</div>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ color: 'rgba(255,255,255,0.25)', transition: 'transform 0.25s', transform: abierto ? 'rotate(180deg)' : 'none' }}><ChevronDown size={18} /></div>
                                </div>
                            </div>

                            {abierto && (
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    {tipoFiltro === 'dia' ? (
                                        <div style={{ padding: '4px 22px 18px' }}>
                                            <div style={tableHeaderStyle}>
                                                <div style={{ width: '36%' }}>EMPLEADO</div>
                                                <div style={{ width: '18%' }}>ENTRADA</div>
                                                <div style={{ width: '18%' }}>SALIDA</div>
                                                <div style={{ width: '28%', textAlign: 'right' }}>ESTADO</div>
                                            </div>
                                            {cargo.staff.map(emp => (
                                                <div key={emp.id_empleado} style={empRowStyle}>
                                                    <div style={{ width: '36%' }}>
                                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.nombre}</div>
                                                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>PIN: {emp.pin_tarjeta || 'N/A'}</div>
                                                    </div>
                                                    <div style={{ width: '18%', color: emp.asistioHoy ? '#4ade80' : 'rgba(255,255,255,0.2)', fontWeight: 600, fontSize: 14 }}>{emp.asistencias[0]?.hora_entrada?.slice(0, 5) || '--:--'}</div>
                                                    <div style={{ width: '18%', color: emp.asistioHoy ? '#4ade80' : 'rgba(255,255,255,0.2)', fontWeight: 600, fontSize: 14 }}>{emp.asistencias[0]?.hora_salida?.slice(0, 5) || '--:--'}</div>
                                                    <div style={{ width: '28%', textAlign: 'right' }}>
                                                        <span style={{ background: emp.asistioHoy ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)', color: emp.asistioHoy ? '#4ade80' : '#f87171', border: `1px solid ${emp.asistioHoy ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, padding: '4px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                                                            {emp.asistioHoy ? '✓ Asistió' : '✗ Ausente'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '14px 22px 18px' }}>
                                            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                                                {diasLaborables} días laborables · {nombreMesActual} {mesY}
                                            </div>
                                            {cargo.staff.map(emp => (
                                                <TarjetaEmpleadoMes key={emp.id_empleado} emp={emp} mes={filtroMes} diasLaborables={diasLaborables} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, color }) => (
    <div style={{ background: '#1b0b30', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: `${color}15`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
        <div>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{label}</div>
        </div>
    </div>
);

// ─── Estilos base ─────────────────────────────────────────────────────────────

const containerStyle = {
    minHeight: '100vh', background: '#130826',
    backgroundImage: 'radial-gradient(ellipse at 15% 0%, rgba(246,114,128,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 100%, rgba(96,165,250,0.04) 0%, transparent 50%)',
    padding: '3rem 2rem', color: '#fff', display: 'flex', justifyContent: 'center',
    fontFamily: "'DM Sans', sans-serif",
};
const backButtonStyle = {
    background: 'transparent', border: 'none', color: '#f67280', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13,
    marginBottom: 10, padding: 0, fontFamily: "'DM Sans', sans-serif",
};
const titleStyle = { fontSize: 28, color: '#fff', margin: '0 0 4px', fontWeight: 800 };
const subtitleStyle = { fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0, textTransform: 'capitalize' };
const exportBtnStyle = {
    background: 'rgba(246,114,128,0.07)', border: '1px solid rgba(246,114,128,0.25)',
    color: '#f67280', padding: '10px 18px', borderRadius: 12, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13,
    fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
};
const filterBarStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
    background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 14, marginBottom: 20,
    border: '1px solid rgba(255,255,255,0.05)',
};
const inputWrapStyle = {
    display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.07)', padding: '8px 13px', borderRadius: 10,
};
const dateInputStyle = { background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: 13, fontFamily: "'DM Sans', sans-serif" };
const searchWrapStyle = {
    background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, padding: '8px 13px', display: 'flex', alignItems: 'center', gap: 8, width: 280,
};
const searchInputStyle = { background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: 13, fontFamily: "'DM Sans', sans-serif" };
const tableHeaderStyle = {
    display: 'flex', padding: '13px 0 9px', fontSize: 10, fontWeight: 800, color: '#f67280',
    borderBottom: '1px solid rgba(255,255,255,0.05)', letterSpacing: 0.7, textTransform: 'uppercase',
};
const empRowStyle = {
    display: 'flex', alignItems: 'center', padding: '12px 6px',
    borderBottom: '1px solid rgba(255,255,255,0.04)', borderRadius: 8,
};
const spinnerStyle = {
    width: 30, height: 30, border: '3px solid rgba(255,255,255,0.06)',
    borderTop: '3px solid #f67280', borderRadius: '50%', animation: 'spin 0.75s linear infinite',
};

export default ControlAsistencia;