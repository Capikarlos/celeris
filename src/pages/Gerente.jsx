import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, TrendingUp, AlertCircle, 
  Map as MapIcon, LogOut, DollarSign, Truck, Search,
  Briefcase, Phone, Star, Plus, X, Save, ChevronLeft, ChevronRight, 
  MoreVertical, Bell, User
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import toast from 'react-hot-toast';

// Coordenadas Tlaxcala
const COORDENADAS = {
  'Tlaxcala Centro': [19.3182, -98.2375],
  'Apizaco': [19.4156, -98.1404],
  'Huamantla': [19.3130, -97.9234],
  'Chiautempan': [19.3114, -98.2144],
  'Calpulalpan': [19.5886, -98.5728],
  'Zacatelco': [19.2197, -98.2393]
};

export const Gerente = () => {
  const navigate = useNavigate();
  const [vista, setVista] = useState('dashboard'); 
  const [loading, setLoading] = useState(false);
  const [usuarioNombre, setUsuarioNombre] = useState('Gerencia');

  // Datos
  const [stats, setStats] = useState({ ingresos: 0, enviosHoy: 0, incidencias: 0, activos: 0 });
  const [personal, setPersonal] = useState([]); 
  const [clientes, setClientes] = useState([]); 
  const [todosLosPaquetes, setTodosLosPaquetes] = useState([]);
  const [paquetesMapa, setPaquetesMapa] = useState([]);
  const [dataGrafica, setDataGrafica] = useState([]);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 8;

  // Modales
  const [modalEmpleadoOpen, setModalEmpleadoOpen] = useState(false);
  const [nuevoEmpleado, setNuevoEmpleado] = useState({ nombre: '', email: '', rol: 'chofer', telefono: '' });

  useEffect(() => {
    obtenerUsuario();
    cargarTodo();
    // Auto-refresh cada 15s
    const intervalo = setInterval(cargarTodo, 15000); 
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    setPaginaActual(1);
    setBusqueda('');
  }, [vista]);

  const obtenerUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data } = await supabase.from('perfiles').select('nombre').eq('id', user.id).single();
        if(data) setUsuarioNombre(data.nombre);
    }
  };

  const cargarTodo = async () => {
    // 1. Paquetes
    const { data: paquetes } = await supabase.from('paquetes').select('*').order('created_at', { ascending: false });

    if (paquetes) {
      setTodosLosPaquetes(paquetes);
      
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
      procesarDatosGrafica(paquetes);
    }

    // 2. Personal
    const { data: staff } = await supabase.from('perfiles').select('*').neq('rol', 'cliente').order('rol');
    if (staff && paquetes) {
      const staffConStats = staff.map(empleado => {
        if (empleado.rol === 'chofer') {
            const susPaquetes = paquetes.filter(p => p.chofer_id === empleado.id);
            const entregados = susPaquetes.filter(p => p.estado === 'entregado').length;
            const eficiencia = susPaquetes.length > 0 ? Math.round((entregados / susPaquetes.length) * 100) : 0;
            return { ...empleado, entregados, eficiencia };
        }
        return { ...empleado, entregados: 0, eficiencia: 0 };
      });
      setPersonal(staffConStats);
    }

    // 3. Clientes
    const { data: dataClientes } = await supabase.from('perfiles').select('*').eq('rol', 'cliente');
    if (dataClientes && paquetes) {
        const clientesConStats = dataClientes.map(c => ({
            ...c,
            totalEnvios: paquetes.filter(p => p.cliente_email === c.email).length
        }));
        setClientes(clientesConStats);
    }
  };

  const procesarDatosGrafica = (paquetes) => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const datos = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaString = fecha.toLocaleDateString();
      const delDia = paquetes.filter(p => new Date(p.created_at).toLocaleDateString() === fechaString);
      datos.push({
        name: dias[fecha.getDay()],
        ingresos: delDia.reduce((sum, p) => sum + (parseFloat(p.costo) || 0), 0),
        envios: delDia.length
      });
    }
    setDataGrafica(datos);
  };

  // --- REGISTRAR EMPLEADO ---
