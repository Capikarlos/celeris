import { useState } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { Truck, Mail, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast'; // <--- Importamos toast

export const Login = () => {
  const [esRegistro, setEsRegistro] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (esRegistro) {
      // ... (código de registro igual que antes) ...
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } }
      });
      if (error) toast.error(error.message);
      else {
        toast.success('Registro exitoso. ¡Entrando!');
        // Pequeño truco: Auto-login tras registro
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) navigate('/cliente');
      }

    } else {
      // --- LOGIN CON DIAGNÓSTICO ---
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error("Error de contraseña/usuario: " + error.message);
      } else {
        toast.success('Credenciales correctas.');
        
        // 1. Buscamos el perfil
        const { data: perfil, error: perfilError } = await supabase
          .from('perfiles')
          .select('*') // Traemos todo para ver qué pasa
          .eq('id', data.user.id)
          .single();

        // 2. Diagnóstico de errores
        if (perfilError) {
          console.error("Error Supabase:", perfilError);
          toast.error("Error leyendo perfil: " + perfilError.message);
          // IMPORTANTE: Aquí NO redirigimos a cliente, nos quedamos para ver el error
        } else if (!perfil) {
          toast.error("¡Tu usuario no tiene perfil en la tabla 'perfiles'!");
        } else {
          // 3. Éxito: Verificamos qué rol leyó
          toast.success(`Rol detectado: ${perfil.rol}`);
          
          if (perfil.rol === 'gerente') {
            navigate('/gerente');
          } else if (perfil.rol === 'chofer') {
            navigate('/chofer');
          } else if (perfil.rol === 'recepcion') {
            navigate('/recepcion');
          } else if (perfil.rol === 'bodega') {
            navigate('/bodega');
          } else {
            navigate('/cliente');
          }
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-celeris-dark via-blue-900 to-celeris-main flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl flex overflow-hidden max-w-5xl w-full relative">
        
        {/* Lado Izquierdo (Logo Animado y Profesional) */}
        <div className="w-1/2 bg-celeris-main hidden md:flex flex-col items-center justify-center p-12 text-white relative overflow-hidden">
          {/* Efecto de fondo sutil */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMTAwIiBmaWxsPSIjRkZGIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] bg-repeat opacity-20"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Contenedor del icono con efecto de resplandor y pulso */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-celeris-light blur-2xl opacity-30 animate-pulse rounded-full"></div>
              <div className="relative bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg">
                <Truck size={80} className="text-celeris-light animate-[bounce_3s_infinite]" />
              </div>
            </div>
            
            <h1 className="text-5xl font-black tracking-tight mb-2 bg-gradient-to-r from-white to-celeris-light bg-clip-text text-transparent">
              Celeris
            </h1>
            <p className="text-blue-100 text-xl font-medium tracking-wide">Logística Inteligente en Tlaxcala.</p>
          </div>
        </div>

        {/* Lado Derecho (Formulario) */}
        <div className="w-full md:w-1/2 p-10 sm:p-14 flex flex-col justify-center">
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              {esRegistro ? 'Comienza tu viaje' : '¡Hola de nuevo!'}
            </h2>
            <p className="text-gray-500 text-lg">
              {esRegistro ? 'Crea tu cuenta para empezar a enviar.' : 'Ingresa tus datos para continuar.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {esRegistro && (
              <div className="relative group">
                <User className="absolute left-4 top-4 text-gray-400 group-focus-within:text-celeris-main transition-colors" size={22} />
                <input 
                  type="text" placeholder="Nombre Completo"
                  value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="w-full pl-12 p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-celeris-main focus:bg-white outline-none font-medium transition-all"
                  required
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-celeris-main transition-colors" size={22} />
              <input 
                type="email" placeholder="Correo Electrónico"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-celeris-main focus:bg-white outline-none font-medium transition-all"
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-4 text-gray-400 group-focus-within:text-celeris-main transition-colors" size={22} />
              <input 
                type="password" placeholder="Contraseña"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-celeris-main focus:bg-white outline-none font-medium transition-all"
                required
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-celeris-main to-blue-600 text-white p-4 rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Procesando...' : (esRegistro ? 'Crear Cuenta' : 'Iniciar Sesión')}
              {!loading && <ArrowRight size={22} />}
            </button>
          </form>

          <div className="mt-8 text-center text-gray-600 text-lg">
            {esRegistro ? '¿Ya eres parte de Celeris?' : '¿Aún no tienes cuenta?'}
            <button 
              onClick={() => {
                setEsRegistro(!esRegistro);
                toast.dismiss(); // Limpiar notificaciones al cambiar de modo
              }}
              className="text-celeris-main font-bold ml-2 hover:underline focus:outline-none"
            >
              {esRegistro ? 'Inicia Sesión' : 'Regístrate ahora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};