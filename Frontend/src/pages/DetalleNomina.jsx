import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Search, CheckCircle, Loader2, AlertCircle, Briefcase, X, Clock, Calendar } from 'lucide-react';

const DetalleNomina = () => {
    const { fecha } = useParams();
    const navigate  = useNavigate();
    const [empleadosPorCargo, setEmpleadosPorCargo] = useState({});
    const [busqueda,  setBusqueda]  = useState('');
    const [cargando,  setCargando]  = useState(true);
    const [pagados,   setPagados]   = useState(new Set());
    const [modal,     setModal]     = useState(null);

    const idEmpresaLogueada = localStorage.getItem('id_empresa');

    useEffect(() => {
        if (!fecha) { navigate('/gestion-nomina'); return; }
        if (idEmpresaLogueada) fetchDatosGlobales();
    }, [fecha, idEmpresaLogueada]);

    const fetchDatosGlobales = async () => {
        setCargando(true);
        try {
            const partes     = fecha.split('-');
            const anio       = parseInt(partes[0]);
            const mes        = parseInt(partes[1]);
            const diaCorte   = parseInt(partes[2]);
            const ultimoDia  = new Date(anio, mes, 0).getDate();
            const esFinDeMes = diaCorte === ultimoDia;
            const mesStr     = String(mes).padStart(2, '0');

            const fechaInicioMes = `${anio}-${mesStr}-01`;
            const fechaInicioQ2  = `${anio}-${mesStr}-16`;
            const fechaFin       = fecha;

            // 1. Empleados ya pagados en esta fecha
            const { data: pagosData, error: errorPagos } = await supabase
                .from('pagostotales')
                .select('id_empleado')
                .eq('fecha_fin', fecha);
            if (errorPagos) throw errorPagos;
            const idsPagados = new Set(pagosData.map(p => p.id_empleado));
            setPagados(idsPagados);

            // 2. Empleados de la empresa
            const { data: empData, error: empError } = await supabase
                .from('empleados')
                .select(`
                    id_empleado, nombre, pin_tarjeta, sueldo_base, tipo_pago,
                    id_cargo, hora_entrada, hora_salida, dia_descanso, pago_hora_extra,
                    cargos ( nombre_cargo )
                `)
                .eq('id_empresa', idEmpresaLogueada);
            if (empError) throw empError;

            const idsEmpleados = empData.map(e => e.id_empleado);

            // 3. Asistencias del mes completo (abarca tanto quincenales como mensuales)
            const { data: asistencias, error: errAsis } = await supabase
                .from('registrosasistencia')
                .select('id_empleado, fecha')
                .in('id_empleado', idsEmpleados)
                .gte('fecha', fechaInicioMes)
                .lte('fecha', fechaFin);
            if (errAsis) throw errAsis;

            // 4. Horas extra del mes completo
            const { data: pagDiarios, error: errPD } = await supabase
                .from('pagosdiarios')
                .select('id_empleado, fecha, horas_extra')
                .in('id_empleado', idsEmpleados)
                .gte('fecha', fechaInicioMes)
                .lte('fecha', fechaFin);
            if (errPD) throw errPD;

            // Mapa de asistencias: id_empleado -> Set<fecha>
            const asisMap = {};
            asistencias.forEach(a => {
                if (!asisMap[a.id_empleado]) asisMap[a.id_empleado] = new Set();
                asisMap[a.id_empleado].add(a.fecha);
            });

            // Filtrar empleados que corresponde pagar hoy
            const filtrados = empData
                .filter(emp => {
                    const modo = emp.tipo_pago?.trim().toLowerCase();
                    const debeCobrar = diaCorte === 15
                        ? modo === 'quincenal'
                        : esFinDeMes
                            ? modo === 'mensual' || modo === 'quincenal'
                            : false;
                    return debeCobrar && !idsPagados.has(emp.id_empleado);
                })
                .map(emp => {
                    const modo      = emp.tipo_pago?.trim().toLowerCase();
                    const esMensual = modo === 'mensual';

                    /*
                     * REGLAS DE PERÍODO Y SUELDO BASE:
                     *
                     * Mensual (fin de mes)  → del 1 al último día del mes
                     *                         diasBase = días del mes, sueldo completo
                     *
                     * Quincenal día 15      → del 1 al 15
                     *                         diasBase = 15
                     *
                     * Quincenal fin de mes  → del 16 al último
                     *                         diasBase = últimoDia - 15
                     */
                    const periodoInicio = esMensual
                        ? fechaInicioMes
                        : diaCorte === 15
                            ? fechaInicioMes
                            : fechaInicioQ2;

                    // Quincenales SIEMPRE dividen entre 15 (ambas quincenas)
                    // Mensuales dividen entre los días reales del mes
                    const diasBase = esMensual ? ultimoDia : 15;

                    const pagoDiario = emp.sueldo_base / diasBase;

                    // Generar lista de fechas del período de este empleado
                    const diasDelPeriodo = [];
                    const dInicio = new Date(periodoInicio + 'T00:00:00');
                    const dFin    = new Date(fechaFin      + 'T00:00:00');
                    for (let d = new Date(dInicio); d <= dFin; d.setDate(d.getDate() + 1)) {
                        diasDelPeriodo.push(new Date(d).toISOString().split('T')[0]);
                    }

                    const asistiosDias        = asisMap[emp.id_empleado] || new Set();
                    const trabajoAlMenosUnDia = asistiosDias.size > 0;

                    /*
                     * DÍAS CONTADOS:
                     * - Asistió ese día                              → cuenta
                     * - Es su día de descanso Y trabajó ≥ 1 día     → cuenta (día pagado)
                     * - No tiene ninguna asistencia en el período    → todo 0, Q0.00
                     */
                    let diasContados = 0;
                    diasDelPeriodo.forEach(diaStr => {
                        const jsDay      = new Date(diaStr + 'T00:00:00').getDay();
                        const bdDay      = jsDay === 0 ? 7 : jsDay; // 1=lun … 7=dom
                        const esDescanso = bdDay === parseInt(emp.dia_descanso);

                        if (asistiosDias.has(diaStr)) {
                            diasContados++;
                        } else if (esDescanso && trabajoAlMenosUnDia) {
                            diasContados++;
                        }
                    });

                    // Horas extra filtradas al período de este empleado
                    const horasExtraPeriodo = pagDiarios
                        .filter(p =>
                            p.id_empleado === emp.id_empleado &&
                            p.fecha >= periodoInicio &&
                            p.fecha <= fechaFin
                        )
                        .reduce((sum, p) => sum + (p.horas_extra || 0), 0);

                    const montoHorasExtra = horasExtraPeriodo * (emp.pago_hora_extra || 0);
                    const totalCalculado  = (diasContados * pagoDiario) + montoHorasExtra;

                    return {
                        ...emp,
                        diasBase,
                        diasPeriodo:     diasDelPeriodo.length,
                        diasContados,
                        totalHorasExtra: horasExtraPeriodo,
                        montoHorasExtra: Math.round(montoHorasExtra * 100) / 100,
                        totalCalculado:  Math.round(totalCalculado  * 100) / 100,
                        pagoDiario:      Math.round(pagoDiario      * 100) / 100,
                    };
                });

            // Agrupar por cargo
            const agrupados = {};
            filtrados.forEach(emp => {
                const nombreCargo = emp.cargos?.nombre_cargo || 'Sin Cargo';
                if (!agrupados[nombreCargo]) agrupados[nombreCargo] = [];
                agrupados[nombreCargo].push(emp);
            });
            Object.keys(agrupados).forEach(c =>
                agrupados[c].sort((a,b) => a.nombre.localeCompare(b.nombre))
            );

            setEmpleadosPorCargo(agrupados);
        } catch (error) {
            console.error("Error cargando datos:", error.message);
        } finally {
            setCargando(false);
        }
    };

    const abrirModal = (empleado) => setModal({ empleado });

    const confirmarPago = async () => {
        const empleado = modal.empleado;
        setModal(null);

        // Retirar de la lista visualmente de inmediato
        setEmpleadosPorCargo(prev => {
            const copia = { ...prev };
            Object.keys(copia).forEach(cargo => {
                copia[cargo] = copia[cargo].filter(e => e.id_empleado !== empleado.id_empleado);
                if (copia[cargo].length === 0) delete copia[cargo];
            });
            return copia;
        });
        setPagados(prev => new Set([...prev, empleado.id_empleado]));

        try {
            const partes     = fecha.split('-');
            const anio       = parseInt(partes[0]);
            const mes        = parseInt(partes[1]);
            const diaCorte   = parseInt(partes[2]);
            const mesStr     = String(mes).padStart(2, '0');
            const ultimoDia  = new Date(anio, mes, 0).getDate();
            const esFinDeMes = diaCorte === ultimoDia;
            const modo       = empleado.tipo_pago?.trim().toLowerCase();

            const fechaInicio = (modo === 'mensual' && esFinDeMes)
                ? `${anio}-${mesStr}-01`
                : diaCorte === 15
                    ? `${anio}-${mesStr}-01`
                    : `${anio}-${mesStr}-16`;

            const { error } = await supabase
                .from('pagostotales')
                .insert({
                    id_empleado:  empleado.id_empleado,
                    fecha_inicio: fechaInicio,
                    fecha_fin:    fecha,
                    total_pago:   empleado.totalCalculado,
                });

            if (error) throw error;

        } catch (err) {
            console.error("Error al registrar pago:", err.message);
            // Revertir si falló
            setEmpleadosPorCargo(prev => {
                const copia = { ...prev };
                const cargo = empleado.cargos?.nombre_cargo || 'Sin Cargo';
                if (!copia[cargo]) copia[cargo] = [];
                copia[cargo] = [...copia[cargo], empleado]
                    .sort((a,b) => a.nombre.localeCompare(b.nombre));
                return copia;
            });
            setPagados(prev => {
                const nuevo = new Set(prev);
                nuevo.delete(empleado.id_empleado);
                return nuevo;
            });
            alert("Hubo un error al registrar el pago. El empleado fue restaurado a la lista.");
        }
    };

    const cargosFiltrados = Object.entries(empleadosPorCargo).reduce((acc,[cargo,empleados]) => {
        const f = empleados.filter(e =>
            e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            (e.pin_tarjeta||'').toLowerCase().includes(busqueda.toLowerCase())
        );
        if (f.length > 0) acc[cargo] = f;
        return acc;
    }, {});

    const totalPendientes = Object.values(empleadosPorCargo).flat().length;

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth:1000, width:'100%' }}>

                <button onClick={() => navigate('/gestion-nomina')} style={backButtonStyle}>
                    <ArrowLeft size={18}/> Volver al Calendario
                </button>

                <div style={headerStyle}>
                    <div>
                        <h1 style={titleStyle}>Pagos: {fecha}</h1>
                        <p style={subtitleStyle}>
                            {totalPendientes > 0
                                ? `${totalPendientes} empleado${totalPendientes!==1?'s':''} pendiente${totalPendientes!==1?'s':''} de pago`
                                : '✅ Todos los empleados han sido pagados'}
                        </p>
                    </div>
                    <div style={searchWrapper}>
                        <Search size={18} style={searchIcon}/>
                        <input placeholder="Buscar por nombre o PIN..."
                            style={searchInput} value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}/>
                    </div>
                </div>

                {cargando ? (
                    <div style={statusCenter}>
                        <Loader2 className="animate-spin" size={32} color="#f8b195"/>
                        <p style={{fontSize:15}}>Calculando pagos reales...</p>
                    </div>

                ) : Object.keys(cargosFiltrados).length > 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:30 }}>
                        {Object.entries(cargosFiltrados).map(([cargo, empleados]) => (
                            <div key={cargo}>
                                <div style={cargoHeaderStyle}>
                                    <Briefcase size={17} color="#f8b195"/>
                                    <span style={cargoTitleStyle}>{cargo}</span>
                                    <span style={cargoBadgeStyle}>{empleados.length}</span>
                                </div>

                                <div style={listContainer}>
                                    {empleados.map(emp => (
                                        <div key={emp.id_empleado} style={cardStyle}>
                                            <div style={empInfo}>
                                                <div style={avatarStyle}>{emp.nombre.charAt(0)}</div>
                                                <div>
                                                    <div style={empName}>{emp.nombre}</div>
                                                    <div style={empSub}>
                                                        Pago: {emp.tipo_pago} &nbsp;·&nbsp; PIN: {emp.pin_tarjeta}
                                                    </div>
                                                    <div style={desgloseRow}>
                                                        <span style={desgloseChip}>
                                                            <Calendar size={11}/>
                                                            {emp.diasContados}/{emp.diasPeriodo} días
                                                        </span>
                                                        <span style={desgloseChip}>
                                                            Q{emp.pagoDiario}/día
                                                        </span>
                                                        {emp.totalHorasExtra > 0 && (
                                                            <span style={{...desgloseChip, color:'#ffd166', borderColor:'rgba(255,209,102,0.3)'}}>
                                                                <Clock size={11}/>
                                                                +{emp.totalHorasExtra}h extra (Q{emp.montoHorasExtra.toFixed(2)})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={payAction}>
                                                <div>
                                                    <div style={amountStyle}>Q{emp.totalCalculado.toLocaleString()}</div>
                                                    <div style={sueldoBaseLabel}>
                                                        Base: Q{emp.sueldo_base.toLocaleString()}
                                                    </div>
                                                </div>
                                                <button onClick={() => abrirModal(emp)} style={payButtonStyle}>
                                                    <CheckCircle size={16}/>
                                                    Marcar Pagado
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                ) : (
                    <div style={statusCenter}>
                        {totalPendientes === 0 && !cargando ? (
                            <>
                                <CheckCircle size={48} color="#2ed573"/>
                                <p style={{fontSize:16, color:'#2ed573', fontWeight:700}}>
                                    ¡Todos los pagos del día han sido procesados!
                                </p>
                            </>
                        ) : (
                            <>
                                <AlertCircle size={40} color="rgba(255,255,255,0.2)"/>
                                <p style={{fontSize:15}}>No hay empleados que deban cobrar en esta fecha.</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ══ MODAL DE CONFIRMACIÓN ══ */}
            {modal && (
                <div style={overlayStyle} onClick={() => setModal(null)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>

                        <button onClick={() => setModal(null)} style={modalCloseStyle}>
                            <X size={18}/>
                        </button>

                        <div style={modalAvatarStyle}>
                            {modal.empleado.nombre.charAt(0)}
                        </div>
                        <h2 style={modalTitleStyle}>Confirmar Pago</h2>
                        <p style={modalSubStyle}>¿Deseas registrar el pago para este empleado?</p>

                        <div style={modalInfoBox}>
                            <div style={modalInfoRow}>
                                <span style={modalInfoLabel}>Empleado</span>
                                <span style={modalInfoValue}>{modal.empleado.nombre}</span>
                            </div>
                            <div style={modalInfoRow}>
                                <span style={modalInfoLabel}>PIN</span>
                                <span style={{...modalInfoValue, fontFamily:'monospace', letterSpacing:2}}>
                                    {modal.empleado.pin_tarjeta}
                                </span>
                            </div>
                            <div style={modalInfoRow}>
                                <span style={modalInfoLabel}>Días trabajados</span>
                                <span style={modalInfoValue}>
                                    {modal.empleado.diasContados} de {modal.empleado.diasPeriodo}
                                </span>
                            </div>
                            {modal.empleado.totalHorasExtra > 0 && (
                                <div style={modalInfoRow}>
                                    <span style={modalInfoLabel}>Horas extra</span>
                                    <span style={{...modalInfoValue, color:'#ffd166'}}>
                                        {modal.empleado.totalHorasExtra}h → Q{modal.empleado.montoHorasExtra.toFixed(2)}
                                    </span>
                                </div>
                            )}
                            <div style={{...modalInfoRow, borderBottom:'none'}}>
                                <span style={modalInfoLabel}>Total a Pagar</span>
                                <span style={{...modalInfoValue, color:'#f8b195', fontSize:20, fontWeight:800}}>
                                    Q{modal.empleado.totalCalculado.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div style={{display:'flex', gap:12, marginTop:8, width:'100%'}}>
                            <button onClick={() => setModal(null)} style={modalCancelBtn}>
                                Cancelar
                            </button>
                            <button onClick={confirmarPago} style={modalConfirmBtn}>
                                <CheckCircle size={17}/> Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Estilos ─── */
const containerStyle   = { minHeight:'100vh', background:'#1a0a2e', padding:'3rem 2rem', color:'#fff', fontFamily:"'DM Sans',sans-serif", display:'flex', justifyContent:'center' };
const backButtonStyle  = { background:'transparent', border:'none', color:'#f67280', display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:20, fontWeight:600, fontSize:15 };
const headerStyle      = { display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:30 };
const titleStyle       = { fontSize:32, color:'#f8b195', margin:0, fontWeight:800, fontFamily:"'Syne',sans-serif" };
const subtitleStyle    = { color:'rgba(255,255,255,0.4)', fontSize:14, marginTop:5 };
const searchWrapper    = { position:'relative', width:300 };
const searchIcon       = { position:'absolute', left:15, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.3)' };
const searchInput      = { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'12px 15px 12px 45px', color:'#fff', outline:'none', boxSizing:'border-box', fontSize:14 };
const cargoHeaderStyle = { display:'flex', alignItems:'center', gap:10, marginBottom:12, paddingBottom:10, borderBottom:'1px solid rgba(248,177,149,0.2)' };
const cargoTitleStyle  = { fontSize:16, fontWeight:700, color:'#f8b195', textTransform:'uppercase', letterSpacing:1 };
const cargoBadgeStyle  = { fontSize:12, background:'rgba(248,177,149,0.15)', color:'#f8b195', padding:'3px 12px', borderRadius:20, fontWeight:700 };
const listContainer    = { display:'flex', flexDirection:'column', gap:12 };
const cardStyle        = { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:20, display:'flex', justifyContent:'space-between', alignItems:'center', transition:'all 0.2s' };
const empInfo          = { display:'flex', gap:15, alignItems:'center' };
const avatarStyle      = { width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#f67280,#f8b195)', display:'flex', alignItems:'center', justifyContent:'center', color:'#1a0a2e', fontWeight:800, fontSize:20, flexShrink:0 };
const empName          = { fontSize:18, fontWeight:700 };
const empSub           = { fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:2 };
const payAction        = { display:'flex', alignItems:'center', gap:20 };
const amountStyle      = { fontSize:20, fontWeight:800, color:'#f8b195' };
const payButtonStyle   = { background:'rgba(46,213,115,0.12)', border:'1px solid #2ed573', color:'#2ed573', padding:'9px 18px', borderRadius:10, display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:14, cursor:'pointer', transition:'all 0.2s' };
const statusCenter     = { textAlign:'center', padding:'100px 0', color:'rgba(255,255,255,0.3)', display:'flex', flexDirection:'column', alignItems:'center', gap:15 };
const desgloseRow      = { display:'flex', gap:8, marginTop:6, flexWrap:'wrap' };
const desgloseChip     = { display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'rgba(248,177,149,0.7)', background:'rgba(248,177,149,0.07)', border:'1px solid rgba(248,177,149,0.15)', borderRadius:6, padding:'2px 8px' };
const sueldoBaseLabel  = { fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'right', marginTop:2 };

/* ── Modal ── */
const overlayStyle    = { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 };
const modalStyle      = { background:'#220d38', border:'1px solid rgba(255,255,255,0.1)', borderRadius:24, padding:'36px 32px 28px', width:'100%', maxWidth:400, position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:10 };
const modalCloseStyle = { position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.06)', border:'none', color:'rgba(255,255,255,0.5)', borderRadius:8, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' };
const modalAvatarStyle= { width:64, height:64, borderRadius:16, background:'linear-gradient(135deg,#f67280,#f8b195)', display:'flex', alignItems:'center', justifyContent:'center', color:'#1a0a2e', fontWeight:800, fontSize:28, marginBottom:4 };
const modalTitleStyle = { fontSize:22, fontWeight:800, color:'#fff', margin:0, fontFamily:"'Syne',sans-serif" };
const modalSubStyle   = { fontSize:14, color:'rgba(255,255,255,0.4)', margin:0, textAlign:'center' };
const modalInfoBox    = { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, overflow:'hidden', marginTop:6 };
const modalInfoRow    = { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'13px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)' };
const modalInfoLabel  = { fontSize:12, color:'rgba(255,255,255,0.4)', fontWeight:600, textTransform:'uppercase', letterSpacing:.6 };
const modalInfoValue  = { fontSize:15, fontWeight:700, color:'#fff' };
const modalCancelBtn  = { flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:700, cursor:'pointer' };
const modalConfirmBtn = { flex:2, background:'rgba(46,213,115,0.15)', border:'1px solid #2ed573', color:'#2ed573', borderRadius:12, padding:'12px 20px', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 };

export default DetalleNomina;