// --- REGISTRAR EMPLEADO (VERSIÓN FINAL) ---
  const registrarEmpleado = async (e) => {
    e.preventDefault();
    if(!nuevoEmpleado.email || !nuevoEmpleado.nombre) return toast.error("Faltan datos obligatorios");
    
    setLoading(true);
    try {
        // Generamos un ID manual desde la app para asegurar que no sea null
        const idManual = crypto.randomUUID(); 

        const { error } = await supabase.from('perfiles').insert([{
            id: idManual, // <--- ESTO ES CLAVE
            nombre: nuevoEmpleado.nombre,
            email: nuevoEmpleado.email,
            rol: nuevoEmpleado.rol,
            telefono: nuevoEmpleado.telefono,
            estado_actividad: 'activo',
            calificacion: 5.0
        }]);

        if (error) throw error;
        
        toast.success("Empleado registrado exitosamente 🎉");
        setModalEmpleadoOpen(false);
        setNuevoEmpleado({ nombre: '', email: '', rol: 'chofer', telefono: '' });
        
        // Recargar la lista
        cargarTodo();

    } catch (error) {
        console.error(error);
        toast.error("Error: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const obtenerPagina = (datosOrigen) => {
    if (!datosOrigen) return { datos: [], totalPaginas: 1 };
    const filtrados = datosOrigen.filter(item => JSON.stringify(item).toLowerCase().includes(busqueda.toLowerCase()));
    const indiceUltimo = paginaActual * itemsPorPagina;
    const indicePrimero = indiceUltimo - itemsPorPagina;
    return {
        datos: filtrados.slice(indicePrimero, indiceUltimo),
        totalPaginas: Math.ceil(filtrados.length / itemsPorPagina) || 1
    };
  };

  const getTituloVista = () => {
    switch(vista) {
        case 'dashboard': return 'Resumen Operativo';
        case 'envios': return 'Gestión de Envíos';
        case 'personal': return 'Recursos Humanos';
        case 'clientes': return 'Cartera de Clientes';
        case 'mapa': return 'Torre de Control';
        default: return 'Panel Gerente';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col z-20 shadow-sm">
        <div className="p-6 flex items-center gap-3 mb-2">
          <div className="bg-celeris-main p-2 rounded-xl text-white shadow-lg shadow-blue-200">
             <TrendingUp size={22}/>
          </div>
          <span className="font-bold text-xl text-gray-800 tracking-tight">Celeris<span className="text-celeris-main">Manager</span></span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4">
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Principal</p>
          <button onClick={() => setVista('dashboard')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-sm ${vista === 'dashboard' ? 'bg-blue-50 text-celeris-main' : 'text-gray-500 hover:bg-gray-50'}`}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mt-6">Gestión</p>
          <button onClick={() => setVista('envios')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-sm ${vista === 'envios' ? 'bg-blue-50 text-celeris-main' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Package size={18} /> Envíos
          </button>
          <button onClick={() => setVista('personal')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-sm ${vista === 'personal' ? 'bg-blue-50 text-celeris-main' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Users size={18} /> Personal
          </button>
          <button onClick={() => setVista('clientes')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-sm ${vista === 'clientes' ? 'bg-blue-50 text-celeris-main' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Briefcase size={18} /> Clientes
          </button>

          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mt-6">Operativa</p>
          <button onClick={() => setVista('mapa')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-sm ${vista === 'mapa' ? 'bg-blue-50 text-celeris-main' : 'text-gray-500 hover:bg-gray-50'}`}>
            <MapIcon size={18} /> Mapa en Vivo
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-bold">Celeris v1.0.5</p>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50 flex flex-col">
        
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30 flex justify-between items-center shadow-sm">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">{getTituloVista()}</h2>
                <p className="text-xs text-gray-400 font-medium hidden md:block">
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                    <Bell size={20}/>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-gray-800">{usuarioNombre}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Administrador</p>
                    </div>
                    <div className="w-10 h-10 bg-celeris-dark text-white rounded-full flex items-center justify-center font-bold shadow-md">
                        <User size={18}/>
                    </div>
                    <button onClick={handleLogout} className="ml-2 bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition-colors" title="Cerrar Sesión"><LogOut size={18}/></button>
                </div>
            </div>
        </header>

        <div className="p-4 lg:p-8 flex-1">
            
            {/* DASHBOARD */}
            {vista === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center text-celeris-main mb-4"><DollarSign size={20}/></div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+12%</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900">${stats.ingresos.toLocaleString()}</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase mt-1">Ingresos Hoy</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="bg-purple-50 w-10 h-10 rounded-lg flex items-center justify-center text-purple-600 mb-4"><Package size={20}/></div>
                    <h3 className="text-3xl font-black text-gray-900">{stats.enviosHoy}</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase mt-1">Paquetes Nuevos</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="bg-yellow-50 w-10 h-10 rounded-lg flex items-center justify-center text-yellow-600 mb-4"><Truck size={20}/></div>
                    <h3 className="text-3xl font-black text-gray-900">{stats.activos}</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase mt-1">En Ruta</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="bg-red-50 w-10 h-10 rounded-lg flex items-center justify-center text-red-500 mb-4"><AlertCircle size={20}/></div>
                    <h3 className="text-3xl font-black text-gray-900">{stats.incidencias}</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase mt-1">Incidencias</p>
                </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="font-bold text-gray-800 mb-6">Tendencia de Ingresos</h3>
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
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}}/>
                                    <YAxis axisLine={false} tickLine={false} tick={{fill:'#9ca3af', fontSize:12}} tickFormatter={(val)=>`$${val}`}/>
                                    <Tooltip formatter={(value) => [`$${value}`, 'Ingresos']} contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}/>
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
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:'8px'}}/>
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

            {/* CLIENTES */}
            {vista === 'clientes' && (
            <div className="animate-in fade-in">
                <div className="flex justify-end mb-6">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                        <input type="text" placeholder="Buscar por nombre, email o teléfono..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-celeris-main focus:ring-1 focus:ring-celeris-main transition-all" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500">
                            <tr>
                                <th className="p-4 pl-6">Cliente</th>
                                <th className="p-4">Contacto (Email)</th>
                                <th className="p-4">Teléfono</th>
                                <th className="p-4 text-center">Envíos</th>
                                <th className="p-4 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                        {obtenerPagina(clientes).datos.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-celeris-main font-bold">{c.nombre ? c.nombre.charAt(0).toUpperCase() : '?'}</div>
                                        <div><p className="font-bold text-gray-900">{c.nombre || 'Sin Nombre'}</p><p className="text-xs text-gray-400">ID: {c.id.slice(0,6)}</p></div>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-600 font-medium">{c.email}</td>
                                <td className="p-4 text-gray-600 flex items-center gap-2">{c.telefono ? <><Phone size={14} className="text-gray-400"/> {c.telefono}</> : <span className="text-gray-300 italic text-xs">No registrado</span>}</td>
                                <td className="p-4 text-center"><span className="bg-purple-50 text-purple-700 font-bold px-3 py-1 rounded-full border border-purple-100">{c.totalEnvios}</span></td>
                                <td className="p-4 text-center"><span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-2 py-1 rounded">Activo</span></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <span className="text-xs text-gray-500 font-bold">Página {paginaActual}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} className="p-1.5 border rounded-md hover:bg-white bg-white text-gray-500"><ChevronLeft size={16}/></button>
                            <button onClick={() => setPaginaActual(p => Math.min(obtenerPagina(clientes).totalPaginas, p + 1))} className="p-1.5 border rounded-md hover:bg-white bg-white text-gray-500"><ChevronRight size={16}/></button>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* PERSONAL */}
            {vista === 'personal' && (
            <div className="animate-in fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div></div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                            <input type="text" placeholder="Buscar empleado..." className="pl-10 pr-4 py-2 border rounded-lg outline-none focus:border-celeris-main" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
                        </div>
                        <button onClick={() => setModalEmpleadoOpen(true)} className="bg-celeris-main text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                            <Plus size={18}/> Nuevo
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {obtenerPagina(personal).datos.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group overflow-hidden hover:shadow-md transition-all">
                        <div className={`absolute top-0 left-0 w-1 h-full ${p.rol === 'chofer' ? 'bg-blue-500' : p.rol === 'recepcion' ? 'bg-pink-500' : p.rol === 'bodega' ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                        <div className="flex justify-between items-start mb-4 pl-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-lg font-bold text-gray-600">{p.nombre ? p.nombre.charAt(0) : '?'}</div>
                                <div><h3 className="font-bold text-gray-900">{p.nombre}</h3><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${p.rol === 'chofer' ? 'bg-blue-100 text-blue-700' : p.rol === 'recepcion' ? 'bg-pink-100 text-pink-700' : p.rol === 'bodega' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100'}`}>{p.rol}</span></div>
                            </div>
                            {p.rol === 'chofer' && (<div className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-2 py-1 rounded-lg text-xs font-bold">{p.calificacion || '5.0'} <Star size={10} fill="currentColor"/></div>)}
                        </div>
                        <div className="pl-3 space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400"/> {p.telefono || '---'}</div>
                            <div className="flex items-center gap-2"><span className="text-xs bg-gray-100 px-1 rounded">@</span> {p.email}</div>
                            {p.rol === 'chofer' && (
                                <div className="mt-4 pt-3 border-t border-gray-50">
                                <div className="flex justify-between text-xs mb-1"><span>Eficiencia</span><span className="font-bold">{p.eficiencia}%</span></div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width: `${p.eficiencia}%`}}></div></div>
                                </div>
                            )}
                        </div>
                    </div>
                    ))}
                </div>
            </div>
            )}
            
            {/* ENVÍOS */}
            {vista === 'envios' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
                <div className="p-6 border-b border-gray-100 flex justify-end">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                        <input type="text" placeholder="Buscar guía, destino..." className="pl-10 pr-4 py-2 border rounded-lg outline-none focus:border-celeris-main" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500">
                            <tr><th className="p-4 pl-6">Guía</th><th className="p-4">Cliente</th><th className="p-4">Destino</th><th className="p-4">Fecha</th><th className="p-4">Estado</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                        {obtenerPagina(todosLosPaquetes).datos.map(p => (
                            <tr key={p.id} className="hover:bg-blue-50/20">
                                <td className="p-4 pl-6 font-bold text-celeris-main">{p.tracking_id}</td>
                                <td className="p-4">{p.cliente_nombre}</td>
                                <td className="p-4">{p.destino}</td>
                                <td className="p-4 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${p.estado === 'entregado' ? 'bg-green-100 text-green-700' : p.estado === 'en_ruta' ? 'bg-blue-100 text-blue-700' : p.estado === 'incidencia' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.estado}</span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* MAPA */}
            {vista === 'mapa' && (
            <div className="h-full flex flex-col animate-in zoom-in-95">
                <div className="flex justify-end mb-4">
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-sm font-bold flex items-center gap-2 text-green-600"><span className="animate-pulse w-2 h-2 rounded-full bg-green-500"></span> Live</div>
                </div>
                <div className="flex-1 bg-white p-2 rounded-3xl shadow-lg border border-gray-200 relative overflow-hidden h-[600px]">
                    <MapContainer center={[19.3182, -98.2375]} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '1rem' }}>
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap' />
                        {paquetesMapa.map(p => {
                        const origenCoords = COORDENADAS[p.origen] || COORDENADAS['Tlaxcala Centro'];
                        const destinoCoords = COORDENADAS[p.destino] || COORDENADAS['Apizaco'];
                        return (
                            <div key={p.id}>
                                <Polyline positions={[origenCoords, destinoCoords]} color="#0056D2" weight={3} opacity={0.6} dashArray="5, 10" />
                                <Marker position={origenCoords}><Popup>Origen: {p.origen}</Popup></Marker>
                                <Marker position={destinoCoords}><Popup>Destino: {p.destino}</Popup></Marker>
                            </div>
                        )
                        })}
                    </MapContainer>
                </div>
            </div>
            )}
        </div>

      </main>

      {/* MODAL REGISTRO EMPLEADO */}
      {modalEmpleadoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Nuevo Empleado</h3>
                    <button onClick={() => setModalEmpleadoOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                
                <form onSubmit={registrarEmpleado} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                        <input type="text" className="w-full p-3 bg-gray-50 border rounded-lg outline-none focus:border-celeris-main" value={nuevoEmpleado.nombre} onChange={e=>setNuevoEmpleado({...nuevoEmpleado, nombre: e.target.value})} placeholder="Ej: Juan Pérez"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                        <input type="email" className="w-full p-3 bg-gray-50 border rounded-lg outline-none focus:border-celeris-main" value={nuevoEmpleado.email} onChange={e=>setNuevoEmpleado({...nuevoEmpleado, email: e.target.value})} placeholder="juan@celeris.com"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono</label>
                            <input type="tel" className="w-full p-3 bg-gray-50 border rounded-lg outline-none focus:border-celeris-main" value={nuevoEmpleado.telefono} onChange={e=>setNuevoEmpleado({...nuevoEmpleado, telefono: e.target.value})} placeholder="246..."/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rol / Puesto</label>
                            <select className="w-full p-3 bg-gray-50 border rounded-lg outline-none focus:border-celeris-main" value={nuevoEmpleado.rol} onChange={e=>setNuevoEmpleado({...nuevoEmpleado, rol: e.target.value})}>
                                <option value="chofer">Chofer</option>
                                <option value="bodega">Bodega</option>
                                <option value="recepcion">Recepción</option>
                                <option value="gerente">Gerente</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setModalEmpleadoOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-lg text-gray-500 hover:bg-gray-200">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-celeris-main font-bold rounded-lg text-white hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
                           {loading ? 'Guardando...' : <><Save size={18}/> Registrar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};