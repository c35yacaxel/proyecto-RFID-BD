import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Save, IdCard, DollarSign, Clock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient'; 

const RegistrarEmpleado = () => {
    const navigate = useNavigate();
    const [cargando, setCargando] = useState(false);
    const [listaCargos, setListaCargos] = useState([]);
    const [dropdownAbierto, setDropdownAbierto] = useState(false);
    const [dropdownPagoAbierto, setDropdownPagoAbierto] = useState(false); // <--- Nuevo
    
    const idEmpresaLogueada = localStorage.getItem('id_empresa') || 1; 

    const opcionesPago = [ // <--- Nuevo
        { value: 'mensual', label: 'Mensual' },
        { value: 'quincenal', label: 'Quincenal' }
    ];

    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        correo: '',
        id_cargo: '', 
        sueldo_base: '',
        pin_tarjeta: '', 
        hora_entrada: '08:00',
        hora_salida: '17:00',
        tipo_pago: 'mensual',
        pago_hora_extra: '0.00',
        dia_descanso: '7', 
        id_empresa: idEmpresaLogueada
    });

    useEffect(() => {
        const obtenerCargosDeMiEmpresa = async () => {
            try {
                const { data, error } = await supabase
                    .from('cargos')
                    .select('id_cargo, nombre_cargo')
                    .eq('id_empresa', idEmpresaLogueada);

                if (error) throw error;
                setListaCargos(data || []);
            } catch (error) {
                console.error("Error al obtener cargos:", error.message);
            }
        };
        obtenerCargosDeMiEmpresa();
    }, [idEmpresaLogueada]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'sueldo_base') {
            const sueldoBaseNum = parseFloat(value);
            if (!isNaN(sueldoBaseNum) && sueldoBaseNum > 0) {
                const sueldoHora = (sueldoBaseNum / 30) / 9;
                const valorHoraExtra = sueldoHora * 1.5;
                setFormData(prev => ({
                    ...prev,
                    [name]: value,
                    pago_hora_extra: valorHoraExtra.toFixed(2)
                }));
            } else {
                setFormData(prev => ({ ...prev, [name]: value, pago_hora_extra: '0.00' }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.id_cargo) {
            alert("Debes seleccionar un cargo de la lista.");
            return;
        }
        setCargando(true);

        try {
            const hoy = new Date().toISOString().split('T')[0];
            const datosParaInsertar = {
                id_empresa: parseInt(formData.id_empresa),
                nombre: formData.nombre,
                telefono: formData.telefono,
                correo: formData.correo,
                id_cargo: parseInt(formData.id_cargo),
                sueldo_base: parseFloat(formData.sueldo_base),
                pin_tarjeta: formData.pin_tarjeta,
                hora_entrada: formData.hora_entrada,
                hora_salida: formData.hora_salida,
                tipo_pago: formData.tipo_pago,
                pago_hora_extra: parseFloat(formData.pago_hora_extra),
                dia_descanso: parseInt(formData.dia_descanso),
                fecha_contratacion: hoy
            };

            const { error } = await supabase
                .from('empleados')
                .insert([datosParaInsertar]);

            if (error) throw error;
            alert(`¡Empleado ${formData.nombre} registrado con éxito hoy ${hoy}!`);
            navigate('/dashboard');
        } catch (error) {
            alert("Error al guardar: " + error.message);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth: 900, width: '100%' }}>
                <button onClick={() => navigate('/dashboard')} style={backButtonStyle}>
                    <ArrowLeft size={18} /> Volver al Panel
                </button>

                <div style={{ marginBottom: 30 }}>
                    <h1 style={titleStyle}>Registrar <span style={{ color: '#ffffff' }}>Nuevo Empleado</span></h1>
                    <p style={subtitleStyle}>La fecha de contratación se asignará automáticamente al día de hoy.</p>
                </div>

                <form onSubmit={handleSubmit} style={formGridStyle}>
                    <div style={sectionStyle}>
                        <div style={sectionTitleStyle}><UserPlus size={16}/> Información Personal</div>
                        <input name="nombre" placeholder="Nombre completo" onChange={handleChange} style={inputStyle} required />
                        <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                            <input name="telefono" placeholder="Teléfono" onChange={handleChange} style={inputStyle} />
                            <input name="correo" type="email" placeholder="Correo electrónico" onChange={handleChange} style={inputStyle} />
                        </div>
                    </div>

                    <div style={sectionStyle}>
                        <div style={sectionTitleStyle}><IdCard size={16}/> Cargo y Seguridad</div>
                        
                        <label style={labelStyle}>Puesto de Trabajo</label>
                        <div style={{ position: 'relative', marginBottom: 15 }}>
                            <div
                                onClick={() => setDropdownAbierto(!dropdownAbierto)}
                                style={{
                                    ...inputStyle,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    userSelect: 'none'
                                }}
                            >
                                <span style={{ color: formData.id_cargo ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                                    {formData.id_cargo
                                        ? listaCargos.find(c => String(c.id_cargo) === String(formData.id_cargo))?.nombre_cargo
                                        : 'Seleccionar cargo...'}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>▼</span>
                            </div>

                            {dropdownAbierto && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#1e1035',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: 10,
                                    zIndex: 100,
                                    overflow: 'hidden',
                                    marginTop: 4,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                                }}>
                                    <div
                                        onClick={() => { setFormData(prev => ({...prev, id_cargo: ''})); setDropdownAbierto(false); }}
                                        style={{
                                            padding: '11px 15px',
                                            color: 'rgba(255,255,255,0.35)',
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            borderBottom: '1px solid rgba(255,255,255,0.06)'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(246,114,128,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        Seleccionar cargo...
                                    </div>
                                    {listaCargos.map(cargo => (
                                        <div
                                            key={cargo.id_cargo}
                                            onClick={() => {
                                                setFormData(prev => ({...prev, id_cargo: cargo.id_cargo}));
                                                setDropdownAbierto(false);
                                            }}
                                            style={{
                                                padding: '11px 15px',
                                                color: '#fff',
                                                fontSize: 14,
                                                cursor: 'pointer',
                                                background: String(formData.id_cargo) === String(cargo.id_cargo)
                                                    ? 'rgba(246,114,128,0.15)' : 'transparent',
                                                borderBottom: '1px solid rgba(255,255,255,0.04)'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(246,114,128,0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background =
                                                String(formData.id_cargo) === String(cargo.id_cargo)
                                                    ? 'rgba(246,114,128,0.15)' : 'transparent'}
                                        >
                                            {cargo.nombre_cargo}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {listaCargos.length === 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f67280', fontSize: 10, marginBottom: 10 }}>
                                <AlertCircle size={12} /> No hay cargos creados para esta empresa.
                            </div>
                        )}

                        <label style={labelStyle}>PIN Tarjeta RFID</label>
                        <input name="pin_tarjeta" placeholder="Escanee o ingrese ID" onChange={handleChange} style={{ ...inputStyle, borderColor: '#f67280' }} required />
                    </div>

                    <div style={sectionStyle}>
                        <div style={sectionTitleStyle}><Clock size={16}/> Horario y Descanso</div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Entrada</label>
                                <input name="hora_entrada" type="time" onChange={handleChange} value={formData.hora_entrada} style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Salida</label>
                                <input name="hora_salida" type="time" onChange={handleChange} value={formData.hora_salida} style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ marginTop: 15 }}>
                            <label style={labelStyle}>Día de Descanso</label>
                            <select name="dia_descanso" onChange={handleChange} value={formData.dia_descanso} style={inputStyle}>
                                <option value="1">Lunes</option>
                                <option value="2">Martes</option>
                                <option value="3">Miércoles</option>
                                <option value="4">Jueves</option>
                                <option value="5">Viernes</option>
                                <option value="6">Sábado</option>
                                <option value="7">Domingo</option>
                            </select>
                        </div>
                    </div>

                    <div style={sectionStyle}>
                        <div style={sectionTitleStyle}><DollarSign size={16}/> Compensación</div>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Sueldo Base</label>
                                <input name="sueldo_base" type="number" placeholder="0.00" onChange={handleChange} style={inputStyle} required />
                            </div>

                            {/* --- DROPDOWN PERSONALIZADO PERIODO DE PAGO --- */}
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Periodo de Pago</label>
                                <div style={{ position: 'relative' }}>
                                    <div
                                        onClick={() => setDropdownPagoAbierto(!dropdownPagoAbierto)}
                                        style={{
                                            ...inputStyle,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <span style={{ color: '#fff' }}>
                                            {opcionesPago.find(o => o.value === formData.tipo_pago)?.label}
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>▼</span>
                                    </div>

                                    {dropdownPagoAbierto && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            background: '#1e1035',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            borderRadius: 10,
                                            zIndex: 100,
                                            overflow: 'hidden',
                                            marginTop: 4,
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                                        }}>
                                            {opcionesPago.map(opcion => (
                                                <div
                                                    key={opcion.value}
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, tipo_pago: opcion.value }));
                                                        setDropdownPagoAbierto(false);
                                                    }}
                                                    style={{
                                                        padding: '11px 15px',
                                                        color: '#fff',
                                                        fontSize: 14,
                                                        cursor: 'pointer',
                                                        background: formData.tipo_pago === opcion.value
                                                            ? 'rgba(246,114,128,0.15)' : 'transparent',
                                                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(246,114,128,0.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.background =
                                                        formData.tipo_pago === opcion.value
                                                            ? 'rgba(246,114,128,0.15)' : 'transparent'}
                                                >
                                                    {opcion.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* --- FIN DROPDOWN PERIODO DE PAGO --- */}

                        </div>
                        <label style={labelStyle}>Pago Hora Extra (Calculado)</label>
                        <input value={formData.pago_hora_extra} style={{ ...inputStyle, opacity: 0.6 }} readOnly />
                    </div>

                    <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                        <button type="submit" disabled={cargando || listaCargos.length === 0} style={submitButtonStyle}>
                            {cargando ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                            {cargando ? 'Registrando...' : 'Confirmar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const containerStyle = { minHeight: '100vh', background: '#1a0a2e', padding: '3rem 2rem', color: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', justifyContent: 'center' };
const backButtonStyle = { background: 'transparent', border: 'none', color: '#f67280', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 25, fontWeight: 600 };
const titleStyle = { fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, color: '#f8b195', margin: 0 };
const subtitleStyle = { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 5 };
const formGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 };
const sectionStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 25 };
const sectionTitleStyle = { fontSize: 12, color: '#f8b195', fontWeight: 700, textTransform: 'uppercase', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 };
const labelStyle = { display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' };
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 15px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' };
const submitButtonStyle = { background: 'linear-gradient(135deg, #f67280, #f8b195)', border: 'none', color: '#1a0a2e', padding: '15px 35px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 };

export default RegistrarEmpleado;