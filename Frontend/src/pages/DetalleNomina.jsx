import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

import {
    ArrowLeft,
    Search,
    CheckCircle,
    Loader2,
    AlertCircle,
    Briefcase,
    X,
    Clock,
    Calendar
} from 'lucide-react';

const DetalleNomina = () => {

    const { fecha } = useParams();
    const navigate = useNavigate();

    const [empleadosPorCargo, setEmpleadosPorCargo] = useState({});
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [pagados, setPagados] = useState(new Set());
    const [modal, setModal] = useState(null);

    const idEmpresaLogueada = localStorage.getItem('id_empresa');

    useEffect(() => {

        if (!fecha) {
            navigate('/gestion-nomina');
            return;
        }

        if (idEmpresaLogueada) {
            fetchDatosGlobales();
        }

    }, [fecha, idEmpresaLogueada]);

    const fetchDatosGlobales = async () => {

        setCargando(true);

        try {

            const partes = fecha.split('-');

            const anio = parseInt(partes[0]);
            const mes = parseInt(partes[1]);
            const diaCorte = parseInt(partes[2]);

            const ultimoDia = new Date(anio, mes, 0).getDate();

            const esFinDeMes = diaCorte === ultimoDia;

            const mesStr = String(mes).padStart(2, '0');

            const fechaInicioMes = `${anio}-${mesStr}-01`;
            const fechaInicioQ2 = `${anio}-${mesStr}-16`;

            const fechaFin = fecha;

            // ─────────────────────────────
            // EMPLEADOS YA PAGADOS
            // ─────────────────────────────

            const { data: pagosData, error: errorPagos } = await supabase
                .from('pagostotales')
                .select('id_empleado')
                .eq('fecha_fin', fecha);

            if (errorPagos) throw errorPagos;

            const idsPagados = new Set(
                pagosData.map(p => p.id_empleado)
            );

            setPagados(idsPagados);

            // ─────────────────────────────
            // EMPLEADOS
            // ─────────────────────────────

            const { data: empData, error: empError } = await supabase
                .from('empleados')
                .select(`
                    id_empleado,
                    nombre,
                    pin_tarjeta,
                    sueldo_base,
                    tipo_pago,
                    id_cargo,
                    hora_entrada,
                    hora_salida,
                    dia_descanso,
                    pago_hora_extra,
                    cargos (
                        nombre_cargo
                    )
                `)
                .eq('id_empresa', idEmpresaLogueada);

            if (empError) throw empError;

            const idsEmpleados = empData.map(
                e => e.id_empleado
            );

            // ─────────────────────────────
            // ASISTENCIAS
            // ─────────────────────────────

            const { data: asistencias, error: errAsis } = await supabase
                .from('registrosasistencia')
                .select('id_empleado, fecha')
                .in('id_empleado', idsEmpleados)
                .gte('fecha', fechaInicioMes)
                .lte('fecha', fechaFin);

            if (errAsis) throw errAsis;

            // ─────────────────────────────
            // HORAS EXTRA
            // ─────────────────────────────

            const { data: pagDiarios, error: errPD } = await supabase
                .from('pagosdiarios')
                .select(`
                    id_empleado,
                    fecha,
                    horas_extra
                `)
                .in('id_empleado', idsEmpleados)
                .gte('fecha', fechaInicioMes)
                .lte('fecha', fechaFin);

            if (errPD) throw errPD;

            // ─────────────────────────────
            // MAPA ASISTENCIAS
            // ─────────────────────────────

            const asisMap = {};

            asistencias.forEach(a => {

                if (!asisMap[a.id_empleado]) {
                    asisMap[a.id_empleado] = new Set();
                }

                asisMap[a.id_empleado].add(a.fecha);

            });

            // ─────────────────────────────
            // FILTRAR EMPLEADOS
            // ─────────────────────────────

            const filtrados = empData

                .filter(emp => {

                    const modo =
                        emp.tipo_pago?.trim().toLowerCase();

                    const debeCobrar =

                        diaCorte === 15

                            ? modo === 'quincenal'

                            : esFinDeMes

                                ? (
                                    modo === 'mensual' ||
                                    modo === 'quincenal'
                                )

                                : false;

                    return (
                        debeCobrar &&
                        !idsPagados.has(emp.id_empleado)
                    );

                })

                .map(emp => {

                    const modo =
                        emp.tipo_pago?.trim().toLowerCase();

                    const esMensual =
                        modo === 'mensual';

                    const periodoInicio = esMensual

                        ? fechaInicioMes

                        : diaCorte === 15

                            ? fechaInicioMes

                            : fechaInicioQ2;

                    const diasBase =
                        esMensual ? ultimoDia : 15;

                    const pagoDiario = Number(
                        (emp.sueldo_base || 0) / diasBase
                    );

                    const asistiosDias =
                        asisMap[emp.id_empleado] || new Set();

                    // ─────────────────────────
                    // SIN ASISTENCIAS
                    // ─────────────────────────

                    if (asistiosDias.size === 0) {

                        return {

                            ...emp,

                            diasBase,

                            diasPeriodo: 0,

                            diasContados: 0,

                            totalHorasExtra: 0,

                            montoHorasExtra: 0,

                            totalCalculado: 0,

                            pagoDiario: Number(
                                (
                                    Math.round(
                                        pagoDiario * 100
                                    ) / 100
                                ).toFixed(2)
                            ),

                            primerDia: null,
                        };
                    }

                    // ─────────────────────────
                    // ASISTENCIAS DEL PERÍODO
                    // ─────────────────────────

                    const fechasPeriodo =
                        [...asistiosDias]

                            .filter(f =>

                                f >= periodoInicio &&
                                f <= fechaFin

                            )

                            .sort();

                    if (fechasPeriodo.length === 0) {

                        return {

                            ...emp,

                            diasBase,

                            diasPeriodo: 0,

                            diasContados: 0,

                            totalHorasExtra: 0,

                            montoHorasExtra: 0,

                            totalCalculado: 0,

                            pagoDiario: Number(
                                (
                                    Math.round(
                                        pagoDiario * 100
                                    ) / 100
                                ).toFixed(2)
                            ),

                            primerDia: null,
                        };
                    }

                    // ─────────────────────────
                    // PRIMER DÍA REAL
                    // ─────────────────────────

                    const primerDiaReal =
                        fechasPeriodo[0];

                    // ─────────────────────────
                    // GENERAR DÍAS DEL PERÍODO
                    // ─────────────────────────

                    const diasDelPeriodo = [];

                    const dInicio =
                        new Date(
                            primerDiaReal + 'T00:00:00'
                        );

                    const dFin =
                        new Date(
                            fechaFin + 'T00:00:00'
                        );

                    for (
                        let d = new Date(dInicio);
                        d <= dFin;
                        d.setDate(d.getDate() + 1)
                    ) {

                        diasDelPeriodo.push(
                            new Date(d)
                                .toISOString()
                                .split('T')[0]
                        );
                    }

                    // ─────────────────────────
                    // CONTAR DÍAS
                    // ─────────────────────────

                    let diasContados = 0;

                    diasDelPeriodo.forEach(diaStr => {

                        // SI ASISTIÓ

                        if (asistiosDias.has(diaStr)) {

                            diasContados++;
                            return;
                        }

                        // VALIDAR DESCANSO

                        const jsDay =
                            new Date(
                                diaStr + 'T00:00:00'
                            ).getDay();

                        const bdDay =
                            jsDay === 0 ? 7 : jsDay;

                        const esDescanso =
                            bdDay === Number(emp.dia_descanso);

                        if (!esDescanso) return;

                        // ─────────────────────
                        // PAGAR DESCANSO SOLO
                        // SI TRABAJÓ ESA SEMANA
                        // ─────────────────────

                        const diaDate =
                            new Date(
                                diaStr + 'T00:00:00'
                            );

                        const diaSemana =
                            diaDate.getDay() === 0
                                ? 7
                                : diaDate.getDay();

                        const lunes =
                            new Date(diaDate);

                        lunes.setDate(
                            diaDate.getDate() - (diaSemana - 1)
                        );

                        const domingo =
                            new Date(lunes);

                        domingo.setDate(
                            lunes.getDate() + 6
                        );

                        const lunesStr =
                            lunes
                                .toISOString()
                                .split('T')[0];

                        const domingoStr =
                            domingo
                                .toISOString()
                                .split('T')[0];

                        const asistioEnSemana =
                            [...asistiosDias].some(f =>

                                f >= lunesStr &&
                                f <= domingoStr

                            );

                        if (asistioEnSemana) {
                            diasContados++;
                        }

                    });

                    // ─────────────────────────
                    // HORAS EXTRA
                    // ─────────────────────────

                    const horasExtraPeriodo =

                        pagDiarios

                            .filter(p =>

                                p.id_empleado === emp.id_empleado &&

                                p.fecha >= primerDiaReal &&

                                p.fecha <= fechaFin

                            )

                            .reduce((sum, p) =>

                                sum + Number(p.horas_extra || 0)

                            , 0);

                    // ─────────────────────────
                    // CÁLCULOS
                    // ─────────────────────────

                    const montoHorasExtra =

                        Number(horasExtraPeriodo || 0) *

                        Number(emp.pago_hora_extra || 0);

                    const totalCalculado =

                        (
                            Number(diasContados || 0) *

                            Number(pagoDiario || 0)
                        )

                        +

                        Number(montoHorasExtra || 0);

                    return {

                        ...emp,

                        diasBase,

                        diasPeriodo:
                            diasDelPeriodo.length,

                        diasContados:
                            Number(diasContados || 0),

                        totalHorasExtra:
                            Number(horasExtraPeriodo || 0),

                        montoHorasExtra: Number(
                            (
                                Math.round(
                                    montoHorasExtra * 100
                                ) / 100
                            ).toFixed(2)
                        ),

                        totalCalculado: Number(
                            (
                                Math.round(
                                    totalCalculado * 100
                                ) / 100
                            ).toFixed(2)
                        ),

                        pagoDiario: Number(
                            (
                                Math.round(
                                    pagoDiario * 100
                                ) / 100
                            ).toFixed(2)
                        ),

                        primerDia: primerDiaReal,
                    };

                });

            // ─────────────────────────────
            // AGRUPAR POR CARGO
            // ─────────────────────────────

            const agrupados = {};

            filtrados.forEach(emp => {

                const nombreCargo =
                    emp.cargos?.nombre_cargo ||
                    'Sin Cargo';

                if (!agrupados[nombreCargo]) {
                    agrupados[nombreCargo] = [];
                }

                agrupados[nombreCargo].push(emp);

            });

            Object.keys(agrupados).forEach(c => {

                agrupados[c].sort((a, b) =>

                    a.nombre.localeCompare(b.nombre)

                );

            });

            setEmpleadosPorCargo(agrupados);

        } catch (error) {

            console.error(
                'Error cargando datos:',
                error.message
            );

        } finally {

            setCargando(false);

        }

    };

    // ─────────────────────────────
    // MODAL
    // ─────────────────────────────

    const abrirModal = (empleado) => {

        setModal({ empleado });

    };

    const confirmarPago = async () => {

        const empleado = modal.empleado;

        setModal(null);

        try {

            await supabase
                .from('pagostotales')
                .insert({

                    id_empleado:
                        empleado.id_empleado,

                    fecha_inicio:
                        empleado.primerDia,

                    fecha_fin:
                        fecha,

                    total_pago:
                        empleado.totalCalculado,
                });

            fetchDatosGlobales();

        } catch (err) {

            console.error(
                'Error al registrar pago:',
                err.message
            );

        }

    };

    // ─────────────────────────────
    // FILTRO BÚSQUEDA
    // ─────────────────────────────

    const cargosFiltrados =

        Object.entries(empleadosPorCargo)

            .reduce((acc, [cargo, empleados]) => {

                const filtrados = empleados.filter(e =>

                    e.nombre
                        .toLowerCase()
                        .includes(
                            busqueda.toLowerCase()
                        )

                    ||

                    (e.pin_tarjeta || '')
                        .toLowerCase()
                        .includes(
                            busqueda.toLowerCase()
                        )

                );

                if (filtrados.length > 0) {

                    acc[cargo] = filtrados;

                }

                return acc;

            }, {});

    const totalPendientes =

        Object.values(empleadosPorCargo)
            .flat()
            .length;

    // ─────────────────────────────
    // RENDER
    // ─────────────────────────────

    return (

        <div style={containerStyle}>

            <div style={{ maxWidth: 1000, width: '100%' }}>

                <button
                    onClick={() => navigate('/gestion-nomina')}
                    style={backButtonStyle}
                >
                    <ArrowLeft size={18} />
                    Volver
                </button>

                <div style={headerStyle}>

                    <div>

                        <h1 style={titleStyle}>
                            Pagos: {fecha}
                        </h1>

                        <p style={subtitleStyle}>
                            {totalPendientes} pendientes
                        </p>

                    </div>

                    <div style={searchWrapper}>

                        <Search
                            size={18}
                            style={searchIcon}
                        />

                        <input
                            placeholder="Buscar..."
                            style={searchInput}
                            value={busqueda}
                            onChange={e =>
                                setBusqueda(e.target.value)
                            }
                        />

                    </div>

                </div>

                {cargando ? (

                    <div style={statusCenter}>

                        <Loader2
                            className="animate-spin"
                            size={32}
                            color="#f8b195"
                        />

                        <p>
                            Calculando pagos...
                        </p>

                    </div>

                ) : (

                    Object.entries(cargosFiltrados)
                        .map(([cargo, empleados]) => (

                            <div key={cargo}>

                                <div style={cargoHeaderStyle}>

                                    <Briefcase
                                        size={17}
                                        color="#f8b195"
                                    />

                                    <span style={cargoTitleStyle}>
                                        {cargo}
                                    </span>

                                </div>

                                <div style={listContainer}>

                                    {empleados.map(emp => (

                                        <div
                                            key={emp.id_empleado}
                                            style={cardStyle}
                                        >

                                            <div style={empInfo}>

                                                <div style={avatarStyle}>
                                                    {emp.nombre.charAt(0)}
                                                </div>

                                                <div>

                                                    <div style={empName}>
                                                        {emp.nombre}
                                                    </div>

                                                    <div style={empSub}>
                                                        {emp.tipo_pago}
                                                    </div>

                                                    <div style={desgloseRow}>

                                                        <span style={desgloseChip}>
                                                            <Calendar size={11} />

                                                            {emp.diasContados}/
                                                            {emp.diasPeriodo}
                                                            días
                                                        </span>

                                                        <span style={desgloseChip}>
                                                            Q{
                                                                Number(
                                                                    emp.pagoDiario || 0
                                                                ).toLocaleString()
                                                            }/día
                                                        </span>

                                                        {emp.totalHorasExtra > 0 && (

                                                            <span
                                                                style={{
                                                                    ...desgloseChip,
                                                                    color: '#ffd166'
                                                                }}
                                                            >
                                                                <Clock size={11} />

                                                                +{emp.totalHorasExtra}h

                                                            </span>

                                                        )}

                                                    </div>

                                                </div>

                                            </div>

                                            <div style={payAction}>

                                                <div>

                                                    <div style={amountStyle}>

                                                        Q{
                                                            Number(
                                                                emp.totalCalculado || 0
                                                            ).toLocaleString()
                                                        }

                                                    </div>

                                                    <div style={sueldoBaseLabel}>

                                                        Base: Q{
                                                            Number(
                                                                emp.sueldo_base || 0
                                                            ).toLocaleString()
                                                        }

                                                    </div>

                                                </div>

                                                <button
                                                    onClick={() => abrirModal(emp)}
                                                    style={payButtonStyle}
                                                >

                                                    <CheckCircle size={16} />

                                                    Marcar Pagado

                                                </button>

                                            </div>

                                        </div>

                                    ))}

                                </div>

                            </div>

                        ))

                )}

            </div>

        </div>

    );

};

