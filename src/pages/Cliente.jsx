import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Package, MapPin, LogOut, Truck, CheckCircle, 
  AlertTriangle, KeyRound, Plus, ArrowRight, QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Cliente = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paquetes, setPaquetes] = useState([]); // Lista de paquetes mostrados
  const [usuario, setUsuario] = useState(null);
  
  // Filtro local
  const [filtro, setFiltro] = useState('');
  
  // Nuevo Rastreo Manual
  const [nuevoTracking, setNuevoTracking] = useState('');
  const [loadingTracking, setLoadingTracking] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      setUsuario(user);

      // 1. Cargar paquetes vinculados por EMAIL
      const { data } = await supabase
        .from('paquetes')
        .select('*')
        .eq('cliente_email', user.email) 
        .order('created_at', { ascending: false });

      if (data) setPaquetes(data);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA PARA AGREGAR PAQUETE MANUALMENTE ---
  const agregarPaqueteManual = async (e) => {
    e.preventDefault();
    if (!nuevoTracking) return toast.error("Escribe un número de guía");
    
    // Verificar si ya lo tenemos en pantalla
    if (paquetes.some(p => p.tracking_id === nuevoTracking)) {
      return toast.error("Este paquete ya está en tu lista");
    }

    setLoadingTracking(true);
    try {
      // Buscar en Supabase
      const { data, error } = await supabase
        .from('paquetes')
        .select('*')
        .eq('tracking_id', nuevoTracking.trim()) // Importante el trim por si copian espacios
        .single();

      if (error || !data) {
        toast.error("Guía no encontrada. Verifica el código.");
      } else {
        // Agregarlo a la lista visual (sin recargar página)
        setPaquetes(prev => [data, ...prev]);
        setNuevoTracking('');
        toast.success("Paquete vinculado exitosamente 🎉");
      }
    } catch (err) {
      toast.error("Error al buscar");
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Filtrado visual (Buscador local)
  const paquetesVisibles = paquetes.filter(p => 
    p.tracking_id.toLowerCase().includes(filtro.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(filtro.toLowerCase()) ||
    p.destino.toLowerCase().includes(filtro.toLowerCase())
  );

  // Utilidades visuales
  const getProgreso = (estado) => {
    if(estado === 'entregado') return 100;
    if(estado === 'en_ruta') return 75;
    if(estado === 'en_bodega') return 50;
    return 15; // Recibido
  };

  const getEstilosEstado = (estado) => {
    switch(estado) {
      case 'entregado': return { color: 'bg-green-500', texto: 'Entregado', icon: <CheckCircle size={14}/> };
      case 'incidencia': return { color: 'bg-red-500', texto: 'Incidencia', icon: <AlertTriangle size={14}/> };
      case 'en_ruta': return { color: 'bg-blue-600 animate-pulse', texto: 'En Camino', icon: <Truck size={14}/> };
      default: return { color: 'bg-yellow-500', texto: 'Procesando', icon: <Package size={14}/> };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm/50 backdrop-blur-md bg-white/90">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-celeris-dark text-white p-1.5 rounded-lg">
               <Truck size={20} />
            </div>
            <span className="text-xl font-bold text-celeris-dark tracking-tight">Celeris <span className="text-celeris-light font-normal">Track</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
               <span className="text-xs text-gray-400 font-bold uppercase">Bienvenido</span>
               <span className="text-sm font-bold text-gray-800">{usuario?.user_metadata?.nombre || 'Usuario'}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 p-2.5 rounded-xl transition-all"
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION & BÚSQUEDA MANUAL */}
      <div className="bg-celeris-dark text-white pt-16 pb-28 px-6 relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="max-w-4xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
             <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">Sigue tus envíos <br/><span className="text-celeris-light">en tiempo real.</span></h1>
             <p className="text-blue-200 text-lg mb-8 opacity-90">Ingresa tu código de seguimiento para ver el estado actual o revisa tu historial vinculado.</p>
             
             {/* FORMULARIO AGREGAR MANUAL */}
             <form onSubmit={agregarPaqueteManual} className="bg-white/10 p-2 rounded-2xl backdrop-blur-sm border border-white/10 flex gap-2 max-w-md shadow-2xl">
                <div className="relative flex-1">
                   <Search className="absolute left-4 top-3.5 text-blue-200" size={20}/>
                   <input 
                     type="text" 
                     value={nuevoTracking}
                     onChange={(e) => setNuevoTracking(e.target.value.toUpperCase())}
                     placeholder="Ej: TLX-API-8206"
                     className="w-full pl-12 pr-4 py-3 bg-transparent text-white placeholder-blue-200/50 outline-none font-bold tracking-wide uppercase"
                   />
                </div>
                <button 
                  type="submit"
                  disabled={loadingTracking}
                  className="bg-celeris-light hover:bg-white hover:text-celeris-dark text-white px-6 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  {loadingTracking ? '...' : <><Plus size={20}/> Agregar</>}
                </button>
             </form>
          </div>

          {/* Tarjeta Decorativa (Ilustración) */}
          <div className="hidden md:block relative">
             <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex justify-between items-center mb-6 opacity-50">
                   <div className="h-2 w-20 bg-white/50 rounded-full"></div>
                   <div className="h-8 w-8 bg-white/50 rounded-full"></div>
                </div>
                <div className="space-y-4">
                   <div className="h-4 w-3/4 bg-white/20 rounded-full"></div>
                   <div className="h-4 w-1/2 bg-white/20 rounded-full"></div>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                   <div className="h-10 w-24 bg-celeris-light rounded-lg"></div>
                   <div className="h-10 w-10 bg-white/20 rounded-lg"></div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="max-w-5xl mx-auto px-4 -mt-16 pb-20 relative z-20">
         
         {/* BARRA DE FILTRO (Buscar dentro de lo que ya tengo) */}
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-4 overflow-x-auto">
            <span className="text-xs font-bold text-gray-400 uppercase whitespace-nowrap">Tus Paquetes:</span>
            <input 
               type="text" 
               placeholder="Filtrar lista..." 
               value={filtro}
               onChange={(e) => setFiltro(e.target.value)}
               className="flex-1 bg-gray-50 border border-transparent focus:bg-white focus:border-gray-200 rounded-lg px-4 py-2 text-sm outline-none transition-all"
            />
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{paquetesVisibles.length}</span>
         </div>

         {loading ? (
            <div className="text-center py-20"><div className="animate-spin w-8 h-8 border-4 border-celeris-main border-t-transparent rounded-full mx-auto"></div></div>
         ) : paquetesVisibles.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
               <Package className="mx-auto text-gray-300 mb-4" size={48}/>
               <p className="text-gray-500 font-medium">No se encontraron paquetes.</p>
               <p className="text-sm text-gray-400 mt-1">Usa la barra superior para agregar uno con su código.</p>
            </div>
         ) : (
            <div className="space-y-6">
               {paquetesVisibles.map((p) => {
                  const estiloEstado = getEstilosEstado(p.estado);
                  return (
                     <div key={p.id} className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5">
                        
                        {/* HEADER TARJETA */}
                        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                           <div>
                              <div className="flex items-center gap-3">
                                 <h3 className="text-xl font-black text-gray-800 tracking-tight">{p.tracking_id}</h3>
                                 <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase text-white ${estiloEstado.color}`}>
                                    {estiloEstado.icon} {estiloEstado.texto}
                                 </span>
                              </div>
                              <p className="text-gray-500 text-sm mt-1 font-medium">{p.descripcion}</p>
                           </div>
                           <div className="text-right hidden sm:block">
                              <p className="text-[10px] uppercase font-bold text-gray-400">Fecha de Registro</p>
                              <p className="text-sm font-bold text-gray-700">{new Date(p.created_at).toLocaleDateString()}</p>
                           </div>
                        </div>

                        {/* CUERPO TARJETA */}
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                           
                           {/* PROGRESO */}
                           <div className="lg:col-span-2 space-y-6">
                              <div className="relative pt-2">
                                 <div className="flex justify-between text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
                                    <span>Recibido</span>
                                    <span className={p.estado === 'en_ruta' || p.estado === 'entregado' ? 'text-celeris-main' : ''}>En Camino</span>
                                    <span className={p.estado === 'entregado' ? 'text-green-500' : ''}>Entregado</span>
                                 </div>
                                 <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                       className={`h-full rounded-full transition-all duration-1000 ease-out ${estiloEstado.color}`} 
                                       style={{width: `${getProgreso(p.estado)}%`}}
                                    ></div>
                                 </div>
                              </div>

                              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                 <div className="bg-white p-2.5 rounded-full shadow-sm text-celeris-main">
                                    <MapPin size={20}/>
                                 </div>
                                 <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Destino</p>
                                    <p className="font-bold text-gray-800 text-lg">{p.destino}</p>
                                 </div>
                              </div>
                           </div>

                           {/* CÓDIGO DE SEGURIDAD (OTP) */}
                           <div className="lg:col-span-1">
                              {p.estado === 'entregado' ? (
                                 <div className="h-full bg-green-50 rounded-2xl border border-green-100 p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                                       <CheckCircle size={24}/>
                                    </div>
                                    <h4 className="font-bold text-green-800">Entregado</h4>
                                    <p className="text-xs text-green-600 mt-1 font-medium">Gracias por confiar en Celeris.</p>
                                 </div>
                              ) : p.estado === 'incidencia' ? (
                                 <div className="h-full bg-red-50 rounded-2xl border border-red-100 p-6 flex flex-col items-center justify-center text-center">
                                    <AlertTriangle className="text-red-500 mb-2" size={32}/>
                                    <h4 className="font-bold text-red-800">Incidencia</h4>
                                    <p className="text-xs text-red-600 mt-1 font-medium px-2 py-1 bg-white/50 rounded">{p.incidencia_nota || "Contacta soporte"}</p>
                                 </div>
                              ) : (
                                 <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-celeris-dark rounded-2xl p-6 text-center text-white shadow-xl group">
                                    {/* Efecto de brillo */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                    
                                    <div className="flex items-center justify-center gap-2 mb-3 opacity-80">
                                       <KeyRound size={16}/>
                                       <span className="text-[10px] font-bold uppercase tracking-widest">Código de Entrega</span>
                                    </div>
                                    
                                    <div className="bg-white/10 backdrop-blur-md rounded-xl py-3 px-4 border border-white/10 mb-3">
                                       <span className="text-4xl font-mono font-black tracking-[0.2em] shadow-black drop-shadow-lg">
                                          {p.codigo_seguridad || '----'}
                                       </span>
                                    </div>
                                    
                                    <p className="text-[10px] text-gray-300 font-medium leading-relaxed">
                                       Muestra este código al conductor <br/>para recibir tu paquete.
                                    </p>
                                 </div>
                              )}
                           </div>

                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>
    </div>
  );
};