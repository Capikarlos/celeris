import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, MapPin, CheckCircle, Navigation, Phone, 
  AlertTriangle, LogOut, Package, User, KeyRound, 
  Coffee, Star, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Chofer = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pendientes');
  const [misPaquetes, setMisPaquetes] = useState([]);
  const [paquetesHistorial, setPaquetesHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Datos del Chofer
  const [perfilChofer, setPerfilChofer] = useState({
    nombre: 'Conductor',
    estado_actividad: 'activo', // activo | descanso
    calificacion: 5.0
  });

  // Modales
  const [modalEntrega, setModalEntrega] = useState(null);
  const [modalIncidencia, setModalIncidencia] = useState(null);
  const [inputCodigo, setInputCodigo] = useState('');
  const [motivoIncidencia, setMotivoIncidencia] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Cargar Perfil (Estado y Estrellas)
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('nombre, estado_actividad, calificacion')
      .eq('id', user.id)
      .single();
    
    if (perfil) setPerfilChofer(perfil);

    // 2. Cargar Paquetes
    const { data: pendientes } = await supabase
      .from('paquetes')
      .select('*')
      .eq('chofer_id', user.id)
      .eq('estado', 'en_ruta')
      .order('created_at', { ascending: true });
    if (pendientes) setMisPaquetes(pendientes);

    const { data: historial } = await supabase
      .from('paquetes')
      .select('*')
      .eq('chofer_id', user.id)
      .in('estado', ['entregado', 'incidencia'])
      .order('created_at', { ascending: false })
      .limit(20);
    if (historial) setPaquetesHistorial(historial);
  };

  // --- CAMBIAR ESTADO (Descanso / Activo) ---
  const toggleEstado = async () => {
    const nuevoEstado = perfilChofer.estado_actividad === 'activo' ? 'descanso' : 'activo';
    
    // Actualizamos visualmente rápido
    setPerfilChofer(prev => ({ ...prev, estado_actividad: nuevoEstado }));

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('perfiles').update({ estado_actividad: nuevoEstado }).eq('id', user.id);
    
    if(nuevoEstado === 'descanso') toast("Modo Descanso activado ☕️");
    else toast.success("¡De vuelta al trabajo! ⚡️");
  };

  const verificarCodigoYEntregar = async () => {
    if (!inputCodigo || inputCodigo.length < 4) return toast.error("Faltan dígitos");
    
    const paquete = misPaquetes.find(p => p.id === modalEntrega);
    
    if (paquete.codigo_seguridad && paquete.codigo_seguridad !== inputCodigo) {
      toast.error("⛔️ Código INCORRECTO");
      return;
    }

    await actualizarEstado(modalEntrega, 'entregado');
    cerrarModales();
    toast.success("¡Entrega Exitosa! +1 ⭐");
  };

  // --- REPORTAR INCIDENCIA (AHORA SÍ GUARDA) ---
  const reportarIncidencia = async () => {
    if (!motivoIncidencia) return toast.error("Escribe el motivo");
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('paquetes')
        .update({ 
          estado: 'incidencia',
          incidencia_nota: motivoIncidencia // <--- AQUÍ SE GUARDA EN LA BD
        })
        .eq('id', modalIncidencia);

      if (error) throw error;
      
      toast("Reporte guardado", { icon: '📝' });
      cerrarModales();
      cargarDatos();

    } catch (error) {
      toast.error("Error guardando reporte");
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstado = async (id, nuevoEstado) => {
    setLoading(true);
    const { error } = await supabase.from('paquetes').update({ estado: nuevoEstado }).eq('id', id);
    if (!error) cargarDatos();
    setLoading(false);
  };

  const cerrarModales = () => {
    setModalEntrega(null); setModalIncidencia(null);
    setInputCodigo(''); setMotivoIncidencia('');
  };

  const abrirMapa = (destino) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino + ", Tlaxcala")}`, '_blank');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Calcular progreso del día
  const totalDia = misPaquetes.length + paquetesHistorial.length;
  const completados = paquetesHistorial.filter(p => p.estado === 'entregado').length;
  const porcentaje = totalDia === 0 ? 0 : Math.round((completados / totalDia) * 100);

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors ${perfilChofer.estado_actividad === 'descanso' ? 'bg-gray-200' : 'bg-gray-100'}`}>
      
      {/* HEADER DE ESTADO */}
      <div className={`${perfilChofer.estado_actividad === 'descanso' ? 'bg-gray-800' : 'bg-celeris-dark'} text-white p-6 pb-24 rounded-b-[2.5rem] shadow-xl sticky top-0 z-40 transition-colors duration-500`}>
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <User size={24}/>
              </div>
              {/* Indicador de Estado (Bolita) */}
              <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-celeris-dark ${perfilChofer.estado_actividad === 'activo' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">{perfilChofer.nombre.split(' ')[0]}</h1>
              <div className="flex items-center gap-1 text-yellow-400 mt-1">
                <Star size={12} fill="currentColor"/>
                <span className="text-sm font-bold">{perfilChofer.calificacion}</span>
              </div>
            </div>
          </div>
          
          <button onClick={handleLogout} className="bg-white/10 p-2 rounded-full hover:bg-red-500/50 transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        {/* SWITCH DE DESCANSO (Inspirado en Lovable) */}
        <div className="flex justify-between items-center bg-black/20 p-1.5 rounded-full mb-6 backdrop-blur-md">
           <button 
             onClick={() => perfilChofer.estado_actividad === 'descanso' && toggleEstado()}
             className={`flex-1 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all ${perfilChofer.estado_actividad === 'activo' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-400'}`}
           >
             <Zap size={14}/> EN TURNO
           </button>
           <button 
             onClick={() => perfilChofer.estado_actividad === 'activo' && toggleEstado()}
             className={`flex-1 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all ${perfilChofer.estado_actividad === 'descanso' ? 'bg-yellow-500 text-white shadow-lg' : 'text-gray-400'}`}
           >
             <Coffee size={14}/> DESCANSO
           </button>
        </div>

        {/* Tarjeta de Progreso Diario */}
        <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm relative overflow-hidden">
          <div className="flex justify-between items-end mb-2 relative z-10">
            <div>
               <p className="text-xs text-blue-200 font-bold uppercase">Eficiencia Hoy</p>
               <p className="text-2xl font-black">{completados}/{totalDia} <span className="text-sm font-medium opacity-70">Entregas</span></p>
            </div>
            <span className="text-3xl font-black opacity-20">{porcentaje}%</span>
          </div>
          {/* Barra de progreso */}
          <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden relative z-10">
             <div className="h-full bg-green-400 transition-all duration-1000" style={{width: `${porcentaje}%`}}></div>
          </div>
        </div>

      </div>

      {/* CONTENIDO PRINCIPAL (Si está en descanso, bloqueamos la vista) */}
      {perfilChofer.estado_actividad === 'descanso' ? (
        <div className="flex flex-col items-center justify-center pt-20 px-10 text-center opacity-60">
           <Coffee size={80} className="mb-4 text-gray-400"/>
           <h2 className="text-2xl font-bold text-gray-600">En hora de descanso</h2>
           <p className="text-gray-500">Tu ubicación está pausada. Vuelve a activar tu estado para ver la ruta.</p>
           <button onClick={toggleEstado} className="mt-8 bg-gray-800 text-white px-8 py-3 rounded-xl font-bold">Volver al Trabajo</button>
        </div>
      ) : (
        <div className="px-4 -mt-10 relative z-50 space-y-4">
          
          {/* TABS SIMPLES */}
          <div className="flex gap-4 px-2 mb-2">
            <button onClick={() => setActiveTab('pendientes')} className={`text-sm font-bold pb-1 border-b-2 transition-all ${activeTab === 'pendientes' ? 'text-celeris-dark border-celeris-dark' : 'text-gray-400 border-transparent'}`}>
              Pendientes ({misPaquetes.length})
            </button>
            <button onClick={() => setActiveTab('historial')} className={`text-sm font-bold pb-1 border-b-2 transition-all ${activeTab === 'historial' ? 'text-celeris-dark border-celeris-dark' : 'text-gray-400 border-transparent'}`}>
              Finalizados ({paquetesHistorial.length})
            </button>
          </div>

          {activeTab === 'pendientes' && (
            misPaquetes.length === 0 ? (
               <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
                  <CheckCircle size={50} className="mx-auto text-green-500 mb-2"/>
                  <h3 className="font-bold text-gray-800">¡Todo entregado!</h3>
                  <p className="text-sm text-gray-400">Excelente trabajo hoy.</p>
               </div>
            ) : (
               misPaquetes.map((p, index) => (
                  <div key={p.id} className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                     <div className="flex justify-between items-start mb-2">
                        <span className="bg-blue-50 text-celeris-main text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                           Parada {index + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-400">{p.tracking_id}</span>
                     </div>
                     
                     <h3 className="text-xl font-bold text-gray-800 leading-tight mb-1">{p.cliente_nombre}</h3>
                     <p className="text-sm text-gray-500 flex items-center gap-1 mb-4">
                        <MapPin size={14} className="text-red-500"/> {p.destino}
                     </p>

                     <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => abrirMapa(p.destino)} className="col-span-1 bg-gray-50 text-gray-600 rounded-xl flex flex-col items-center justify-center p-2 active:scale-95 transition-transform">
                           <Navigation size={20}/>
                           <span className="text-[9px] font-bold mt-1">MAPA</span>
                        </button>
                        <button onClick={() => setModalEntrega(p.id)} className="col-span-3 bg-gray-900 text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-gray-200 active:scale-95 transition-transform">
                           <KeyRound size={18}/>
                           ENTREGAR
                        </button>
                     </div>
                     
                     <button onClick={() => setModalIncidencia(p.id)} className="w-full mt-3 text-center text-xs font-bold text-red-400 hover:text-red-600 py-2">
                        Reportar Problema
                     </button>
                  </div>
               ))
            )
          )}

          {activeTab === 'historial' && (
             paquetesHistorial.map(p => (
                <div key={p.id} className="bg-white rounded-2xl p-4 flex justify-between items-center border border-gray-100 opacity-80">
                   <div>
                      <p className="font-bold text-gray-800">{p.cliente_nombre}</p>
                      <p className="text-xs text-gray-400">{p.tracking_id}</p>
                   </div>
                   <span className={`text-xs font-bold px-2 py-1 rounded-lg ${p.estado === 'entregado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.estado === 'entregado' ? 'ENTREGADO' : 'FALLIDO'}
                   </span>
                </div>
             ))
          )}

        </div>
      )}

      {/* --- MODALES (Código e Incidencia) --- */}
      {/* (El código de los modales es igual al anterior, pero asegura que 'reportarIncidencia' use la nueva lógica de Supabase) */}
      
      {modalEntrega && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 mb-4 animate-in slide-in-from-bottom-10">
              <h3 className="text-center font-bold text-xl mb-6">Código de Entrega</h3>
              <input type="tel" maxLength={4} className="w-full text-center text-4xl font-black tracking-[0.5em] py-4 border-b-2 border-gray-200 outline-none mb-8" placeholder="0000" value={inputCodigo} onChange={e=>setInputCodigo(e.target.value)} autoFocus/>
              <div className="flex gap-3">
                 <button onClick={cerrarModales} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl text-gray-500">Cancelar</button>
                 <button onClick={verificarCodigoYEntregar} className="flex-1 py-3 bg-celeris-main font-bold rounded-xl text-white shadow-lg">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      {modalIncidencia && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 mb-4 border-t-4 border-red-500 animate-in slide-in-from-bottom-10">
              <h3 className="font-bold text-xl mb-2 text-red-500">Reportar Problema</h3>
              <p className="text-sm text-gray-500 mb-4">Este reporte se guardará en el historial.</p>
              <textarea className="w-full p-3 bg-gray-50 border rounded-xl outline-none h-24 mb-4" placeholder="Describe qué pasó..." value={motivoIncidencia} onChange={e=>setMotivoIncidencia(e.target.value)}></textarea>
              <button onClick={reportarIncidencia} className="w-full py-3 bg-red-500 font-bold rounded-xl text-white shadow-lg shadow-red-200">Guardar Reporte</button>
              <button onClick={cerrarModales} className="w-full py-3 mt-2 text-gray-400 font-bold">Cancelar</button>
           </div>
        </div>
      )}

    </div>
  );
};