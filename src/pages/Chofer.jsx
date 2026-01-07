import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, MapPin, CheckCircle, Navigation, PhoneCall, 
  AlertTriangle, LogOut, Package, User, KeyRound, 
  Coffee, Star, Zap, History, ArrowRight, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Chofer = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pendientes');
  const [misPaquetes, setMisPaquetes] = useState([]);
  const [paquetesHistorial, setPaquetesHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [perfilChofer, setPerfilChofer] = useState({
    nombre: 'Conductor',
    estado_actividad: 'activo',
    calificacion: 5.0
  });

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

    // 1. Perfil
    const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
    if (perfil) setPerfilChofer(perfil);

    // 2. Pendientes
    const { data: pendientes } = await supabase
      .from('paquetes')
      .select('*')
      .eq('chofer_id', user.id)
      .eq('estado', 'en_ruta');

    if (pendientes) {
      // Cruzar teléfonos
      const emails = pendientes.map(p => p.cliente_email).filter(Boolean);
      let mapaTelefonos = {};
      if (emails.length > 0) {
        const { data: perfiles } = await supabase.from('perfiles').select('email, telefono').in('email', emails);
        if (perfiles) perfiles.forEach(p => mapaTelefonos[p.email] = p.telefono);
      }
      const pendientesConTel = pendientes.map(p => ({ ...p, cliente_telefono: mapaTelefonos[p.cliente_email] || '' }));
      setMisPaquetes(pendientesConTel);
    }

    // 3. Historial
    const { data: historial } = await supabase
      .from('paquetes')
      .select('*')
      .eq('chofer_id', user.id)
      .neq('estado', 'en_ruta') // Trae todo lo que NO esté en ruta
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (historial) setPaquetesHistorial(historial);
  };

  // --- FUNCIÓN DE ENTREGA CORREGIDA Y VERIFICADA ---
  const verificarCodigoYEntregar = async () => {
    if (!inputCodigo || inputCodigo.length < 4) return toast.error("Faltan dígitos");
    
    const paqueteId = modalEntrega;
    const paquete = misPaquetes.find(p => p.id === paqueteId);
    
    if (paquete.codigo_seguridad && paquete.codigo_seguridad !== inputCodigo) {
      return toast.error("⛔️ Código Incorrecto");
    }

    setLoading(true);
    try {
        console.log("Intentando actualizar ID:", paqueteId);

        // 1. Actualizar en Supabase Y PEDIR CONFIRMACIÓN (.select)
        const { data, error } = await supabase
            .from('paquetes')
            .update({ estado: 'entregado' })
            .eq('id', paqueteId)
            .select(); // <--- IMPORTANTE: Esto confirma si se hizo el cambio

        if (error) {
            console.error("Error SQL:", error);
            throw new Error("Error de permisos en BD");
        }

        if (!data || data.length === 0) {
            console.error("No se actualizó ninguna fila. Revisa RLS policies.");
            throw new Error("No se pudo actualizar. ¿Tienes permisos?");
        }

        // 2. Si llegamos aquí, SÍ se guardó en la BD. Actualizamos la App.
        const paqueteActualizado = { ...paquete, estado: 'entregado' };
        setMisPaquetes(prev => prev.filter(p => p.id !== paqueteId));
        setPaquetesHistorial(prev => [paqueteActualizado, ...prev]);

        toast.success("¡Entrega Registrada en Base de Datos! 💾");
        cerrarModales();

    } catch (error) {
        toast.error(error.message);
    } finally {
        setLoading(false);
    }
  };

  const reportarIncidencia = async () => {
    if (!motivoIncidencia) return toast.error("Escribe el motivo");
    const paqueteId = modalIncidencia;
    const paquete = misPaquetes.find(p => p.id === paqueteId);

    setLoading(true);
    try {
        const { error } = await supabase.from('paquetes').update({ estado: 'incidencia', incidencia_nota: motivoIncidencia }).eq('id', paqueteId);
        if (error) throw error;

        setMisPaquetes(prev => prev.filter(p => p.id !== paqueteId));
        setPaquetesHistorial(prev => [{ ...paquete, estado: 'incidencia', incidencia_nota: motivoIncidencia }, ...prev]);

        toast("Incidencia reportada", { icon: '⚠️' });
        cerrarModales();
    } catch (err) {
        toast.error("Error al guardar");
    } finally {
        setLoading(false);
    }
  };

  const toggleEstado = async () => {
    const nuevoEstado = perfilChofer.estado_actividad === 'activo' ? 'descanso' : 'activo';
    setPerfilChofer(prev => ({ ...prev, estado_actividad: nuevoEstado }));
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('perfiles').update({ estado_actividad: nuevoEstado }).eq('id', user.id);
    if(nuevoEstado === 'descanso') toast("Modo Descanso 💤");
    else toast.success("En Turno ⚡️");
  };

  const abrirRuta = (origen, destino) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origen + ", Tlaxcala")}&destination=${encodeURIComponent(destino + ", Tlaxcala")}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const llamarCliente = (telefono) => {
    if (!telefono) return toast.error("Sin teléfono registrado");
    window.location.href = `tel:${telefono}`;
  };

  const cerrarModales = () => { setModalEntrega(null); setModalIncidencia(null); setInputCodigo(''); setMotivoIncidencia(''); };
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  const totalDia = misPaquetes.length + paquetesHistorial.length;
  const completados = paquetesHistorial.filter(p => p.estado === 'entregado').length;
  const porcentaje = totalDia === 0 ? 0 : Math.round((completados / totalDia) * 100);

  return (
    <div className={`min-h-screen font-sans transition-colors ${perfilChofer.estado_actividad === 'descanso' ? 'bg-gray-800' : 'bg-[#F0F2F5]'}`}>
      
      {/* HEADER DINÁMICO */}
      <div className={`${perfilChofer.estado_actividad === 'descanso' ? 'bg-gray-900' : 'bg-celeris-dark'} text-white rounded-b-[2.5rem] shadow-xl relative z-20 transition-all duration-500 overflow-hidden`}>
        <div className="px-6 pt-6 pb-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 text-xl font-bold">
                            {perfilChofer.nombre.charAt(0)}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-celeris-dark ${perfilChofer.estado_actividad === 'activo' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">{perfilChofer.nombre.split(' ')[0]}</h1>
                        <div className="flex items-center gap-1 text-yellow-400 bg-white/10 px-2 py-0.5 rounded-lg w-fit mt-1">
                            <Star size={12} fill="currentColor"/>
                            <span className="text-xs font-bold">{perfilChofer.calificacion || 5.0}</span>
                        </div>
                    </div>
                </div>
                <button onClick={handleLogout} className="bg-white/10 p-3 rounded-full hover:bg-red-500/30 transition-colors"><LogOut size={20}/></button>
            </div>

            {/* BARRA DE PROGRESO */}
            <div className="bg-black/20 rounded-2xl p-4 mb-6 backdrop-blur-sm border border-white/5">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">
                    <span>Progreso Diario</span>
                    <span>{porcentaje}%</span>
                </div>
                <div className="h-3 w-full bg-black/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-green-300 transition-all duration-1000" style={{width: `${porcentaje}%`}}></div>
                </div>
                <div className="mt-2 text-right text-xs text-white/60 font-medium">
                    {completados} entregados de {totalDia}
                </div>
            </div>

            {/* SWITCH ESTADO */}
            <div className="flex bg-black/20 p-1 rounded-xl">
                <button onClick={() => perfilChofer.estado_actividad === 'descanso' && toggleEstado()} className={`flex-1 py-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${perfilChofer.estado_actividad === 'activo' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-400'}`}><Zap size={16}/> ACTIVO</button>
                <button onClick={() => perfilChofer.estado_actividad === 'activo' && toggleEstado()} className={`flex-1 py-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${perfilChofer.estado_actividad === 'descanso' ? 'bg-yellow-500 text-white shadow-lg' : 'text-gray-400'}`}><Coffee size={16}/> DESCANSO</button>
            </div>
        </div>
      </div>

      {/* CONTENIDO SCROLLABLE */}
      <div className="px-4 -mt-4 relative z-30 pb-20">
        
        {/* TABS GRANDES */}
        <div className="bg-white p-1.5 rounded-2xl shadow-lg border border-gray-100 flex gap-2 mb-6">
            <button 
                onClick={() => setActiveTab('pendientes')} 
                className={`flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'pendientes' ? 'bg-celeris-dark text-white shadow-md ring-2 ring-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                <Truck size={18}/> 
                <span className="text-sm font-black uppercase">En Ruta</span>
                {misPaquetes.length > 0 && <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] ml-1">{misPaquetes.length}</span>}
            </button>

            <button 
                onClick={() => setActiveTab('historial')} 
                className={`flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'historial' ? 'bg-green-600 text-white shadow-md ring-2 ring-green-100' : 'text-gray-400 hover:bg-gray-50'}`}
            >
                <History size={18}/>
                <span className="text-sm font-black uppercase">Finalizados</span>
            </button>
        </div>

        {/* --- LISTA PENDIENTES --- */}
        {activeTab === 'pendientes' && (
            misPaquetes.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-16 opacity-60">
                  <CheckCircle size={60} className="text-green-500 mb-4"/>
                  <h3 className="text-xl font-bold text-gray-600">Todo limpio</h3>
                  <p className="text-sm text-gray-400">No hay paquetes en ruta.</p>
               </div>
            ) : (
               <div className="space-y-5">
                   {misPaquetes.map((p, index) => (
                      <div key={p.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden animate-in slide-in-from-bottom-5">
                         {/* Indicador Lateral */}
                         <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>

                         <div className="flex justify-between items-start mb-4 pl-3">
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Parada #{index + 1}</span>
                            <span className="text-xs font-mono text-gray-400 font-bold">{p.tracking_id}</span>
                         </div>
                         
                         <div className="pl-3 mb-6">
                             <h3 className="text-xl font-black text-gray-800 leading-tight mb-2">{p.cliente_nombre}</h3>
                             <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                <p className="text-xs text-gray-500 font-medium">{p.origen}</p>
                             </div>
                             <div onClick={() => abrirRuta(p.origen, p.destino)} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2 active:bg-blue-50 transition-colors">
                                <MapPin size={20} className="text-red-500"/>
                                <p className="text-sm font-bold text-gray-800 leading-tight">{p.destino}</p>
                                <ChevronRight size={16} className="text-gray-300 ml-auto"/>
                             </div>
                         </div>

                         <div className="grid grid-cols-4 gap-2 pl-3">
                            <button onClick={() => abrirRuta(p.origen, p.destino)} className="col-span-1 bg-white border border-gray-200 text-gray-600 rounded-xl flex flex-col items-center justify-center p-2 active:scale-95 transition-transform shadow-sm">
                               <Navigation size={20} className="text-blue-500 mb-1"/>
                               <span className="text-[9px] font-bold">GPS</span>
                            </button>
                            
                            <button onClick={() => llamarCliente(p.cliente_telefono)} className="col-span-1 bg-white border border-gray-200 text-gray-600 rounded-xl flex flex-col items-center justify-center p-2 active:scale-95 transition-transform shadow-sm">
                               <PhoneCall size={20} className="text-green-500 mb-1"/>
                               <span className="text-[9px] font-bold">LLAMAR</span>
                            </button>

                            <button onClick={() => setModalEntrega(p.id)} className="col-span-2 bg-gray-900 text-white rounded-xl flex items-center justify-center gap-2 font-black text-sm shadow-xl active:scale-95 transition-transform">
                               ENTREGAR <ArrowRight size={16}/>
                            </button>
                         </div>
                         
                         <button onClick={() => setModalIncidencia(p.id)} className="w-full mt-4 text-center text-xs font-bold text-red-400 hover:text-red-600 flex items-center justify-center gap-1 py-2">
                            <AlertTriangle size={12}/> Reportar Problema
                         </button>
                      </div>
                   ))}
               </div>
            )
        )}

        {/* --- LISTA HISTORIAL --- */}
        {activeTab === 'historial' && (
             <div className="space-y-3 animate-in fade-in">
                 {paquetesHistorial.length === 0 ? (
                     <p className="text-center text-gray-400 py-10 font-medium">Historial vacío.</p>
                 ) : (
                     paquetesHistorial.map(p => (
                        <div key={p.id} className="bg-white rounded-2xl p-4 flex justify-between items-center border border-gray-100 shadow-sm opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${p.estado === 'entregado' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                  {p.estado === 'entregado' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                              </div>
                              <div>
                                  <p className="font-bold text-gray-800 text-sm">{p.cliente_nombre}</p>
                                  <p className="text-[10px] text-gray-400 font-mono">{p.tracking_id}</p>
                              </div>
                           </div>
                           <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${p.estado === 'entregado' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                               {p.estado}
                           </span>
                        </div>
                     ))
                 )}
             </div>
        )}
      </div>

      {/* MODAL ENTREGA */}
      {modalEntrega && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 mb-4 shadow-2xl relative animate-in slide-in-from-bottom-10">
              <button onClick={cerrarModales} className="absolute top-6 right-6 bg-gray-100 p-2 rounded-full text-gray-500"><ChevronRight className="rotate-90" size={20}/></button>
              
              <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-50 text-celeris-main rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg"><KeyRound size={32}/></div>
                  <h3 className="font-black text-2xl text-gray-900 mb-1">Confirmar Entrega</h3>
                  <p className="text-gray-500 text-sm">Código de 4 dígitos del cliente</p>
              </div>
              
              <input type="tel" maxLength={4} className="w-full text-center text-5xl font-black tracking-[0.5em] py-4 bg-gray-50 rounded-2xl outline-none text-gray-800 placeholder-gray-200 border-2 border-transparent focus:border-celeris-main focus:bg-white transition-all mb-8" placeholder="••••" value={inputCodigo} onChange={e=>setInputCodigo(e.target.value)} autoFocus/>
              
              <button onClick={verificarCodigoYEntregar} disabled={loading} className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3">
                 {loading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <>CONFIRMAR <CheckCircle size={20}/></>}
              </button>
           </div>
        </div>
      )}

      {/* MODAL INCIDENCIA */}
      {modalIncidencia && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 mb-4 border-t-8 border-red-500 animate-in slide-in-from-bottom-10">
              <h3 className="font-bold text-2xl mb-2 text-gray-900">Reportar Problema</h3>
              <p className="text-sm text-gray-500 mb-6">¿Por qué no se pudo entregar?</p>
              <textarea className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none h-32 mb-6 text-gray-800 resize-none font-medium focus:border-red-300 focus:bg-white transition-all" placeholder="Ej: Dirección incorrecta..." value={motivoIncidencia} onChange={e=>setMotivoIncidencia(e.target.value)}></textarea>
              <div className="flex gap-3">
                  <button onClick={cerrarModales} className="flex-1 py-4 bg-gray-100 font-bold rounded-xl text-gray-500">Cancelar</button>
                  <button onClick={reportarIncidencia} disabled={loading} className="flex-1 py-4 bg-red-500 font-bold rounded-xl text-white shadow-lg">{loading ? '...' : 'Enviar'}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};