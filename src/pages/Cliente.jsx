import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Package, MapPin, LogOut, Truck, CheckCircle, 
  AlertTriangle, KeyRound, Plus, User, Phone, Star, Save, X,
  Clock, ArrowUpRight, HelpCircle, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Cliente = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paquetes, setPaquetes] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState({ nombre: '', telefono: '', email: '' });
  
  // Estados de Interfaz
  const [tabActiva, setTabActiva] = useState('activos'); // 'activos' | 'historial'
  const [nuevoTracking, setNuevoTracking] = useState('');
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [modalPerfilOpen, setModalPerfilOpen] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
    
    // AUTO-REFRESH: Consultar cada 5 segundos para ver si el chofer entregó
    const intervalo = setInterval(() => {
        if (usuario?.email) cargarPaquetes(usuario.email, false); // false = sin loading spinner
    }, 5000);

    return () => clearInterval(intervalo);
  }, [usuario?.email]);

  const cargarDatosIniciales = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      setUsuario(user);

      // 1. Cargar Perfil
      const { data: datosPerfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
      if (datosPerfil) setPerfil(datosPerfil);

      // 2. Cargar Paquetes
      await cargarPaquetes(user.email, true);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPaquetes = async (email, mostrarLoading = false) => {
    if (mostrarLoading) setLoading(true);
    const { data } = await supabase
      .from('paquetes')
      .select('*')
      .eq('cliente_email', email) 
      .order('created_at', { ascending: false });
    
    if (data) setPaquetes(data);
    if (mostrarLoading) setLoading(false);
  };

  const guardarPerfil = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('perfiles').update({ nombre: perfil.nombre, telefono: perfil.telefono }).eq('id', usuario.id);
      if (error) throw error;
      toast.success("Perfil actualizado correctamente ✨");
      setModalPerfilOpen(false);
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };

  const calificarPaquete = async (paqueteId, estrellas) => {
    try {
      const { error } = await supabase.from('paquetes').update({ calificacion_servicio: estrellas }).eq('id', paqueteId);
      if (error) throw error;
      toast.success(`¡Gracias por las ${estrellas} estrellas! ⭐`);
      // Actualizar localmente rápido
      setPaquetes(prev => prev.map(p => p.id === paqueteId ? { ...p, calificacion_servicio: estrellas } : p));
    } catch (error) {
      toast.error("Error al calificar");
    }
  };

  const agregarPaqueteManual = async (e) => {
    e.preventDefault();
    if (!nuevoTracking) return toast.error("Escribe un número de guía");
    
    setLoadingTracking(true);
    try {
      const { data } = await supabase.from('paquetes').select('*').eq('tracking_id', nuevoTracking.trim().toUpperCase()).single();
      if (!data) toast.error("Guía no encontrada. Verifica el código.");
      else {
        if (paquetes.some(p => p.id === data.id)) {
            toast.error("Ya estás siguiendo este paquete");
        } else {
            setPaquetes(prev => [data, ...prev]);
            setNuevoTracking('');
            toast.success("Paquete vinculado exitosamente");
        }
      }
    } catch (err) { toast.error("Error al buscar"); } 
    finally { setLoadingTracking(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  // Filtros
  const paquetesActivos = paquetes.filter(p => ['recibido', 'en_bodega', 'en_ruta'].includes(p.estado));
  const paquetesHistorial = paquetes.filter(p => ['entregado', 'incidencia'].includes(p.estado));
  const listaMostrar = tabActiva === 'activos' ? paquetesActivos : paquetesHistorial;

  const getEstadoInfo = (estado) => {
    switch(estado) {
      case 'entregado': return { color: 'bg-green-500', texto: 'Entregado', icon: <CheckCircle size={14}/>, progreso: 100, bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700' };
      case 'incidencia': return { color: 'bg-red-500', texto: 'Incidencia', icon: <AlertTriangle size={14}/>, progreso: 100, bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700' };
      case 'en_ruta': return { color: 'bg-blue-600 animate-pulse', texto: 'En Camino', icon: <Truck size={14}/>, progreso: 75, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' };
      case 'en_bodega': return { color: 'bg-orange-500', texto: 'En Bodega', icon: <Package size={14}/>, progreso: 50, bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700' };
      default: return { color: 'bg-gray-400', texto: 'Recibido', icon: <Clock size={14}/>, progreso: 20, bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-600' };
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100">
      
      {/* NAVBAR FLOTANTE */}
      <nav className="fixed w-full z-50 px-4 py-4 top-0">
        <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-xl border border-white/40 shadow-sm rounded-2xl px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-celeris-dark to-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-500/20">
                    <Truck size={20} />
                </div>
                <span className="text-lg font-bold text-gray-800 tracking-tight hidden sm:block">Celeris<span className="text-blue-600">Track</span></span>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setModalPerfilOpen(true)}
                    className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 px-4 py-2.5 rounded-xl transition-all border border-gray-200"
                >
                    <User size={16}/> 
                    <span className="max-w-[100px] truncate">{perfil.nombre || 'Mi Perfil'}</span>
                    {!perfil.telefono && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                </button>
                <button onClick={handleLogout} className="bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-100 p-2.5 rounded-xl transition-colors">
                    <LogOut size={18} />
                </button>
            </div>
        </div>
      </nav>

      {/* HERO SECTION DEGRADADO */}
      <div className="bg-celeris-dark pt-32 pb-32 px-6 relative overflow-hidden">
        {/* Decoraciones de fondo */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-4xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
             <div className="inline-flex items-center gap-2 bg-white/10 text-blue-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-6 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Sistema en línea
             </div>
             <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
                Hola, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">{perfil.nombre?.split(' ')[0] || 'Cliente'}</span>
             </h1>
             <p className={`text-sm md:text-base mb-8 max-w-md leading-relaxed ${perfil.telefono ? 'text-blue-100/80' : 'text-yellow-300 font-bold'}`}>
                {perfil.telefono 
                    ? 'Tu cuenta está verificada y lista para recibir paquetes.' 
                    : '⚠️ Acción requerida: Agrega tu teléfono para asegurar tus entregas.'}
             </p>
             
             {/* Buscador Manual */}
             <form onSubmit={agregarPaqueteManual} className="bg-white/5 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 flex gap-2 max-w-sm shadow-2xl transition-transform focus-within:scale-105">
                <div className="relative flex-1 group">
                   <Search className="absolute left-4 top-3.5 text-white/50 group-focus-within:text-white transition-colors" size={18}/>
                   <input 
                    type="text" 
                    value={nuevoTracking} 
                    onChange={(e) => setNuevoTracking(e.target.value.toUpperCase())} 
                    placeholder="Vincular Guía (Ej: TLX-...)" 
                    className="w-full pl-11 pr-4 py-3 bg-transparent text-white placeholder-white/30 outline-none font-bold uppercase text-sm"
                   />
                </div>
                <button type="submit" disabled={loadingTracking} className="bg-white text-celeris-dark px-5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg flex items-center gap-2">
                    {loadingTracking ? <div className="animate-spin w-4 h-4 border-2 border-celeris-dark border-t-transparent rounded-full"></div> : <Plus size={18}/>}
                </button>
             </form>
          </div>

          {/* Tarjeta Flotante (Decorativa) */}
          <div className="hidden md:block relative animate-in fade-in zoom-in-95 duration-1000 delay-200">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2rem] blur-xl opacity-30"></div>
             <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-[2rem] p-8 text-white relative shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <p className="text-xs font-bold text-blue-200 uppercase mb-1">Envíos Activos</p>
                        <p className="text-4xl font-black">{paquetesActivos.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                        <Package size={24}/>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full w-3/4 bg-blue-400"></div></div>
                    <div className="h-2 w-2/3 bg-white/10 rounded-full overflow-hidden"><div className="h-full w-1/2 bg-purple-400"></div></div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="max-w-5xl mx-auto px-4 -mt-20 pb-20 relative z-20">
         
         {/* TABS DE NAVEGACIÓN */}
         <div className="flex justify-center mb-8">
            <div className="bg-white p-1.5 rounded-2xl shadow-xl border border-gray-100 flex gap-1">
                <button 
                    onClick={() => setTabActiva('activos')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tabActiva === 'activos' ? 'bg-celeris-dark text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    En Curso ({paquetesActivos.length})
                </button>
                <button 
                    onClick={() => setTabActiva('historial')}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tabActiva === 'historial' ? 'bg-celeris-dark text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Historial ({paquetesHistorial.length})
                </button>
            </div>
         </div>

         {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin w-10 h-10 border-4 border-celeris-main border-t-transparent rounded-full mb-4"></div>
                <p className="text-gray-400 font-medium">Sincronizando envíos...</p>
            </div>
         ) : listaMostrar.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-12 text-center border border-dashed border-gray-300 shadow-sm animate-in zoom-in-95">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Package className="text-gray-300" size={40}/>
               </div>
               <h3 className="text-xl font-bold text-gray-800 mb-2">
                   {tabActiva === 'activos' ? 'Todo entregado' : 'Historial vacío'}
               </h3>
               <p className="text-gray-500 font-medium max-w-xs mx-auto">
                   {tabActiva === 'activos' 
                    ? 'No tienes paquetes pendientes. ¡Relájate!' 
                    : 'Aquí aparecerán tus envíos pasados.'}
               </p>
            </div>
         ) : (
            <div className="space-y-6">
               {listaMostrar.map((p) => {
                  const estado = getEstadoInfo(p.estado);
                  return (
                     <div key={p.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-5 group">
                        
                        {/* HEADER DE LA TARJETA */}
                        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-gradient-to-r from-gray-50/50 to-white">
                           <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center shadow-sm text-celeris-main group-hover:scale-110 transition-transform">
                                   <Package size={24}/>
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <h3 className="text-xl font-black text-gray-900 tracking-tight">{p.tracking_id}</h3>
                                     <ArrowUpRight size={16} className="text-gray-300"/>
                                  </div>
                                  <p className="text-sm text-gray-500 font-medium">{p.descripcion}</p>
                               </div>
                           </div>
                           <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${estado.bg} ${estado.border}`}>
                               <span className={estado.text}>{estado.icon}</span>
                               <span className={`text-xs font-bold uppercase tracking-wide ${estado.text}`}>{estado.texto}</span>
                           </div>
                        </div>
                        
                        {/* CUERPO DE LA TARJETA */}
                        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">
                           
                           {/* Columna Izquierda: Progreso y Detalles */}
                           <div className="lg:col-span-2 space-y-8">
                               {/* Barra de Progreso */}
                               <div className="relative">
                                   <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">
                                       <span>Recibido</span>
                                       <span className={p.estado === 'en_ruta' ? 'text-blue-600' : ''}>En Camino</span>
                                       <span className={p.estado === 'entregado' ? 'text-green-600' : ''}>Entregado</span>
                                   </div>
                                   <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                       <div 
                                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${estado.color}`} 
                                        style={{width: `${estado.progreso}%`}}
                                       ></div>
                                   </div>
                               </div>
                               
                               {/* Info Adicional */}
                               <div className="flex flex-wrap gap-4">
                                   <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
                                       <MapPin size={16} className="text-gray-400"/>
                                       <span className="text-xs text-gray-500 font-bold uppercase">Destino:</span>
                                       <span className="text-sm font-bold text-gray-800">{p.destino}</span>
                                   </div>
                                   <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
                                       <Clock size={16} className="text-gray-400"/>
                                       <span className="text-xs text-gray-500 font-bold uppercase">Fecha:</span>
                                       <span className="text-sm font-bold text-gray-800">{new Date(p.created_at).toLocaleDateString()}</span>
                                   </div>
                               </div>

                               {/* SECCIÓN DE CALIFICACIÓN (Solo aparece si se entregó) */}
                               {p.estado === 'entregado' && (
                                 <div className="mt-4 bg-yellow-50/50 border border-yellow-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-yellow-100 p-2 rounded-full text-yellow-600"><Star size={20} fill="currentColor"/></div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Califica la entrega</p>
                                            <p className="text-xs text-gray-500">¿Qué te pareció el servicio?</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button 
                                            key={star} 
                                            disabled={p.calificacion_servicio > 0} 
                                            onClick={() => calificarPaquete(p.id, star)} 
                                            className={`p-2 rounded-lg transition-all hover:scale-110 focus:outline-none ${
                                                (p.calificacion_servicio || 0) >= star 
                                                ? 'text-yellow-400 bg-yellow-50' 
                                                : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-50'
                                            }`}
                                        >
                                           <Star size={24} fill={(p.calificacion_servicio || 0) >= star ? "currentColor" : "none"} />
                                        </button>
                                      ))}
                                    </div>
                                 </div>
                               )}
                           </div>

                           {/* Columna Derecha: Código o Estado Final */}
                           <div className="lg:col-span-1">
                              {p.estado === 'entregado' ? (
                                 <div className="h-full flex flex-col items-center justify-center p-6 bg-green-50 rounded-3xl border border-green-100 text-center">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-green-500 shadow-sm mb-3">
                                        <CheckCircle size={32} fill="currentColor" className="text-green-100"/>
                                    </div>
                                    <p className="font-bold text-green-800 text-lg">¡Entregado!</p>
                                    <p className="text-xs text-green-600 mt-1">Gracias por usar Celeris.</p>
                                 </div>
                              ) : p.estado === 'incidencia' ? (
                                 <div className="h-full flex flex-col items-center justify-center p-6 bg-red-50 rounded-3xl border border-red-100 text-center">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm mb-3">
                                        <AlertTriangle size={32}/>
                                    </div>
                                    <p className="font-bold text-red-800 text-lg">Hubo un problema</p>
                                    <p className="text-xs text-red-600 mt-1 bg-white/50 px-2 py-1 rounded">{p.incidencia_nota || 'Contacta a soporte'}</p>
                                 </div>
                              ) : (
                                 <div className="bg-gray-900 p-6 rounded-3xl text-center shadow-2xl relative overflow-hidden group h-full flex flex-col justify-center">
                                    {/* Efecto de brillo tarjeta */}
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/30 rounded-full blur-2xl"></div>
                                    
                                    <div className="flex items-center justify-center gap-2 mb-4 opacity-70">
                                       <KeyRound size={14}/> 
                                       <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Código Seguro</span>
                                    </div>
                                    
                                    <div className="bg-white/10 backdrop-blur-md rounded-2xl py-4 border border-white/10 mb-4 transform group-hover:scale-105 transition-transform">
                                       <span className="text-4xl font-mono font-black tracking-[0.15em] text-white shadow-sm">
                                           {p.codigo_seguridad || '----'}
                                       </span>
                                    </div>
                                    
                                    <p className="text-[10px] text-gray-400 font-medium">Muestra este código al conductor <br/>para autorizar la entrega.</p>
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

      {/* BOTÓN FLOTANTE AYUDA */}
      <button className="fixed bottom-6 right-6 bg-white text-celeris-main p-4 rounded-full shadow-2xl border border-blue-50 hover:scale-110 transition-transform z-40 group">
         <HelpCircle size={24}/>
         <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">¿Necesitas ayuda?</span>
      </button>

      {/* MODAL PERFIL */}
      {modalPerfilOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-sm relative animate-in zoom-in-95 duration-300">
              <button onClick={() => setModalPerfilOpen(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={20}/></button>
              
              <div className="text-center mb-8">
                 <div className="w-20 h-20 bg-blue-50 text-celeris-main rounded-full flex items-center justify-center mx-auto mb-4 border-[6px] border-white shadow-xl">
                    <User size={36}/>
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900">Tu Perfil</h3>
                 <p className="text-sm text-gray-500">Actualiza tus datos de contacto.</p>
              </div>

              <form onSubmit={guardarPerfil} className="space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nombre Completo</label>
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 text-gray-400" size={18}/>
                        <input type="text" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-celeris-main focus:bg-white transition-all font-semibold text-gray-800" value={perfil.nombre || ''} onChange={(e) => setPerfil({...perfil, nombre: e.target.value})}/>
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Teléfono Móvil</label>
                    <div className="relative">
                        <Phone className="absolute left-4 top-3.5 text-gray-400" size={18}/>
                        <input type="tel" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-celeris-main focus:bg-white transition-all font-semibold text-gray-800" value={perfil.telefono || ''} onChange={(e) => setPerfil({...perfil, telefono: e.target.value})} placeholder="Ej: 55 1234 5678"/>
                    </div>
                    <p className="text-[10px] text-blue-500 font-medium ml-1">* Necesario para coordinar la entrega.</p>
                 </div>
                 <button type="submit" className="w-full py-4 bg-celeris-main text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 transform active:scale-95">
                    <Save size={20}/> Guardar Cambios
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};