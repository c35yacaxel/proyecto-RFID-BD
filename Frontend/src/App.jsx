import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importación de Páginas existentes
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegistrarEmpleado from './pages/RegistrarEmpleado';
import ControlAsistencia from './pages/ControlAsistencia';
import ResumenGeneral from './pages/ResumenGeneral';

// Módulos de Nómina
import GestionNomina from './pages/GestionNomina';
import DetalleNomina from './pages/DetalleNomina';
import HistorialPagos from './pages/HistorialPagos';

// Listado y CRUD de empleados
import EmpleadosLista from './pages/EmpleadosLista';

// Componente para proteger las rutas
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Rutas Protegidas */}
        <Route path="/dashboard"           element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/registrar-empleado"  element={<ProtectedRoute><RegistrarEmpleado /></ProtectedRoute>} />
        <Route path="/empleados"           element={<ProtectedRoute><EmpleadosLista /></ProtectedRoute>} />
        <Route path="/control-asistencia"  element={<ProtectedRoute><ControlAsistencia /></ProtectedRoute>} />
        <Route path="/resumen-general"     element={<ProtectedRoute><ResumenGeneral /></ProtectedRoute>} />
        
        {/* LA TRINIDAD DE LA NÓMINA */}
        <Route path="/gestion-nomina"      element={<ProtectedRoute><GestionNomina /></ProtectedRoute>} />
        <Route path="/detalle-nomina/:fecha" element={<ProtectedRoute><DetalleNomina /></ProtectedRoute>} />
        <Route path="/historial-pagos"     element={<ProtectedRoute><HistorialPagos /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;