import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
    ArrowLeft, Search, Loader2, AlertCircle,
    DollarSign, TrendingUp, Printer, ChevronDown, Users, Clock
} from 'lucide-react';

const CARGO_COLORS = [
    '#f67280','#f8b195','#2ed573','#70a1ff',
    '#ffa502','#eccc68','#a29bfe','#fd79a8','#00cec9','#e17055',
];

const MESES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const timeToMinutos = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

const calcularHorasExtra = (asistencia, empHoraSalida) => {
    const salidaReal     = timeToMinutos(asistencia.hora_salida);
    const salidaContrato = timeToMinutos(empHoraSalida);
    if (salidaReal === null || salidaContrato === null) return 0;
    const desfase = salidaReal - salidaContrato;
    if (desfase <= 20) return 0;
    const horasCompletas   = Math.floor(desfase / 60);
    const minutosRestantes = desfase % 60;
    return horasCompletas + (minutosRestantes >= 30 ? 1 : 0);
};

const HistorialPagos = () => {
    const navigate  = useNavigate();
    const idEmpresa = localStorage.getItem('id_empresa');

    const [pagos,    setPagos]    = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [mesIdx,   setMesIdx]   = useState(new Date().getMonth());
    const [anio,     setAnio]     = useState(new Date().getFullYear());
    const [mesOpen,  setMesOpen]  = useState(false);
    const [anioOpen, setAnioOpen] = useState(false);

    useEffect(() => {
        if (!idEmpresa) { navigate('/'); return; }
        fetchHistorial();
    }, [mesIdx, anio]);

    const fetchHistorial = async () => {
        setCargando(true);
        try {
            const pad     = n => String(n).padStart(2,'0');
            const inicio  = `${anio}-${pad(mesIdx+1)}-01`;
            const lastDay = new Date(anio, mesIdx+1, 0).getDate();
            const finStr  = `${anio}-${pad(mesIdx+1)}-${pad(lastDay)}`;

            const { data, error } = await supabase
                .from('pagostotales')
                .select(`
                    id_pago_total, fecha_inicio, fecha_fin, total_pago,
                    empleados (
                        id_empleado, nombre, pin_tarjeta, sueldo_base,
                        pago_hora_extra, hora_salida, id_empresa,
                        cargos ( nombre_cargo )
                    )
                `)
                .gte('fecha_fin', inicio)
                .lte('fecha_fin', finStr);

            if (error) throw error;

            const filtrados = (data || []).filter(p =>
                p.empleados && String(p.empleados.id_empresa) === String(idEmpresa)
            );

            if (filtrados.length === 0) { setPagos([]); return; }

            const idsEmpleados = filtrados.map(p => p.empleados.id_empleado);

            const { data: asistencias, error: errAsis } = await supabase
                .from('registrosasistencia')
                .select('id_empleado, fecha, hora_salida')
                .in('id_empleado', idsEmpleados)
                .gte('fecha', inicio)
                .lte('fecha', finStr);

            if (errAsis) throw errAsis;

            const asisMap = {};
            (asistencias || []).forEach(a => {
                if (!asisMap[a.id_empleado]) asisMap[a.id_empleado] = [];
                asisMap[a.id_empleado].push(a);
            });

            const pagosConExtras = filtrados.map(p => {
                const emp     = p.empleados;
                const asisEmp = (asisMap[emp.id_empleado] || []).filter(
                    a => a.fecha >= p.fecha_inicio && a.fecha <= p.fecha_fin
                );
                let totalHorasExtra = 0;
                asisEmp.forEach(a => {
                    totalHorasExtra += calcularHorasExtra(a, emp.hora_salida);
                });
                const montoHorasExtra = Math.round(totalHorasExtra * (emp.pago_hora_extra || 0) * 100) / 100;
                return { ...p, _horasExtra: totalHorasExtra, _montoHorasExtra: montoHorasExtra };
            });

            setPagos(pagosConExtras);
        } catch (err) {
            console.error(err.message);
        } finally {
            setCargando(false);
        }
    };

    const pagosFiltrados = pagos.filter(p =>
        p.empleados?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.empleados?.pin_tarjeta?.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.empleados?.cargos?.nombre_cargo||'').toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalEfectivoPagado = pagosFiltrados.reduce((s,p) => s + (p.total_pago||0), 0);
    const empleadosUnicos     = new Set(pagosFiltrados.map(p => p.empleados?.id_empleado)).size;
    const totalHorasExtra     = pagosFiltrados.reduce((s,p) => s + (p._horasExtra||0), 0);
    const totalMontoExtra     = pagosFiltrados.reduce((s,p) => s + (p._montoHorasExtra||0), 0);
    const totalEfectivoBase   = pagosFiltrados.reduce((s,p) => s + (p.total_pago||0) - (p._montoHorasExtra||0), 0);

    const porcargo = {};
    pagosFiltrados.forEach(p => {
        const c = p.empleados?.cargos?.nombre_cargo || 'Sin cargo';
        if (!porcargo[c]) porcargo[c] = { total:0, count:0 };
        porcargo[c].total += p.total_pago||0;
        porcargo[c].count += 1;
    });
    const cargosArr = Object.entries(porcargo)
        .map(([nombre,d],i) => ({
            nombre, total:d.total, count:d.count,
            pct: totalEfectivoPagado>0 ? ((d.total/totalEfectivoPagado)*100).toFixed(1) : 0,
            color: CARGO_COLORS[i % CARGO_COLORS.length],
        }))
        .sort((a,b) => b.total - a.total);

    const pctExtras = totalEfectivoPagado>0 ? ((totalMontoExtra/totalEfectivoPagado)*100).toFixed(1) : 0;
    const pctBase   = totalEfectivoPagado>0 ? (100 - parseFloat(pctExtras)).toFixed(1) : 100;

    const handlePrint = () => window.print();

    const fmt = f => {
        if (!f) return '—';
        return new Date(f+'T12:00:00').toLocaleDateString('es-GT',{day:'2-digit',month:'short',year:'numeric'});
    };

    return (
        <>
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
            *, *::before, *::after { box-sizing:border-box; }
            body { font-family: 'DM Sans', sans-serif; }
            .hp-hover { transition:transform .18s,box-shadow .18s; }
            .hp-hover:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(246,114,128,.12); }
            .hp-bar { transition:width .9s cubic-bezier(.4,0,.2,1); }
            .hp-tr:hover td { background:rgba(248,177,149,.04) !important; }
            .hp-dd { position:relative; display:inline-block; }
            .hp-dd-menu {
                position:absolute; top:calc(100% + 6px); left:0; z-index:99;
                background:#220d38; border:1px solid rgba(255,255,255,.1);
                border-radius:12px; min-width:140px; overflow:hidden;
                box-shadow:0 12px 40px rgba(0,0,0,.5);
            }
            .hp-dd-item { padding:11px 18px; font-size:14px; cursor:pointer; color:#fff; transition:background .12s; font-family:'DM Sans',sans-serif; }
            .hp-dd-item:hover { background:rgba(248,177,149,.12); color:#f8b195; }
            .hp-dd-item.sel { color:#f8b195; font-weight:700; }
            @media print {
                .no-print { display:none !important; }
                body { background:#fff !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
                .hp-root { background:#fff !important; color:#111 !important; padding:16px !important; }
                .hp-card { background:#f4f4f4 !important; border:1px solid #ddd !important; }
                .hp-section { background:#f8f8f8 !important; border:1px solid #ddd !important; }
                .hp-th { color:#555 !important; }
                .hp-td { color:#111 !important; }

                [style*="color:#fff"],
                [style*="color: #fff"],
                [style*="color:'#fff'"],
                [style*="rgba(255,255,255"] {
                    color:#111 !important;
                }

                .hp-print-header { display:block !important; }
            }
            .hp-print-header { display:none; }
        `}</style>

        <div className="hp-root" style={S.root}>
          <div style={S.inner}>

            <div className="hp-print-header" style={{ marginBottom:16, borderBottom:'2px solid #f8b195', paddingBottom:12 }}>
                <div style={{ fontSize:22, fontWeight:800, fontFamily:"'Space Grotesk',sans-serif" }}>
                    Historial de Pagos — {MESES[mesIdx]} {anio}
                </div>
                <div style={{ fontSize:13, color:'#555', fontFamily:"'DM Sans',sans-serif" }}>
                    Reporte generado el {new Date().toLocaleDateString('es-GT')}
                </div>
            </div>

            <button className="no-print" onClick={() => navigate('/gestion-nomina')} style={S.back}>
                <ArrowLeft size={18}/> Volver a Nómina
            </button>

            <div style={S.pageHead}>
                <div>
                    <h1 style={S.title}>Historial de <span style={{color:'#ffffff'}}>Pagos</span></h1>
                    <p style={S.sub}>Reporte financiero detallado · {MESES[mesIdx]} {anio}</p>
                </div>
                <div className="no-print" style={S.controls}>
                    <div className="hp-dd">
                        <button style={S.dropBtn} onClick={()=>{setMesOpen(p=>!p);setAnioOpen(false);}}>
                            {MESES[mesIdx]} <ChevronDown size={14}/>
                        </button>
                        {mesOpen && (
                            <div className="hp-dd-menu">
                                {MESES.map((m,i)=>(
                                    <div key={m} className={`hp-dd-item${i===mesIdx?' sel':''}`}
                                        onClick={()=>{setMesIdx(i);setMesOpen(false);}}>
                                        {m}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="hp-dd">
                        <button style={S.dropBtn} onClick={()=>{setAnioOpen(p=>!p);setMesOpen(false);}}>
                            {anio} <ChevronDown size={14}/>
                        </button>
                        {anioOpen && (
                            <div className="hp-dd-menu">
                                {[anio-2,anio-1,anio,anio+1].map(y=>(
                                    <div key={y} className={`hp-dd-item${y===anio?' sel':''}`}
                                        onClick={()=>{setAnio(y);setAnioOpen(false);}}>
                                        {y}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{position:'relative'}}>
                        <Search size={15} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.3)'}}/>
                        <input style={S.search} placeholder="Buscar…"
                            value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
                    </div>
                    <button style={S.printBtn} onClick={handlePrint}>
                        <Printer size={16}/> Exportar PDF
                    </button>
                </div>
            </div>

            {cargando ? (
                <div style={S.center}>
                    <Loader2 size={36} color="#f8b195"/>
                    <p style={{color:'rgba(255,255,255,.4)',fontSize:14}}>Cargando…</p>
                </div>
            ) : (<>

                <div style={S.kpiRow}>
                    <KPI icon={<DollarSign size={22} color="#f8b195"/>} label="Total Efectivo Pagado"
                        value={`Q${totalEfectivoPagado.toLocaleString()}`}
                        sub={`${pagosFiltrados.length} registros`} col="#f8b195"/>
                    <KPI icon={<Users size={22} color="#f67280"/>} label="Empleados Pagados"
                        value={empleadosUnicos}
                        sub={`${cargosArr.length} cargo${cargosArr.length!==1?'s':''}`} col="#f67280"/>
                    <KPI icon={<Clock size={22} color="#2ed573"/>} label="Total Horas Extra"
                        value={`${totalHorasExtra}h`}
                        sub={`Q${totalMontoExtra.toFixed(2)} en extras`} col="#2ed573"/>
                    <KPI icon={<TrendingUp size={22} color="#70a1ff"/>} label="Total Efectivo Base"
                        value={`Q${totalEfectivoBase.toLocaleString()}`}
                        sub={`${pctBase}% del total`} col="#70a1ff"/>
                </div>

                {cargosArr.length > 0 && (
                <div className="hp-section" style={{...S.section, marginBottom:20}}>
                    <h2 style={S.secTitle}>Distribución por Cargo</h2>
                    <div style={{display:'flex',gap:32,flexWrap:'wrap',alignItems:'flex-start'}}>
                        <div style={{flex:2,minWidth:280}}>
                            {cargosArr.map(c=>(
                                <div key={c.nombre} style={{marginBottom:18}}>
                                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                                        <div style={{display:'flex',alignItems:'center',gap:9}}>
                                            <span style={{width:10,height:10,borderRadius:'50%',background:c.color,display:'inline-block'}}/>
                                            <span style={{fontSize:14,fontWeight:700}}>{c.nombre}</span>
                                            <span style={{fontSize:10,color:'rgba(255,255,255,.4)',fontWeight:700,textTransform:'uppercase'}}>({c.count} emp.)</span>
                                        </div>
                                        <div>
                                            <span style={{fontSize:15,fontWeight:800,color:c.color}}>Q{c.total.toLocaleString()}</span>
                                            <span style={{fontSize:10,color:'rgba(255,255,255,.4)',marginLeft:7,fontWeight:700,textTransform:'uppercase'}}>{c.pct}%</span>
                                        </div>
                                    </div>
                                    <div style={{height:10,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden'}}>
                                        <div className="hp-bar" style={{height:'100%',width:`${c.pct}%`,background:`linear-gradient(90deg,${c.color}88,${c.color})`,borderRadius:99}}/>
                                    </div>
                                </div>
                            ))}
                            <div style={{display:'flex',gap:20,marginTop:20,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.07)',flexWrap:'wrap'}}>
                                <div style={{flex:1,minWidth:180}}>
                                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                                        <span style={{fontSize:14,fontWeight:700}}>💼 Sueldo Base</span>
                                        <span style={{fontSize:14,color:'#70a1ff',fontWeight:800}}>Q{totalEfectivoBase.toLocaleString()} · {pctBase}%</span>
                                    </div>
                                    <div style={{height:9,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden'}}>
                                        <div className="hp-bar" style={{height:'100%',width:`${pctBase}%`,background:'linear-gradient(90deg,#70a1ff66,#70a1ff)',borderRadius:99}}/>
                                    </div>
                                </div>
                                <div style={{flex:1,minWidth:180}}>
                                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                                        <span style={{fontSize:14,fontWeight:700}}>⏱ Horas Extra</span>
                                        <span style={{fontSize:14,color:'#2ed573',fontWeight:800}}>Q{totalMontoExtra.toLocaleString()} · {pctExtras}%</span>
                                    </div>
                                    <div style={{height:9,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden'}}>
                                        <div className="hp-bar" style={{height:'100%',width:`${pctExtras}%`,background:'linear-gradient(90deg,#2ed57366,#2ed573)',borderRadius:99}}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minWidth:170}}>
                            <Donut segments={cargosArr} total={totalEfectivoPagado}/>
                            <div style={{marginTop:10,display:'flex',flexWrap:'wrap',gap:'5px 12px',justifyContent:'center'}}>
                                {cargosArr.map(c=>(
                                    <span key={c.nombre} style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'rgba(255,255,255,.5)',fontWeight:700,textTransform:'uppercase'}}>
                                        <span style={{width:8,height:8,borderRadius:'50%',background:c.color,display:'inline-block'}}/>
                                        {c.nombre}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                )}

                <div className="hp-section" style={S.section}>
                    <h2 style={S.secTitle}>Registros Detallados</h2>
                    {pagosFiltrados.length===0 ? (
                        <div style={S.center}>
                            <AlertCircle size={40} color="rgba(255,255,255,.15)"/>
                            <p style={{color:'rgba(255,255,255,.35)',fontSize:14}}>Sin registros para este periodo.</p>
                        </div>
                    ) : (
                    <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                            <thead>
                                <tr>
                                    {['Empleado','Cargo','Periodo','Sueldo Base','Extras','Total Pagado'].map(h=>(
                                        <th key={h} className="hp-th" style={S.th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pagosFiltrados.map(p => {
                                    const montoExtra = p._montoHorasExtra || 0;
                                    const horasExtra = p._horasExtra || 0;
                                    const base       = (p.total_pago || 0) - montoExtra;
                                    const ci         = cargosArr.findIndex(c=>c.nombre===(p.empleados?.cargos?.nombre_cargo||'Sin cargo'));
                                    const col        = CARGO_COLORS[ci >= 0 ? ci % CARGO_COLORS.length : 0];
                                    return (
                                        <tr key={p.id_pago_total} className="hp-tr">
                                            <td className="hp-td" style={S.td}>
                                                <div style={{display:'flex',alignItems:'center',gap:12}}>
                                                    <div style={{...S.av,background:`linear-gradient(135deg,${col}77,${col})`}}>
                                                        {p.empleados?.nombre?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div style={{fontWeight:700,fontSize:14}}>{p.empleados?.nombre}</div>
                                                        <div style={{fontSize:10,color:'rgba(255,255,255,.4)',fontWeight:700,textTransform:'uppercase'}}>PIN: {p.empleados?.pin_tarjeta}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hp-td" style={S.td}>
                                                <span style={{fontSize:12,padding:'4px 12px',borderRadius:20,fontWeight:700,background:`${col}22`,color:col}}>
                                                    {p.empleados?.cargos?.nombre_cargo||'Sin cargo'}
                                                </span>
                                            </td>
                                            <td className="hp-td" style={{...S.td,fontSize:14,color:'rgba(255,255,255,.5)'}}>
                                                {fmt(p.fecha_inicio)} → {fmt(p.fecha_fin)}
                                            </td>
                                            <td className="hp-td" style={{...S.td,color:'#70a1ff',fontWeight:800,fontSize:14}}>
                                                Q{base.toLocaleString()}
                                            </td>
                                            <td className="hp-td" style={{...S.td,color:montoExtra>0?'#2ed573':'rgba(255,255,255,.25)',fontWeight:800,fontSize:14}}>
                                                {montoExtra>0 ? `${horasExtra}h · +Q${montoExtra.toFixed(2)}` : '—'}
                                            </td>
                                            <td className="hp-td" style={{...S.td,color:'#f8b195',fontWeight:800,fontSize:14}}>
                                                Q{(p.total_pago||0).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{borderTop:'2px solid rgba(255,255,255,.1)'}}>
                                    <td colSpan={3} style={{...S.td,fontWeight:700,fontSize:10,color:'rgba(255,255,255,.5)',paddingTop:16,textTransform:'uppercase',letterSpacing:.9}}>
                                        TOTALES — {MESES[mesIdx].toUpperCase()} {anio}
                                    </td>
                                    <td style={{...S.td,color:'#70a1ff',fontWeight:800,fontSize:14,paddingTop:16}}>Q{totalEfectivoBase.toLocaleString()}</td>
                                    <td style={{...S.td,color:'#2ed573',fontWeight:800,fontSize:14,paddingTop:16}}>
                                        {totalMontoExtra>0 ? `${totalHorasExtra}h · +Q${totalMontoExtra.toFixed(2)}` : '—'}
                                    </td>
                                    <td style={{...S.td,color:'#f8b195',fontWeight:800,fontSize:32,paddingTop:16}}>Q{totalEfectivoPagado.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    )}
                </div>
            </>)}
          </div>
        </div>
        </>
    );
};

const KPI = ({icon,label,value,sub,col}) => (
    <div className="hp-hover hp-card" style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:20,padding:'22px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
            <div style={{width:42,height:42,borderRadius:12,background:`${col}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>{icon}</div>
            <span style={{fontSize:10,color:'rgba(255,255,255,.5)',fontWeight:700,textTransform:'uppercase',letterSpacing:.9}}>{label}</span>
        </div>
        <div style={{fontSize:32,fontWeight:800,color:col,lineHeight:1}}>{value}</div>
        <div style={{fontSize:14,color:'rgba(255,255,255,.4)',marginTop:6}}>{sub}</div>
    </div>
);

const Donut = ({segments, total}) => {
    const R=58, sw=16, circ=2*Math.PI*R;
    let off=0;
    const arcs = segments.map(s=>{
        const len=(s.pct/100)*circ;
        const a={off,len,color:s.color};
        off+=len; return a;
    });
    return (
        <svg width={155} height={155} viewBox="0 0 155 155">
            <circle cx={77.5} cy={77.5} r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={sw}/>
            {arcs.map((a,i)=>(
                <circle key={i} cx={77.5} cy={77.5} r={R} fill="none"
                    stroke={a.color} strokeWidth={sw}
                    strokeDasharray={`${a.len} ${circ-a.len}`}
                    strokeDashoffset={-a.off+circ*.25}
                    style={{transform:'rotate(-90deg)',transformOrigin:'center'}}/>
            ))}
            <text x={77.5} y={72} textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize={10} fontFamily="DM Sans" fontWeight={700}>TOTAL</text>
            <text x={77.5} y={90} textAnchor="middle" fill="#f8b195" fontSize={15} fontWeight={800} fontFamily="Space Grotesk">
                Q{total>=1000?(total/1000).toFixed(1)+'k':total}
            </text>
        </svg>
    );
};

const S = {
    root:     { minHeight:'100vh', background:'#1a0a2e', padding:'3rem 2rem', color:'#fff', fontFamily:"'DM Sans',sans-serif", display:'flex', justifyContent:'center' },
    inner:    { maxWidth:1100, width:'100%' },
    back:     { background:'transparent', border:'none', color:'#f67280', display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:25, fontWeight:600 },
    pageHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:22 },
    title:    { fontSize:32, color:'#f8b195', margin:0, fontWeight:800, fontFamily:"'Space Grotesk',sans-serif" },
    sub:      { color:'rgba(255,255,255,.4)', fontSize:14, marginTop:5 },
    controls: { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' },
    dropBtn:  { background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', color:'#fff', borderRadius:10, padding:'10px 16px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7 },
    search:   { background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'10px 12px 10px 36px', color:'#fff', outline:'none', fontSize:14, width:200 },
    printBtn: { background:'rgba(246,114,128,.15)', border:'1px solid #f67280', color:'#f67280', borderRadius:10, padding:'10px 18px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8 },
    kpiRow:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 },
    section:  { background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:20, padding:'24px 26px' },
    secTitle: { fontSize:12, fontWeight:700, color:'#f8b195', margin:'0 0 20px 0', textTransform:'uppercase', letterSpacing:.8 },
    th:       { padding:'12px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:'#f8b195', textTransform:'uppercase', letterSpacing:.7, borderBottom:'1px solid rgba(255,255,255,.08)', whiteSpace:'nowrap' },
    td:       { padding:'15px 16px', verticalAlign:'middle', borderBottom:'1px solid rgba(255,255,255,.04)' },
    av:       { width:38, height:38, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#1a0a2e', fontWeight:800, fontSize:16, flexShrink:0 },
    center:   { textAlign:'center', padding:'60px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:14 },
};

export default HistorialPagos;