// ─────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────

const containerStyle = {
    minHeight: '100vh',
    background: '#1a0a2e',
    padding: '3rem 2rem',
    color: '#fff',
    fontFamily: "'DM Sans',sans-serif",
    display: 'flex',
    justifyContent: 'center'
};

const backButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: '#f67280',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    marginBottom: 20,
    fontWeight: 600,
    fontSize: 15
};

const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 30
};

const titleStyle = {
    fontSize: 32,
    color: '#f8b195',
    margin: 0,
    fontWeight: 800
};

const subtitleStyle = {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 5
};

const searchWrapper = {
    position: 'relative',
    width: 300
};

const searchIcon = {
    position: 'absolute',
    left: 15,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.3)'
};

const searchInput = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '12px 15px 12px 45px',
    color: '#fff',
    outline: 'none'
};

const cargoHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
};

const cargoTitleStyle = {
    fontSize: 16,
    fontWeight: 700,
    color: '#f8b195'
};

const listContainer = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
};

const cardStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const empInfo = {
    display: 'flex',
    gap: 15,
    alignItems: 'center'
};

const avatarStyle = {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'linear-gradient(135deg,#f67280,#f8b195)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1a0a2e',
    fontWeight: 800,
    fontSize: 20
};

const empName = {
    fontSize: 18,
    fontWeight: 700
};

const empSub = {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)'
};

const payAction = {
    display: 'flex',
    alignItems: 'center',
    gap: 20
};

const amountStyle = {
    fontSize: 20,
    fontWeight: 800,
    color: '#f8b195'
};

const payButtonStyle = {
    background: 'rgba(46,213,115,0.12)',
    border: '1px solid #2ed573',
    color: '#2ed573',
    padding: '9px 18px',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 700,
    cursor: 'pointer'
};

const statusCenter = {
    textAlign: 'center',
    padding: '100px 0'
};

const desgloseRow = {
    display: 'flex',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap'
};

const desgloseChip = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: 'rgba(248,177,149,0.7)',
    background: 'rgba(248,177,149,0.07)',
    border: '1px solid rgba(248,177,149,0.15)',
    borderRadius: 6,
    padding: '2px 8px'
};

const sueldoBaseLabel = {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'right',
    marginTop: 2
};

export default DetalleNomina;