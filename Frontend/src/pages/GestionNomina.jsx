import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

const GestionNomina = () => {
    const navigate = useNavigate();
    const [fechaActual, setFechaActual] = useState(new Date());
    const [diasDelMes, setDiasDelMes] = useState([]);

    useEffect(() => {
        generarCalendario();
    }, [fechaActual]);

    const generarCalendario = () => {
        const year = fechaActual.getFullYear();
        const month = fechaActual.getMonth();
        const ultimoDia = new Date(year, month + 1, 0).getDate();
        
        const dias = [];
        for (let i = 1; i <= ultimoDia; i++) {
            // Formato YYYY-MM-DD garantizado
            const fechaString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            dias.push({ 
                diaNumero: i, 
                fechaCompleta: fechaString,
                esDiaDePago: i === 15 || i === ultimoDia 
            });
        }
        setDiasDelMes(dias);
    };

    const cambiarMes = (direccion) => {
        setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + direccion, 1));
    };

    const irADetalle = (fechaCompleta) => {
        navigate(`/detalle-nomina/${fechaCompleta}`);
    };

    const nombreMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <div style={containerStyle}>
            <div style={{ maxWidth: 800, width: '100%' }}>
                
                <div style={topNavStyle}>
                    <button onClick={() => navigate('/dashboard')} style={backButtonStyle}>
                        <ArrowLeft size={18} /> Volver al Dashboard
                    </button>
                    <button onClick={() => navigate('/historial-pagos')} style={historyButtonStyle}>
                        <FileText size={18} /> Ver Historial de Pagos
                    </button>
                </div>

                <div style={headerStyle}>
                    <h1 style={titleStyle}>Gestión de Nómina</h1>
                    <p style={subtitleStyle}>Selecciona el día de corte para procesar pagos.</p>
                </div>

                <div style={calendarCard}>
                    <div style={calendarHeader}>
                        <button onClick={() => cambiarMes(-1)} style={navButton}><ChevronLeft size={24} /></button>
                        <h2 style={monthTitle}>{nombreMeses[fechaActual.getMonth()]} {fechaActual.getFullYear()}</h2>
                        <button onClick={() => cambiarMes(1)} style={navButton}><ChevronRight size={24} /></button>
                    </div>

                    <div style={gridStyle}>
                        {diasDelMes.map((diaInfo, index) => (
                            <div 
                                key={index} 
                                onClick={() => irADetalle(diaInfo.fechaCompleta)}
                                style={{
                                    ...dayStyle,
                                    background: diaInfo.esDiaDePago ? 'rgba(246, 114, 128, 0.15)' : 'rgba(255,255,255,0.02)',
                                    borderColor: diaInfo.esDiaDePago ? '#f67280' : 'rgba(255,255,255,0.05)',
                                    cursor: 'pointer'
                                }}
                            >
                                <span style={dayNumber}>{diaInfo.diaNumero}</span>
                                {diaInfo.esDiaDePago && <span style={badgeStyle}>Día de Pago</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Estilos ---
const containerStyle = { minHeight: '100vh', background: '#1a0a2e', padding: '3rem 2rem', color: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', justifyContent: 'center' };
const topNavStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: 20 };
const backButtonStyle = { background: 'transparent', border: 'none', color: '#f67280', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 };
const historyButtonStyle = { background: '#f8b19522', border: '1px solid #f8b195', color: '#f8b195', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 16px', borderRadius: 10, fontWeight: 600 };
const headerStyle = { marginBottom: 30 };
const titleStyle = { fontSize: 32, color: '#f8b195', margin: 0, fontWeight: 800 };
const subtitleStyle = { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 5 };
const calendarCard = { background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 30, border: '1px solid rgba(255,255,255,0.05)' };
const calendarHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 };
const monthTitle = { fontSize: 24, fontWeight: 700, margin: 0, color: '#fff' };
const navButton = { background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: '50%', width: 40, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 15 };
const dayStyle = { borderRadius: 15, padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' };
const dayNumber = { fontSize: 20, fontWeight: 700 };
const badgeStyle = { fontSize: 10, background: '#f67280', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 'bold' };

export default GestionNomina;