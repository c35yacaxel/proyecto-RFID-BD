import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShieldCheck, CreditCard, Mail, Lock, Building2, Plus, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';

// ═══════════════════════════════════════════
// VISTA: Login
// ═══════════════════════════════════════════
const LoginView = ({ onSwitch }) => {
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [loading,  setLoading]  = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) { alert("Por favor, introduce tus credenciales."); return; }
        setLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(), password: password.trim(),
            });

            if (authError) {
                // Mensaje específico si el email no está confirmado
                if (authError.message?.toLowerCase().includes('email not confirmed')) {
                    alert("Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada.");
                } else {
                    alert("Credenciales incorrectas o usuario no registrado.");
                }
                setLoading(false);
                return;
            }

            const { data: empresaData, error: dbError } = await supabase
                .from('empresas').select('id_empresa, nombre').ilike('correo', email.trim()).maybeSingle();

            if (dbError || !empresaData) {
                alert("Usuario autenticado, pero no existe en la tabla empresas.");
            } else {
                localStorage.setItem('token',           authData.session.access_token);
                localStorage.setItem('id_empresa',      empresaData.id_empresa);
                localStorage.setItem('nombre_empresa',  empresaData.nombre);
                navigate('/dashboard');
            }
        } catch (err) {
            alert("Error en el sistema.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div style={logoWrapperStyle}>
                <div style={logoIconStyle}><CreditCard size={17} color="#1a0a2e" strokeWidth={2.2}/></div>
                <span style={logoTextStyle}>RFID Pro</span>
            </div>

            <div style={shieldWrapperStyle}>
                <ShieldCheck size={32} color="#f67280" strokeWidth={1.8}/>
            </div>

            <div style={eyebrowStyle}><span style={dotStyle}/> Panel Administrativo</div>

            <h1 style={titleStyle}>RFID Pro <span style={{color:'#fff'}}>System</span></h1>
            <p style={subtitleStyle}>Ingresa con la cuenta de tu empresa</p>

            <form onSubmit={handleLogin}>
                <label style={labelStyle}>Correo de la empresa</label>
                <div style={inputWrapperStyle}>
                    <Mail size={15} color="rgba(246,114,128,0.35)" style={inputIconStyle}/>
                    <input type="email" placeholder="ejemplo@empresa.com"
                        value={email} onChange={e=>setEmail(e.target.value)}
                        style={inputStyle} disabled={loading}
                        autoComplete="username" />
                </div>

                <label style={labelStyle}>Contraseña</label>
                <div style={inputWrapperStyle}>
                    <Lock size={15} color="rgba(246,114,128,0.35)" style={inputIconStyle}/>
                    <input type="password" placeholder="••••••••"
                        value={password} onChange={e=>setPassword(e.target.value)}
                        style={inputStyle} disabled={loading}
                        autoComplete="current-password" />
                </div>

                <button type="submit" disabled={loading}
                    style={{...buttonStyle, opacity:loading?.7:1, cursor:loading?'not-allowed':'pointer'}}>
                    {loading ? 'Verificando...' : 'Ingresar al sistema'}
                </button>
            </form>

            <div style={dividerStyle}>
                <span style={dividerLineStyle}/><span style={dividerTextStyle}>¿Empresa nueva?</span><span style={dividerLineStyle}/>
            </div>

            <button onClick={onSwitch} style={secondaryBtnStyle}>
                <Building2 size={15}/> Registrar mi empresa <ChevronRight size={14}/>
            </button>

            <p style={footerTextStyle}>Sistema de control RFID · Acceso restringido</p>
        </>
    );
};

