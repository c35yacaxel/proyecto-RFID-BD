import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, ChevronDown, ChevronUp, Edit3, Trash2, Save, X, Search } from 'lucide-react';

const EmpleadosLista = () => {
    const navigate = useNavigate();
    const [empleados, setEmpleados] = useState([]);
    const [cargos, setCargos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [areaAbierta, setAreaAbierta] = useState(null);
    const [empleadoEditando, setEmpleadoEditando] = useState(null);

    // ✅ ID dinámica desde la sesión (no hardcodeada)
    const idEmpresaLogueada = localStorage.getItem('id_empresa');
    const nombreEmpresa = localStorage.getItem('nombre_empresa');

    useEffect(() => {
        if (!idEmpresaLogueada) {
            navigate('/');
            return;
        }
        fetchDatos();
    }, [idEmpresaLogueada]);

    const fetchDatos = async () => {
        setLoading(true);
        try {
            const { data: empData } = await supabase
                .from('empleados')
                .select('*')
                .eq('id_empresa', idEmpresaLogueada);

            const { data: carData } = await supabase
                .from('cargos')
                .select('*')
                .eq('id_empresa', idEmpresaLogueada);

            setEmpleados(empData || []);
            setCargos(carData || []);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    const empleadosFiltrados = empleados.filter(emp =>
        emp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (emp.pin_tarjeta && emp.pin_tarjeta.toLowerCase().includes(busqueda.toLowerCase()))
    );

    const empleadosPorArea = cargos.map(cargo => ({
        ...cargo,
        staff: empleadosFiltrados.filter(e => e.id_cargo === cargo.id_cargo)
    })).filter(area => area.staff.length > 0);

    const handleEliminar = async (emp) => {
        const confirmar = window.confirm(`¿Estás seguro de eliminar a "${emp.nombre}"? Esta acción no se puede deshacer.`);
        if (confirmar) {
            const { error } = await supabase.from('empleados').delete().eq('id_empleado', emp.id_empleado);
            if (!error) fetchDatos();
            else alert("Error al eliminar: " + error.message);
        }
    };

    const handleGuardarEdicion = async () => {
        const sueldoNum = parseFloat(empleadoEditando.sueldo_base);
        const nuevaHoraExtra = ((sueldoNum / 30) / 9) * 1.5;

        const { error } = await supabase
            .from('empleados')
            .update({
                nombre: empleadoEditando.nombre,
                telefono: empleadoEditando.telefono,
                correo: empleadoEditando.correo,
                id_cargo: parseInt(empleadoEditando.id_cargo),
                sueldo_base: sueldoNum,
                pin_tarjeta: empleadoEditando.pin_tarjeta,
                hora_entrada: empleadoEditando.hora_entrada,
                hora_salida: empleadoEditando.hora_salida,
                tipo_pago: empleadoEditando.tipo_pago,
                pago_hora_extra: nuevaHoraExtra,
                dia_descanso: parseInt(empleadoEditando.dia_descanso)
            })
            .eq('id_empleado', empleadoEditando.id_empleado);

        if (error) alert("Error: " + error.message);
        else {
            setEmpleadoEditando(null);
            fetchDatos();
        }
    };

    if (loading) return <div style={containerStyle}>Cargando plantilla de {nombreEmpresa}...</div>;

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth: 900, width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <button onClick={() => navigate('/dashboard')} style={backButtonStyle}>
                            <ArrowLeft size={18} /> Dashboard
                        </button>
                        <h1 style={titleStyle}>Plantilla de <span style={{ color: '#fff' }}>Personal</span></h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 14 }}>{nombreEmpresa}</p>
                    </div>

                    <div style={searchContainerStyle}>
                        <Search size={16} color="rgba(255,255,255,0.4)" />
                        <input
                            placeholder="Buscar por nombre o PIN..."
                            style={searchInputStyle}
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                {empleadosPorArea.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: 50, color: 'rgba(255,255,255,0.3)' }}>
                        {busqueda ? `No hay resultados para "${busqueda}"` : "No hay empleados registrados en esta empresa."}
                    </div>
                ) : (
                    empleadosPorArea.map(area => (
                        <div key={area.id_cargo} style={areaCardStyle}>
                            <div
                                style={areaHeaderStyle}
                                onClick={() => setAreaAbierta(areaAbierta === area.id_cargo ? null : area.id_cargo)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={badgeStyle}>{area.staff.length}</div>
                                    <span style={{ fontWeight: 700, fontSize: 16 }}>{area.nombre_cargo}</span>
                                </div>
                                {areaAbierta === area.id_cargo ? <ChevronUp /> : <ChevronDown />}
                            </div>

                            {(areaAbierta === area.id_cargo || busqueda !== '') && (
                                <div style={listaStyle}>
                                    {area.staff.map(emp => (
                                        <div key={emp.id_empleado} style={empRowStyle}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{emp.nombre}</div>
                                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', gap: 10 }}>
                                                    <span>PIN: {emp.pin_tarjeta}</span>
                                                    <span>•</span>
                                                    <span>{emp.correo || 'Sin correo'}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 10 }}>
                                                <button onClick={() => setEmpleadoEditando(emp)} style={actionBtnStyle}><Edit3 size={14} /></button>
                                                <button onClick={() => handleEliminar(emp)} style={{ ...actionBtnStyle, color: '#f67280' }}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* MODAL DE EDICIÓN COMPLETO */}
            {empleadoEditando && (
                <div style={modalOverlayStyle}>
                    <div style={modalStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ background: '#f67280', padding: 8, borderRadius: 8 }}><Edit3 size={18} color="#1a0a2e" /></div>
                                <h3 style={{ margin: 0 }}>Editar Expediente</h3>
                            </div>
                            <button onClick={() => setEmpleadoEditando(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X /></button>
                        </div>

                        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 10 }}>
                            <label style={labelStyle}>Nombre Completo</label>
                            <input style={inputStyle} value={empleadoEditando.nombre} onChange={e => setEmpleadoEditando({ ...empleadoEditando, nombre: e.target.value })} />

                            <label style={labelStyle}>Correo Electrónico</label>
                            <input style={inputStyle} type="email" value={empleadoEditando.correo || ''} onChange={e => setEmpleadoEditando({ ...empleadoEditando, correo: e.target.value })} />

                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Teléfono</label>
                                    <input style={inputStyle} value={empleadoEditando.telefono || ''} onChange={e => setEmpleadoEditando({ ...empleadoEditando, telefono: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>PIN Tarjeta</label>
                                    <input style={{ ...inputStyle, borderColor: '#f67280' }} value={empleadoEditando.pin_tarjeta} onChange={e => setEmpleadoEditando({ ...empleadoEditando, pin_tarjeta: e.target.value })} />
                                </div>
                            </div>

                            <label style={labelStyle}>Cargo / Puesto</label>
                            <select style={inputStyle} value={empleadoEditando.id_cargo} onChange={e => setEmpleadoEditando({ ...empleadoEditando, id_cargo: e.target.value })}>
                                {cargos.map(c => <option key={c.id_cargo} value={c.id_cargo}>{c.nombre_cargo}</option>)}
                            </select>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Sueldo Base</label>
                                    <input type="number" style={inputStyle} value={empleadoEditando.sueldo_base} onChange={e => setEmpleadoEditando({ ...empleadoEditando, sueldo_base: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Periodo de Pago</label>
                                    <select style={inputStyle} value={empleadoEditando.tipo_pago} onChange={e => setEmpleadoEditando({ ...empleadoEditando, tipo_pago: e.target.value })}>
                                        <option value="mensual">Mensual</option>
                                        <option value="quincenal">Quincenal</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Hora Entrada</label>
                                    <input type="time" style={inputStyle} value={empleadoEditando.hora_entrada} onChange={e => setEmpleadoEditando({ ...empleadoEditando, hora_entrada: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Hora Salida</label>
                                    <input type="time" style={inputStyle} value={empleadoEditando.hora_salida} onChange={e => setEmpleadoEditando({ ...empleadoEditando, hora_salida: e.target.value })} />
                                </div>
                            </div>

                            <label style={labelStyle}>Día de Descanso</label>
                            <select style={inputStyle} value={empleadoEditando.dia_descanso} onChange={e => setEmpleadoEditando({ ...empleadoEditando, dia_descanso: e.target.value })}>
                                <option value="1">Lunes</option>
                                <option value="2">Martes</option>
                                <option value="3">Miércoles</option>
                                <option value="4">Jueves</option>
                                <option value="5">Viernes</option>
                                <option value="6">Sábado</option>
                                <option value="7">Domingo</option>
                            </select>
                        </div>

                        <button onClick={handleGuardarEdicion} style={saveBtnStyle}>
                            <Save size={18} /> Actualizar Información
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const containerStyle = { minHeight: '100vh', background: '#1a0a2e', padding: '3rem 2rem', color: '#fff', display: 'flex', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" };
const searchContainerStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 15px', display: 'flex', alignItems: 'center', gap: 10, width: 300 };
const searchInputStyle = { background: 'transparent', border: 'none', color: '#fff', fontSize: 14, outline: 'none', width: '100%' };
const areaCardStyle = { background: 'rgba(255,255,255,0.03)', borderRadius: 15, marginBottom: 10, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' };
const areaHeaderStyle = { padding: '18px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };
const badgeStyle = { background: '#f67280', color: '#1a0a2e', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 800 };
const listaStyle = { padding: '10px 25px 20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' };
const empRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const actionBtnStyle = { background: 'rgba(255,255,255,0.05)', border: 'none', color: '#f8b195', padding: 8, borderRadius: 8, cursor: 'pointer' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' };
const modalStyle = { background: '#24103a', padding: 30, borderRadius: 24, width: '100%', maxWidth: 500, border: '1px solid rgba(246,114,128,0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' };
const inputStyle = { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 15px', borderRadius: 12, color: '#fff', marginBottom: 15, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { fontSize: 10, textTransform: 'uppercase', color: '#f67280', fontWeight: 700, marginBottom: 6, display: 'block', letterSpacing: '0.05em' };
const saveBtnStyle = { width: '100%', background: 'linear-gradient(135deg, #f67280, #f8b195)', border: 'none', padding: 16, borderRadius: 14, fontWeight: 800, cursor: 'pointer', marginTop: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#1a0a2e' };
const backButtonStyle = { background: 'transparent', border: 'none', color: '#f67280', cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 };
const titleStyle = { fontSize: 32, color: '#f8b195', margin: 0, fontWeight: 800 };

export default EmpleadosLista;