import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabase/client';

export const ProtectedRoute = ({ allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setLoading(false);
      return;
    }

    setUser(session.user);

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', session.user.id)
      .single();

    if (perfil) {
      setRole(perfil.rol);
      if (allowedRoles.includes(perfil.rol)) {
        setIsAllowed(true);
      }
    }
    setLoading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAllowed) {
    if(role === 'gerente') return <Navigate to="/gerente" replace />;
    if(role === 'recepcion') return <Navigate to="/recepcion" replace />;
    if(role === 'bodega') return <Navigate to="/bodega" replace />;
    if(role === 'chofer') return <Navigate to="/chofer" replace />;
    if(role === 'cliente') return <Navigate to="/cliente" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};