// ═══════════════════════════════════════════
// VISTA: Registro
// ═══════════════════════════════════════════
const RegisterView = ({ onSwitch }) => {
    const [step,     setStep]     = useState(1);
    const [loading,  setLoading]  = useState(false);

    const [nombre,   setNombre]   = useState('');
    const [correo,   setCorreo]   = useState('');
    const [password, setPassword] = useState('');
    const [confirm,  setConfirm]  = useState('');
    const [cargos,   setCargos]   = useState(['']);

    const handleStep1 = (e) => {
        e.preventDefault();
        if (!nombre.trim() || !correo.trim() || !password.trim()) {
            alert("Completa todos los campos."); return;
        }
        if (password !== confirm) {
            alert("Las contraseñas no coinciden."); return;
        }
        if (password.length < 6) {
            alert("La contraseña debe tener al menos 6 caracteres."); return;
        }
        setStep(2);
    };

    const addCargo    = () => setCargos(prev => [...prev, '']);
    const removeCargo = (i) => setCargos(prev => prev.filter((_,idx) => idx !== i));
    const editCargo   = (i, val) => setCargos(prev => prev.map((c,idx) => idx===i ? val : c));

    const handleRegister = async (e) => {
        e.preventDefault();
        const cargosValidos = cargos.map(c=>c.trim()).filter(Boolean);
        if (cargosValidos.length === 0) { alert("Agrega al menos un cargo."); return; }

        setLoading(true);
        try {
            // 1. Crear usuario en Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email:    correo.trim(),
                password: password.trim(),
                options:  { data: { nombre: nombre.trim() } }
            });

            if (authError) throw new Error(authError.message);

            const userId = authData?.user?.id;
            if (!userId) throw new Error("No se pudo obtener el ID del usuario.");

            // 2. Insertar empresa directamente desde el cliente
            //    (sin depender del trigger para el nombre)
            const { data: empresaInsertada, error: insertEmpresaError } = await supabase
                .from('empresas')
                .insert({
                    nombre:     nombre.trim(),
                    correo:     correo.trim(),
                    contrasena: password.trim(), // si tu tabla lo requiere
                })
                .select('id_empresa')
                .single();

            // Si la inserción falla (ej: ya la creó el trigger), intentamos obtenerla
            let idEmpresa = empresaInsertada?.id_empresa;

            if (insertEmpresaError || !idEmpresa) {
                // El trigger pudo haberla creado, esperamos y buscamos
                await new Promise(r => setTimeout(r, 1500));
                const { data: empresaBuscada, error: buscarError } = await supabase
                    .from('empresas')
                    .select('id_empresa')
                    .ilike('correo', correo.trim())
                    .maybeSingle();

                if (buscarError || !empresaBuscada) {
                    throw new Error("No se pudo registrar la empresa. Verifica los permisos de la tabla.");
                }

                // Si la encontramos pero el nombre quedó mal (Por definir), lo actualizamos
                await supabase
                    .from('empresas')
                    .update({ nombre: nombre.trim() })
                    .eq('id_empresa', empresaBuscada.id_empresa);

                idEmpresa = empresaBuscada.id_empresa;
            }

            // 3. Insertar cargos
            const rowsCargos = cargosValidos.map(nombre_cargo => ({
                nombre_cargo, id_empresa: idEmpresa
            }));
            const { error: cargosError } = await supabase.from('cargos').insert(rowsCargos);
            if (cargosError) throw new Error(cargosError.message);

            alert(`✅ Empresa "${nombre}" registrada con éxito.\n\n📧 Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.`);
            onSwitch();

        } catch (err) {
            alert("Error al registrar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div style={logoWrapperStyle}>
                <div style={logoIconStyle}><CreditCard size={17} color="#1a0a2e" strokeWidth={2.2}/></div>
                <span style={logoTextStyle}>RFID Pro</span>
            </div>

            <button onClick={onSwitch} style={{...backBtnStyle, marginBottom:18}}>
                <ArrowLeft size={15}/> Volver al login
            </button>

            <div style={stepsRow}>
                {[1,2].map(n => (
                    <div key={n} style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{
                            width:28, height:28, borderRadius:'50%',
                            background: step>=n ? 'linear-gradient(135deg,#f8b195,#f67280)' : 'rgba(255,255,255,.07)',
                            border: step>=n ? 'none' : '1px solid rgba(255,255,255,.12)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:12, fontWeight:800,
                            color: step>=n ? '#1a0a2e' : 'rgba(255,255,255,.3)',
                            transition:'all .3s'
                        }}>{n}</div>
                        <span style={{fontSize:12, fontWeight:600, color: step>=n ? '#f8b195' : 'rgba(255,255,255,.3)'}}>
                            {n===1 ? 'Datos empresa' : 'Cargos'}
                        </span>
                        {n<2 && <ChevronRight size={13} color="rgba(255,255,255,.2)"/>}
                    </div>
                ))}
            </div>

            {step === 1 && (
                <form onSubmit={handleStep1}>
                    <div style={eyebrowStyle}><span style={dotStyle}/> Nueva empresa</div>
                    <h1 style={{...titleStyle, fontSize:24, marginBottom:4}}>
                        Crear <span style={{color:'#fff'}}>cuenta</span>
                    </h1>
                    <p style={subtitleStyle}>Información de tu empresa</p>

                    <label style={labelStyle}>Nombre de la empresa</label>
                    <div style={inputWrapperStyle}>
                        <Building2 size={15} color="rgba(246,114,128,0.35)" style={inputIconStyle}/>
                        <input type="text" placeholder="Mi Empresa S.A."
                            value={nombre} onChange={e=>setNombre(e.target.value)}
                            style={inputStyle}
                            autoComplete="organization" />
                    </div>

                    <label style={labelStyle}>Correo corporativo</label>
                    <div style={inputWrapperStyle}>
                        <Mail size={15} color="rgba(246,114,128,0.35)" style={inputIconStyle}/>
                        <input type="email" placeholder="empresa@correo.com"
                            value={correo} onChange={e=>setCorreo(e.target.value)}
                            style={inputStyle}
                            autoComplete="new-email" />
                    </div>

                    <label style={labelStyle}>Contraseña</label>
                    <div style={inputWrapperStyle}>
                        <Lock size={15} color="rgba(246,114,128,0.35)" style={inputIconStyle}/>
                        <input type="password" placeholder="Mínimo 6 caracteres"
                            value={password} onChange={e=>setPassword(e.target.value)}
                            style={inputStyle}
                            autoComplete="new-password" />
                    </div>

                    <label style={labelStyle}>Confirmar contraseña</label>
                    <div style={inputWrapperStyle}>
                        <Lock size={15} color="rgba(246,114,128,0.35)" style={inputIconStyle}/>
                        <input type="password" placeholder="Repite tu contraseña"
                            value={confirm} onChange={e=>setConfirm(e.target.value)}
                            style={inputStyle}
                            autoComplete="new-password" />
                    </div>

                    <button type="submit" style={buttonStyle}>
                        Continuar <ChevronRight size={15}/>
                    </button>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={handleRegister}>
                    <div style={eyebrowStyle}><span style={dotStyle}/> Paso 2 de 2</div>
                    <h1 style={{...titleStyle, fontSize:24, marginBottom:4}}>
                        Cargos de <span style={{color:'#fff'}}>tu empresa</span>
                    </h1>
                    <p style={subtitleStyle}>Agrega los puestos de trabajo que maneja tu empresa</p>

                    <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:14}}>
                        {cargos.map((c, i) => (
                            <div key={i} style={{display:'flex', gap:8, alignItems:'center'}}>
                                <div style={{...inputWrapperStyle, flex:1, marginBottom:0}}>
                                    <Building2 size={15} color="rgba(246,114,128,0.35)" style={inputIconStyle}/>
                                    <input type="text" placeholder={`Cargo ${i+1} (ej: Mesero, Cajero…)`}
                                        value={c} onChange={e=>editCargo(i, e.target.value)}
                                        style={inputStyle}/>
                                </div>
                                {cargos.length > 1 && (
                                    <button type="button" onClick={()=>removeCargo(i)}
                                        style={deleteCargoBtn}>
                                        <Trash2 size={14}/>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={addCargo} style={addCargoBtn}>
                        <Plus size={14}/> Agregar otro cargo
                    </button>

                    <button type="submit" disabled={loading}
                        style={{...buttonStyle, marginTop:18, opacity:loading?.7:1, cursor:loading?'not-allowed':'pointer',
                            display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
                        {loading ? 'Registrando...' : '✅ Finalizar registro'}
                    </button>
                </form>
            )}

            <p style={footerTextStyle}>Sistema de control RFID · Acceso restringido</p>
        </>
    );
};

// ═══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════
const Login = () => {
    const [vista, setVista] = useState('login');

    return (
        <div style={containerStyle}>
            <div style={glowTopStyle}/>
            <div style={glowBottomStyle}/>
            <div style={{width:'100%', maxWidth:390, position:'relative', zIndex:1}}>
                {vista === 'login'
                    ? <LoginView    onSwitch={() => setVista('register')}/>
                    : <RegisterView onSwitch={() => setVista('login')}/>
                }
            </div>
        </div>
    );
};

// ─── Estilos ───
const containerStyle     = { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'linear-gradient(145deg,#1a0a2e 0%,#16213e 50%,#0f3460 100%)', padding:'2rem', position:'relative', overflow:'hidden', fontFamily:"'DM Sans',sans-serif", boxSizing:'border-box' };
const glowTopStyle        = { position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(246,114,128,0.08) 0%,transparent 65%)', top:-200, left:'50%', transform:'translateX(-50%)', pointerEvents:'none' };
const glowBottomStyle     = { position:'absolute', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(248,177,149,0.06) 0%,transparent 70%)', bottom:-100, right:-60, pointerEvents:'none' };
const logoWrapperStyle    = { display:'flex', alignItems:'center', gap:10, marginBottom:32 };
const logoIconStyle       = { width:34, height:34, borderRadius:8, background:'linear-gradient(135deg,#f8b195,#f67280)', display:'flex', alignItems:'center', justifyContent:'center' };
const logoTextStyle       = { fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:'#f8b195', letterSpacing:'.02em' };
const shieldWrapperStyle  = { width:64, height:64, borderRadius:16, background:'rgba(246,114,128,0.1)', border:'1px solid rgba(246,114,128,0.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 };
const eyebrowStyle        = { display:'inline-flex', alignItems:'center', gap:6, background:'rgba(246,114,128,0.1)', border:'1px solid rgba(246,114,128,0.2)', borderRadius:100, padding:'4px 12px', fontSize:10, fontWeight:600, color:'#f67280', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 };
const dotStyle            = { width:5, height:5, borderRadius:'50%', background:'#f67280', display:'inline-block' };
const titleStyle          = { fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, color:'#f8b195', letterSpacing:'-.01em', margin:'0 0 4px' };
const subtitleStyle       = { fontSize:13, color:'rgba(255,255,255,0.35)', margin:'0 0 24px' };
const labelStyle          = { fontSize:10, fontWeight:600, color:'rgba(248,177,149,0.5)', textTransform:'uppercase', letterSpacing:'.1em', display:'block', marginBottom:6 };
const inputWrapperStyle   = { position:'relative', marginBottom:14 };
const inputIconStyle      = { position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' };
const inputStyle          = { width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'13px 14px 13px 42px', color:'#f0e0da', fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:'none' };
const buttonStyle         = { width:'100%', background:'linear-gradient(135deg,#f8b195 0%,#f67280 100%)', color:'#1a0a2e', border:'none', borderRadius:10, padding:'14px', marginTop:8, fontFamily:"'Syne',sans-serif", fontSize:12, fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 };
const secondaryBtnStyle   = { width:'100%', background:'rgba(248,177,149,0.06)', border:'1px solid rgba(248,177,149,0.2)', color:'#f8b195', borderRadius:10, padding:'13px 14px', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 };
const dividerStyle        = { display:'flex', alignItems:'center', gap:12, margin:'18px 0 14px' };
const dividerLineStyle    = { flex:1, height:1, background:'rgba(255,255,255,0.07)' };
const dividerTextStyle    = { fontSize:11, color:'rgba(255,255,255,0.25)', fontWeight:500, whiteSpace:'nowrap' };
const footerTextStyle     = { textAlign:'center', marginTop:20, fontSize:11, color:'rgba(255,255,255,0.15)' };
const backBtnStyle        = { background:'transparent', border:'none', color:'#f67280', display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontWeight:600, fontSize:13, padding:0, fontFamily:"'DM Sans',sans-serif" };
const stepsRow            = { display:'flex', alignItems:'center', gap:16, marginBottom:22, padding:'12px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12 };
const addCargoBtn         = { width:'100%', background:'rgba(248,177,149,0.06)', border:'1px dashed rgba(248,177,149,0.3)', color:'#f8b195', borderRadius:10, padding:'10px', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 };
const deleteCargoBtn      = { background:'rgba(246,114,128,0.1)', border:'1px solid rgba(246,114,128,0.25)', color:'#f67280', borderRadius:8, width:40, height:44, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 };

export default Login;