import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Users, AlertCircle, CheckCircle, BarChart3, Briefcase, Loader2 } from 'lucide-react';

const ResumenGeneral = () => {
    const navigate = useNavigate();
    const idEmpresa = localStorage.getItem('id_empresa');

    const [cargando,       setCargando]       = useState(true);
    const [presentes,      setPresentes]      = useState([]);
    const [retardos,       setRetardos]       = useState(0);
    const [totalEsperados, setTotalEsperados] = useState(0);
    const [porCargo,       setPorCargo]       = useState([]);
    const [flujoPorHora,   setFlujoPorHora]   = useState(Array(8).fill(0));
    const [ultimaActual,   setUltimaActual]   = useState('');

    const HORAS_GRAFICA = ['12am','3am','6am','9am','12pm','3pm','6pm','9pm'];
    const HORAS_INICIO  = [0, 3, 6, 9, 12, 15, 18, 21];

    const fetchDatos = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            const hoy = new Date().toISOString().split('T')[0];

            const { data: registros, error: errReg } = await supabase
                .from('registrosasistencia')
                .select(`
                    id_registro, hora_entrada, hora_salida, fecha,
                    empleados (
                        id_empleado, nombre, id_empresa, hora_entrada, hora_salida,
                        dia_descanso,
                        cargos ( nombre_cargo )
                    )
                `)
                .eq('fecha', hoy);

            if (errReg) throw errReg;

            const deEmpresa = (registros || []).filter(r =>
                String(r.empleados?.id_empresa) === String(idEmpresa)
            );

            const ahoraPresentes = deEmpresa.filter(r => r.hora_entrada && !r.hora_salida);
            setPresentes(ahoraPresentes);

            const diaSemanaHoy = new Date().getDay();
            const { data: todosEmpleados, error: errEmp } = await supabase
                .from('empleados')
                .select('id_empleado, hora_entrada, dia_descanso')
                .eq('id_empresa', idEmpresa);

            if (errEmp) throw errEmp;

            const esperados = (todosEmpleados || []).filter(e => e.dia_descanso !== diaSemanaHoy);
            setTotalEsperados(esperados.length);

            const retardosCount = deEmpresa.filter(r => {
                const horaProgStr = r.empleados?.hora_entrada;
                const horaRealStr = r.hora_entrada;
                if (!horaProgStr || !horaRealStr) return false;
                return horaRealStr > horaProgStr;
            }).length;
            setRetardos(retardosCount);

            const mapaCargo = {};
            ahoraPresentes.forEach(r => {
                const cargo = r.empleados?.cargos?.nombre_cargo || 'Sin Cargo';
                if (!mapaCargo[cargo]) mapaCargo[cargo] = 0;
                mapaCargo[cargo]++;
            });
            setPorCargo(
                Object.entries(mapaCargo)
                    .map(([nombre, count]) => ({ nombre, count }))
                    .sort((a, b) => b.count - a.count)
            );

            const conteos = Array(8).fill(0);
            deEmpresa.forEach(r => {
                if (!r.hora_entrada) return;
                const hora = parseInt(r.hora_entrada.split(':')[0]);
                let idx = 7;
                for (let i = 0; i < HORAS_INICIO.length - 1; i++) {
                    if (hora >= HORAS_INICIO[i] && hora < HORAS_INICIO[i + 1]) {
                        idx = i;
                        break;
                    }
                }
                conteos[idx]++;
            });
            setFlujoPorHora(conteos);

            setUltimaActual(new Date().toLocaleTimeString('es-GT', { hour:'2-digit', minute:'2-digit' }));

        } catch (err) {
            console.error('Error ResumenGeneral:', err.message);
        } finally {
            setCargando(false);
        }
    }, [idEmpresa]);

    useEffect(() => {
        fetchDatos();
        const intervalo = setInterval(fetchDatos, 30000);
        return () => clearInterval(intervalo);
    }, [fetchDatos]);

    const totalPresentes = presentes.length;
    const efectividad    = totalEsperados > 0
        ? Math.round((totalPresentes / totalEsperados) * 100)
        : 0;
    const maxFlujo = Math.max(...flujoPorHora, 1);

    const CARGO_COLORS = [
        '#f8b195','#f67280','#2ed573','#70a1ff',
        '#ffa502','#a29bfe','#fd79a8','#00cec9',
    ];

    return (
        <>
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
            *, *::before, *::after { box-sizing: border-box; }
            body { font-family: 'DM Sans', sans-serif; }
            .rg-card { transition: transform .18s, box-shadow .18s; }
            .rg-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(246,114,128,.12); }
            .rg-dot {
                position: relative; width: 10px; height: 10px;
                border-radius: 50%; background: #2ed573; flex-shrink: 0;
            }
            .rg-dot::after {
                content: ''; position: absolute; inset: 0; border-radius: 50%;
                background: #2ed573; animation: rg-pulse 2s ease-out infinite;
            }
            @keyframes rg-pulse {
                0%   { opacity: .7; transform: scale(1); }
                100% { opacity: 0;  transform: scale(2.4); }
            }
        `}</style>

        <div style={S.root}>
            <div style={S.inner}>

                {/* ── Nav ── */}
                <button onClick={() => navigate('/dashboard')} style={S.back}>
                    <ArrowLeft size={18}/> Volver al Dashboard
                </button>

                {/* ── Título ── */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:28 }}>
                    <div>
                        <h1 style={S.title}>
                            Estadísticas <span style={{ color:'#ffffff' }}>En Tiempo Real</span>
                        </h1>
                        <p style={S.sub}>Resumen de actividad del sistema RFID</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <div className="rg-dot"/>
                            <span style={{ fontSize:14, color:'rgba(255,255,255,.4)', fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                                Actualizado {ultimaActual} · cada 30s
                            </span>
                        </div>
                        <button onClick={fetchDatos} style={S.refreshBtn}>↺ Refrescar</button>
                    </div>
                </div>

                {cargando ? (
                    <div style={S.center}>
                        <Loader2 size={36} color="#f8b195"/>
                        <p style={{ color:'rgba(255,255,255,.4)', fontSize:14, fontFamily:"'DM Sans',sans-serif" }}>Cargando datos en tiempo real…</p>
                    </div>
                ) : (<>

                    {/* ══ KPIs ══ */}
                    <div style={S.kpiRow}>
                        <StatCard
                            icon={<Users size={22} color="#f8b195"/>}
                            val={totalPresentes}
                            label="Personal Presente"
                            col="#f8b195"
                            sub={`de ${totalEsperados} esperados`}
                        />
                        <StatCard
                            icon={<AlertCircle size={22} color="#f67280"/>}
                            val={retardos}
                            label="Retardos Hoy"
                            col="#f67280"
                            sub="llegadas tardías"
                        />
                        <StatCard
                            icon={<CheckCircle size={22} color="#2ed573"/>}
                            val={`${efectividad}%`}
                            label="Efectividad"
                            col="#2ed573"
                            sub={`${totalPresentes} / ${totalEsperados} presentes`}
                        />
                    </div>

                    {/* ══ Desglose por cargo ══ */}
                    <div style={S.section}>
                        <div style={S.secHead}>
                            <Briefcase size={16} color="#f8b195"/>
                            <span style={S.secTitle}>Personal Presente por Área</span>
                            <span style={S.badge}>{totalPresentes} total</span>
                        </div>

                        {porCargo.length === 0 ? (
                            <p style={{ color:'rgba(255,255,255,.3)', fontSize:14, textAlign:'center', padding:'20px 0', fontFamily:"'DM Sans',sans-serif" }}>
                                No hay personal presente ahora mismo.
                            </p>
                        ) : (
                            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                                {porCargo.map((c, i) => {
                                    const pct = totalPresentes > 0
                                        ? ((c.count / totalPresentes) * 100).toFixed(0)
                                        : 0;
                                    const col = CARGO_COLORS[i % CARGO_COLORS.length];
                                    return (
                                        <div key={c.nombre}>
                                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                                    <span style={{ width:10, height:10, borderRadius:'50%', background:col, display:'inline-block', flexShrink:0 }}/>
                                                    <span style={{ fontSize:14, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>{c.nombre}</span>
                                                </div>
                                                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                                                    <span style={{ fontSize:18, fontWeight:800, color:col, fontFamily:"'Space Grotesk',sans-serif" }}>{c.count}</span>
                                                    <span style={{ fontSize:10, color:'rgba(255,255,255,.35)', fontWeight:700, textTransform:'uppercase', fontFamily:"'DM Sans',sans-serif" }}>{pct}%</span>
                                                </div>
                                            </div>
                                            <div style={{ height:9, background:'rgba(255,255,255,.06)', borderRadius:99, overflow:'hidden' }}>
                                                <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${col}88,${col})`, borderRadius:99, transition:'width .9s cubic-bezier(.4,0,.2,1)' }}/>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ══ Gráfica flujo 24h ══ */}
                    <div style={S.section}>
                        <div style={{ ...S.secHead, marginBottom:24 }}>
                            <BarChart3 size={16} color="#f8b195"/>
                            <span style={S.secTitle}>Flujo de Accesos — Hoy (24h)</span>
                            <span style={S.badge}>intervalos de 3h</span>
                        </div>

                        <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:160, padding:'0 4px' }}>
                            {flujoPorHora.map((val, i) => {
                                const pct       = (val / maxFlujo) * 100;
                                const horaActual = new Date().getHours();
                                const esActiva  = horaActual >= HORAS_INICIO[i] &&
                                    (i === 7 || horaActual < HORAS_INICIO[i + 1]);
                                return (
                                    <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, height:'100%', justifyContent:'flex-end' }}>
                                        {val > 0 && (
                                            <span style={{ fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif", color: esActiva ? '#f8b195' : 'rgba(255,255,255,.45)' }}>
                                                {val}
                                            </span>
                                        )}
                                        <div style={{
                                            width:'100%',
                                            height: pct > 0 ? `${pct}%` : 4,
                                            minHeight: 4,
                                            background: esActiva
                                                ? 'linear-gradient(to top, #f67280, #f8b195)'
                                                : 'linear-gradient(to top, rgba(248,177,149,.25), rgba(248,177,149,.45))',
                                            borderRadius:'6px 6px 2px 2px',
                                            transition:'height .8s cubic-bezier(.4,0,.2,1)',
                                            boxShadow: esActiva ? '0 0 14px rgba(248,177,149,.35)' : 'none',
                                        }}/>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ display:'flex', gap:10, marginTop:12, padding:'0 4px' }}>
                            {HORAS_GRAFICA.map((h, i) => {
                                const horaActual = new Date().getHours();
                                const esActiva   = horaActual >= HORAS_INICIO[i] &&
                                    (i === 7 || horaActual < HORAS_INICIO[i + 1]);
                                return (
                                    <div key={i} style={{
                                        flex:1, textAlign:'center',
                                        fontSize:11, fontWeight:700,
                                        fontFamily:"'DM Sans',sans-serif",
                                        color: esActiva ? '#f8b195' : 'rgba(255,255,255,.25)',
                                    }}>
                                        {h}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </>)}
            </div>
        </div>
        </>
    );
};

/* ── Stat Card ── */
const StatCard = ({ icon, val, label, col, sub }) => (
    <div className="rg-card" style={{
        background:'rgba(255,255,255,.03)',
        border:'1px solid rgba(255,255,255,.08)',
        borderRadius:20, padding:'22px 24px',
    }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:`${col}18`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {icon}
            </div>
            {/* Label: igual a labelStyle de RegistrarEmpleado — 10px, uppercase, fontWeight 700 */}
            <span style={{ fontSize:10, color:'rgba(255,255,255,.5)', fontWeight:700,
                textTransform:'uppercase', letterSpacing:.9, lineHeight:1.3,
                fontFamily:"'DM Sans',sans-serif" }}>
                {label}
            </span>
        </div>
        {/* Valor grande: Space Grotesk igual a titleStyle */}
        <div style={{ fontSize:32, fontWeight:800, color:col,
            fontFamily:"'Space Grotesk',sans-serif", lineHeight:1 }}>
            {val}
        </div>
        {/* Sub: igual a subtitleStyle — 14px, opacity 0.4 */}
        <div style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginTop:6,
            fontFamily:"'DM Sans',sans-serif" }}>{sub}</div>
    </div>
);

/* ── Estilos globales ── */
const S = {
    root:       { minHeight:'100vh', background:'#1a0a2e', padding:'3rem 2rem', color:'#fff', fontFamily:"'DM Sans',sans-serif", display:'flex', justifyContent:'center' },
    inner:      { maxWidth:960, width:'100%' },
    // backButtonStyle de RegistrarEmpleado: transparent, color #f67280, fontWeight 600
    back:       { background:'transparent', border:'none', color:'#f67280', display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:25, fontWeight:600, fontFamily:"'DM Sans',sans-serif" },
    // titleStyle de RegistrarEmpleado: Space Grotesk, 32px, color #f8b195
    title:      { fontSize:32, color:'#f8b195', margin:0, fontWeight:800, fontFamily:"'Space Grotesk',sans-serif", lineHeight:1.15 },
    // subtitleStyle: 14px, rgba(255,255,255,0.4)
    sub:        { color:'rgba(255,255,255,.4)', fontSize:14, marginTop:5, fontFamily:"'DM Sans',sans-serif" },
    kpiRow:     { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 },
    section:    { background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:20, padding:'22px 24px', marginBottom:18 },
    secHead:    { display:'flex', alignItems:'center', gap:10, marginBottom:20 },
    // sectionTitleStyle de RegistrarEmpleado: 12px, uppercase, fontWeight 700, color #f8b195
    secTitle:   { fontSize:12, fontWeight:700, color:'#f8b195', fontFamily:"'DM Sans',sans-serif", textTransform:'uppercase', letterSpacing:.8, flex:1 },
    // badge mantiene su tamaño pequeño (11px es coherente con labelStyle)
    badge:      { fontSize:11, background:'rgba(248,177,149,.12)', color:'#f8b195', padding:'3px 12px', borderRadius:20, fontWeight:700, fontFamily:"'DM Sans',sans-serif" },
    refreshBtn: { background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.55)', borderRadius:8, padding:'7px 16px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" },
    center:     { textAlign:'center', padding:'80px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:14 },
};

export default ResumenGeneral;