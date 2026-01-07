import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, TrendingUp, AlertCircle, 
  Map as MapIcon, LogOut, DollarSign, Truck, Search,
  Filter, ChevronLeft, ChevronRight, MoreVertical, RefreshCw, Calendar
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

// Coordenadas base de tus destinos
const COORDENADAS = {
  'Tlaxcala Centro': [19.3182, -98.2375],
  'Apizaco': [19.4156, -98.1404],
  'Huamantla': [19.3130, -97.9234],
  'Chiautempan': [19.3114, -98.2144],
  'Calpulalpan': [19.5886, -98.5728]
};

export const Gerente = () => {
  const navigate = useNavigate();
  const [vista, setVista] = useState('dashboard'); 
  const [loading, setLoading] = useState(false);

  // Estados de Datos
  const [stats, setStats] = useState({ ingresos: 0, enviosHoy: 0, incidencias: 0, activos: 0 });
  const [choferes, setChoferes] = useState([]);
  const [todosLosPaquetes, setTodosLosPaquetes] = useState([]);
  const [paquetesMapa, setPaquetesMapa] = useState([]);
  const [dataGrafica, setDataGrafica] = useState([]); // Datos reales para la gráfica

  // Filtros Tablas
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 8;

  useEffect(() => {
    cargarTodo();
    // Auto-refresh cada 15 segundos para ver movimiento en mapa
    const intervalo = setInterval(cargarTodo, 15000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarTodo = async () => {
    setLoading(true);
    
    // 1. CARGA DE PAQUETES (HISTÓRICO COMPLETO)
    const { data: paquetes } = await supabase
      .from('paquetes')
      .select('*')
      .order('created_at', { ascending: false });

    if (paquetes) {
      setTodosLosPaquetes(paquetes);
      
      // --- CÁLCULO DE KPIs ---
      // Usamos fechas locales para que coincida con tu zona horaria
      const hoyString = new Date().toLocaleDateString();
      
      const paquetesHoy = paquetes.filter(p => new Date(p.created_at).toLocaleDateString() === hoyString);
      const enRuta = paquetes.filter(p => p.estado === 'en_ruta');
      
      setStats({
        ingresos: paquetesHoy.reduce((sum, p) => sum + (parseFloat(p.costo) || 0), 0),
        enviosHoy: paquetesHoy.length,
        incidencias: paquetes.filter(p => p.estado === 'incidencia').length,
        activos: enRuta.length
      });
      setPaquetesMapa(enRuta);

      // --- GENERACIÓN DE GRÁFICA REAL (Últimos 7 días) ---
      procesarDatosGrafica(paquetes);
    }

    // 2. CARGA DE PERSONAL (Con métricas reales)
    const { data: users } = await supabase.from('perfiles').select('*').eq('rol', 'chofer');
    if (users && paquetes) {
      const choferesConStats = users.map(c => {
        const susPaquetes = paquetes.filter(p => p.chofer_id === c.id);
        const entregados = susPaquetes.filter(p => p.estado === 'entregado').length;
        const total = susPaquetes.length;
        // Evitamos división por cero
        const eficiencia = total > 0 ? Math.round((entregados / total) * 100) : 0;
        
        return { ...c, entregados, total, eficiencia };
      });
      setChoferes(choferesConStats);
    }
    setLoading(false);
  };

  // Función Matemática para las Gráficas
  const procesarDatosGrafica = (paquetes) => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const datosUltimos7Dias = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaString = fecha.toLocaleDateString(); // "7/1/2026"
      const nombreDia = dias[fecha.getDay()];

      // Filtramos paquetes de ESE día específico
      const delDia = paquetes.filter(p => new Date(p.created_at).toLocaleDateString() === fechaString);
      
      datosUltimos7Dias.push({
        name: nombreDia, // Ej: "Mie"
        fecha: fechaString,
        ingresos: delDia.reduce((sum, p) => sum + (parseFloat(p.costo) || 0), 0),
        envios: delDia.length
      });
    }
    setDataGrafica(datosUltimos7Dias);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // --- LÓGICA DE TABLA ---
  const paquetesFiltrados = todosLosPaquetes.filter(p => 
    p.tracking_id.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.destino.toLowerCase().includes(busqueda.toLowerCase())
  );

  const indiceUltimo = paginaActual * itemsPorPagina;
  const indicePrimero = indiceUltimo - itemsPorPagina;
  const paquetesPaginados = paquetesFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(paquetesFiltrados.length / itemsPorPagina);

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* SIDEBAR (MENÚ LATERAL) */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col z-20 shadow-sm">
        <div className="p-6 flex items-center gap-3 mb-6">
          <div className="bg-celeris-main p-2 rounded-xl text-white shadow-lg shadow-blue-200">
             <TrendingUp size={22}/>
          </div>
          <span className="font-bold text-xl text-gray-800 tracking-tight">Celeris<span className="text-celeris-main">Manager</span></span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Principal</p>
          
          <button onClick={() => setVista('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${vista === 'dashboard' ? 'bg-blue-50 text-celeris-main shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          
          <button onClick={() => setVista('envios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${vista === 'envios' ? 'bg-blue-50 text-celeris-main shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Package size={18} /> Envíos
          </button>
          
          <button onClick={() => setVista('empleados')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${vista === 'empleados' ? 'bg-blue-50 text-celeris-main shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Users size={18} /> Personal
          </button>
          
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mt-6">Logística</p>
          
          <button onClick={() => setVista('mapa')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${vista === 'mapa' ? 'bg-blue-50 text-celeris-main shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
            <MapIcon size={18} /> Mapa en Vivo
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-100">
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 py-3 rounded-xl transition-colors text-sm font-bold">
             <LogOut size={18}/> Cerrar Sesión
           </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative bg-gray-50/50">
        
        {/* HEADER MÓVIL */}
        <div className="md:hidden mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
           <span className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp size={18} className="text-celeris-main"/> Celeris</span>
           <button onClick={() => setVista('dashboard')}><LayoutDashboard className="text-gray-600"/></button>
        </div>

        {/* --- VISTA: DASHBOARD --- */}
        {vista === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
               <div>
                 <h1 className="text-3xl font-bold text-gray-900">Resumen Operativo</h1>
                 <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                    <Calendar size={14}/> {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                 </p>
               </div>
               <button onClick={cargarTodo} className="flex items-center gap-2 text-sm font-bold text-celeris-main bg-white px-4 py-2 rounded-lg border border-blue-100 hover:shadow-md transition-all">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Actualizar Datos
               </button>
            </header>

            {/* KPIS REALES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                     <div className="bg-blue-50 p-3 rounded-xl text-celeris-main">
                        <DollarSign size={24}/>
                     </div>
                  </div>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight">${stats.ingresos.toLocaleString()}</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase mt-2">Ingresos de Hoy</p>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                     <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                        <Package size={24}/>
                     </div>
                  </div>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats.enviosHoy}</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase mt-2">Paquetes Hoy</p>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                     <div className="bg-yellow-50 p-3 rounded-xl text-yellow-600">
                        <Truck size={24}/>
                     </div>
                     <span className="animate-pulse w-2 h-2 rounded-full bg-yellow-500"></span>
                  </div>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats.activos}</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase mt-2">En Ruta (Mapa)</p>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                     <div className="bg-red-50 p-3 rounded-xl text-red-500">
                        <AlertCircle size={24}/>
                     </div>
                  </div>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight">{stats.incidencias}</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase mt-2">Incidencias Totales</p>
               </div>
            </div>

            {/* GRÁFICAS REALES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
               <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                  <div className="mb-6">
                    <h3 className="font-bold text-gray-800 text-lg">Ingresos Últimos 7 Días</h3>
                    <p className="text-xs text-gray-400">Datos extraídos directamente de la base de datos.</p>
                  </div>
                  <div className="flex-1">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dataGrafica}>
                           <defs>
                              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#0056D2" stopOpacity={0.1}/>
                                 <stop offset="95%" stopColor="#0056D2" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} dy={10}/>
                           <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} tickFormatter={(val)=>`$${val}`}/>
                           <Tooltip 
                              formatter={(value) => [`$${value}`, 'Ingresos']}
                              contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}
                           />
                           <Area type="monotone" dataKey="ingresos" stroke="#0056D2" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-6">Volumen de Envíos</h3>
                  <div className="flex-1">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataGrafica}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:10}}/>
                           <Tooltip cursor={{fill: 'transparent'}}/>
                           <Bar dataKey="envios" radius={[4, 4, 0, 0]}>
                              {dataGrafica.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={index === 6 ? '#0056D2' : '#e5e7eb'} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* --- VISTA: ENVÍOS (TABLA) --- */}
        {vista === 'envios' && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
             <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                   <h2 className="text-xl font-bold text-gray-800">Historial Global</h2>
                   <p className="text-sm text-gray-500">Base de datos completa de operaciones.</p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                   <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                      <input 
                        type="text" placeholder="Buscar guía, cliente..." 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-celeris-main"
                        value={busqueda} onChange={e => setBusqueda(e.target.value)}
                      />
                   </div>
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase font-bold">
                      <tr>
                         <th className="p-4 pl-6">Guía</th>
                         <th className="p-4">Cliente</th>
                         <th className="p-4">Ruta</th>
                         <th className="p-4">Fecha</th>
                         <th className="p-4">Estado</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50 text-sm">
                      {paquetesPaginados.map(p => (
                         <tr key={p.id} className="hover:bg-blue-50/20 transition-colors group">
                            <td className="p-4 pl-6 font-bold text-celeris-main">{p.tracking_id}</td>
                            <td className="p-4 font-medium text-gray-700">{p.cliente_nombre}</td>
                            <td className="p-4">
                              <div className="flex flex-col text-xs">
                                <span className="text-gray-400">{p.origen}</span>
                                <span className="font-bold text-gray-700">➔ {p.destino}</span>
                              </div>
                            </td>
                            <td className="p-4 text-gray-500 text-xs">
                              {new Date(p.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                               <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                  p.estado === 'entregado' ? 'bg-green-100 text-green-700' :
                                  p.estado === 'en_ruta' ? 'bg-blue-100 text-blue-700' :
                                  p.estado === 'incidencia' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                               }`}>
                                  {p.estado}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             <div className="p-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-500">Página {paginaActual} de {totalPaginas}</span>
                <div className="flex gap-2">
                   <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronLeft size={16}/></button>
                   <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"><ChevronRight size={16}/></button>
                </div>
             </div>
          </div>
        )}

        {/* --- VISTA: MAPA --- */}
        {vista === 'mapa' && (
           <div className="h-full flex flex-col animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-end mb-4">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">Torre de Control</h2>
                    <p className="text-gray-500">Solo se muestran paquetes ACTIVOS (En ruta).</p>
                 </div>
                 <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-sm font-bold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live
                 </div>
              </div>
              
              <div className="flex-1 bg-white p-2 rounded-3xl shadow-lg border border-gray-200 relative overflow-hidden h-[600px]">
                 {paquetesMapa.length === 0 && (
                    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/50 backdrop-blur-sm pointer-events-none">
                       <div className="bg-white p-4 rounded-xl shadow-xl text-center">
                          <p className="font-bold text-gray-600">No hay paquetes en ruta ahora mismo.</p>
                          <p className="text-xs text-gray-400">Despacha algo desde Bodega para verlo aquí.</p>
                       </div>
                    </div>
                 )}
                 <MapContainer center={[19.4156, -98.1404]} zoom={10} style={{ height: '100%', width: '100%', borderRadius: '1rem' }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap' />
                    {paquetesMapa.map(p => {
                       // Lógica para asignar coordenada según la ciudad de destino
                       const base = COORDENADAS[p.destino] || COORDENADAS['Tlaxcala Centro'];
                       // "Jitter" aleatorio para que si hay 2 paquetes a Apizaco no se encimen
                       const lat = base[0] + (Math.random() * 0.005 - 0.0025);
                       const lng = base[1] + (Math.random() * 0.005 - 0.0025);
                       return (
                          <Marker key={p.id} position={[lat, lng]}>
                             <Popup>
                                <div className="text-center">
                                   <strong className="text-celeris-main block">{p.tracking_id}</strong>
                                   <span className="text-xs text-gray-500">{p.cliente_nombre}</span>
                                   <hr className="my-1"/>
                                   <span className="text-xs font-bold text-gray-800">Destino: {p.destino}</span>
                                </div>
                             </Popup>
                          </Marker>
                       )
                    })}
                 </MapContainer>
              </div>
           </div>
        )}

        {/* --- VISTA: EMPLEADOS --- */}
        {vista === 'empleados' && (
           <div className="animate-in slide-in-from-bottom-5">
              <header className="mb-8 flex justify-between items-end">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800">Personal de Entrega</h2>
                    <p className="text-gray-500">Métricas de eficiencia en tiempo real.</p>
                 </div>
                 <button className="bg-celeris-main text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-blue-700 transition-colors">
                    + Contratar
                 </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {choferes.length === 0 ? (
                    <p className="text-gray-400 col-span-3 text-center py-10">No hay choferes registrados en la base de datos.</p>
                 ) : choferes.map(c => (
                    <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                       <div className={`absolute top-0 left-0 w-1 h-full ${c.estado_actividad === 'activo' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                       
                       <div className="flex justify-between items-start mb-6 pl-2">
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600 border-2 border-white shadow-sm uppercase">
                                {c.nombre.charAt(0)}
                             </div>
                             <div>
                                <h3 className="font-bold text-gray-800 truncate max-w-[120px]" title={c.nombre}>{c.nombre}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase">Chofer</p>
                             </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${c.estado_actividad === 'activo' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                             {c.estado_actividad || 'Offline'}
                          </span>
                       </div>

                       <div className="pl-2 space-y-4">
                          <div>
                             <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500 font-bold">Efectividad</span>
                                <span className="text-gray-900 font-black">{c.eficiencia}%</span>
                             </div>
                             <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-celeris-main rounded-full" style={{width: `${c.eficiencia}%`}}></div>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2">
                             <div className="bg-gray-50 p-3 rounded-xl text-center">
                                <span className="block text-2xl font-black text-gray-800">{c.entregados}</span>
                                <span className="text-[10px] uppercase text-gray-400 font-bold">Entregas</span>
                             </div>
                             <div className="bg-gray-50 p-3 rounded-xl text-center">
                                <span className="block text-2xl font-black text-gray-800 flex items-center justify-center gap-1">
                                   {c.calificacion || '5.0'} <span className="text-yellow-400 text-sm">★</span>
                                </span>
                                <span className="text-[10px] uppercase text-gray-400 font-bold">Rating</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

      </main>
    </div>
  );
};