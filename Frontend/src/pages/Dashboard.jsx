import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Clock, CreditCard, LogOut, LayoutDashboard } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(145deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2.5rem 2rem 2rem',
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box',
            fontFamily: "'DM Sans', sans-serif",
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700;800&display=swap');
                * { box-sizing: border-box; }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .dash-card {
                    animation: fadeUp 0.4s ease both;
                }
                .dash-card:hover .card-icon {
                    background: rgba(248,177,149,0.16) !important;
                    border-color: rgba(248,177,149,0.35) !important;
                }
            `}</style>

            {/* Glow decorativo superior */}
            <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(246,114,128,0.08) 0%, transparent 65%)', top: -220, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
            {/* Glow inferior derecho */}
            <div style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(248,177,149,0.06) 0%, transparent 70%)', bottom: -110, right: -70, pointerEvents: 'none' }} />

            {/* ── Topbar ── */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 32px',
                borderBottom: '1px solid rgba(246,114,128,0.1)',
                background: 'rgba(255,255,255,0.02)',
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f8b195, #f67280)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CreditCard size={18} color="#1a0a2e" strokeWidth={2.2} />
                    </div>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: '#f8b195', letterSpacing: '0.02em' }}>
                        RFID Pro
                    </span>
                </div>

                {/* Usuario */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(246,114,128,0.2)', borderRadius: 100, padding: '6px 16px 6px 8px' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #f8b195, #f67280)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 800, color: '#1a0a2e' }}>
                        AS
                    </div>
                    <span style={{ fontSize: 13, color: 'rgba(248,177,149,0.75)', fontWeight: 600 }}>Administrador</span>
                </div>
            </div>

            {/* ── Encabezado ── */}
            <div style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '5rem', position: 'relative', zIndex: 1, animation: 'fadeUp 0.35s ease both' }}>
                {/* Badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(246,114,128,0.1)', border: '1px solid rgba(246,114,128,0.22)', borderRadius: 100, padding: '5px 16px', fontSize: 12, fontWeight: 600, color: '#f67280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f67280', display: 'inline-block', boxShadow: '0 0 6px #f67280' }} />
                    Sistema 
                </div>

                <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 800, color: '#f8b195', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 12px' }}>
                    RFID <span style={{ color: 'rgba(255,255,255,0.35)' }}>·</span>{' '}
                    <span style={{ color: '#ffffff' }}>Panel de Control</span>
                </h1>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', margin: 0, fontWeight: 500 }}>
                    Gestiona tu equipo, asistencia y nómina desde un solo lugar
                </p>
            </div>

            {/* ── Grid de tarjetas ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                marginBottom: '2.5rem',
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: 860,
            }}>
                <MenuCard delay="0.05s" icon={<LayoutDashboard size={26} />} title="Resumen General"       subtitle="Estadísticas y métricas del día"  onClick={() => navigate('/resumen-general')} />
                <MenuCard delay="0.1s"  icon={<UserPlus size={26} />}       title="Registrar Empleado"    subtitle="Alta de nuevas tarjetas RFID"      onClick={() => navigate('/registrar-empleado')} />
                <MenuCard delay="0.15s" icon={<Clock size={26} />}          title="Control Asistencia"    subtitle="Entradas, salidas y retardos"       onClick={() => navigate('/control-asistencia')} />
                <MenuCard delay="0.2s"  icon={<CreditCard size={26} />}     title="Gestión de Nóminas"    subtitle="Cálculo de pagos y bonos"          onClick={() => navigate('/gestion-nomina')} />
                <MenuCard delay="0.25s" icon={<Users size={26} />}          title="Plantilla de Personal" subtitle="Ver áreas y editar datos"          onClick={() => navigate('/empleados')} />
            </div>

            {/* ── Botón cerrar sesión ── */}
            <button
                onClick={handleLogout}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(246,114,128,0.5)'; e.currentTarget.style.color = '#f67280'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(246,114,128,0.2)'; e.currentTarget.style.color = 'rgba(246,114,128,0.5)'; }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1.5px solid rgba(246,114,128,0.2)', borderRadius: 12, padding: '11px 26px', color: 'rgba(246,114,128,0.5)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', zIndex: 1 }}
            >
                <LogOut size={15} strokeWidth={2} />
                Cerrar Sesión
            </button>
        </div>
    );
};

// ── MenuCard ──────────────────────────────────────────────────────────────────

const MenuCard = ({ icon, title, subtitle, onClick, delay = '0s' }) => (
    <div
        className="dash-card"
        onClick={onClick}
        onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(246,114,128,0.45)';
            e.currentTarget.style.background = 'rgba(246,114,128,0.07)';
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 14px 40px rgba(246,114,128,0.1)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }}
        style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            minHeight: 170,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '24px 26px',
            cursor: 'pointer',
            transition: 'border-color 0.22s, background 0.22s, transform 0.22s, box-shadow 0.22s',
            position: 'relative',
            overflow: 'hidden',
            animationDelay: delay,
        }}
    >
        {/* Icono */}
        <div
            className="card-icon"
            style={{
                width: 52, height: 52,
                background: 'rgba(248,177,149,0.08)',
                border: '1px solid rgba(248,177,149,0.15)',
                borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#f8b195',
                marginBottom: 18,
                transition: 'background 0.2s, border-color 0.2s',
            }}
        >
            {icon}
        </div>

        {/* Texto */}
        <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: '#ffffff', lineHeight: 1.3, marginBottom: 6 }}>
                {title}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5, fontWeight: 500 }}>
                {subtitle}
            </div>
        </div>

        {/* Flecha decorativa */}
        <div style={{ position: 'absolute', top: 22, right: 22, color: 'rgba(248,177,149,0.2)', fontSize: 18, fontWeight: 800 }}>→</div>
    </div>
);

export default Dashboard;
