import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Importar páginas
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Recepcion } from './pages/Recepcion';
import { Bodega } from './pages/Bodega';
import { Chofer } from './pages/Chofer';
import { Gerente } from './pages/Gerente';
import { Cliente } from './pages/Cliente';

// Importar el Guardián
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      
      <Routes>
        {/* Rutas Públicas (Cualquiera entra) */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* --- RUTAS PROTEGIDAS --- */}
        
        {/* Solo RECEPCIÓN y GERENTE pueden entrar a Recepción */}
        <Route element={<ProtectedRoute allowedRoles={['recepcion', 'gerente']} />}>
           <Route path="/recepcion" element={<Recepcion />} />
        </Route>

        {/* Solo BODEGA y GERENTE pueden entrar a Bodega */}
        <Route element={<ProtectedRoute allowedRoles={['bodega', 'gerente']} />}>
           <Route path="/bodega" element={<Bodega />} />
        </Route>

        {/* Solo CHOFER puede entrar a la App de Chofer */}
        <Route element={<ProtectedRoute allowedRoles={['chofer']} />}>
           <Route path="/chofer" element={<Chofer />} />
        </Route>

        {/* Solo CLIENTE puede entrar al Portal Cliente */}
        <Route element={<ProtectedRoute allowedRoles={['cliente']} />}>
           <Route path="/cliente" element={<Cliente />} />
        </Route>

        {/* Solo GERENTE entra al Dashboard Maestro */}
        <Route element={<ProtectedRoute allowedRoles={['gerente']} />}>
           <Route path="/gerente" element={<Gerente />} />
        </Route>

        {/* Ruta 404 (Por si escriben cualquier cosa) */}
        <Route path="*" element={<Home />} />

      </Routes>
    </>
  );
}

export default App;