import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Package, User, MapPin, CheckCircle, LogOut, 
  Clock, Mail, RefreshCw, Calculator, Search 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Recepcion = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [usuarioNombre, setUsuarioNombre] = useState('Recepcionista');
  const [costoTotal, setCostoTotal] = useState(0);
  
  const [formData, setFormData] = useState({
    cliente: '',
    email_cliente: '',
    origen: 'Tlaxcala Centro',
    destino: 'Apizaco',
    descripcion: '',
    peso: ''
  });

  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('perfiles').select('nombre').eq('id', user.id).single();
        if (data) setUsuarioNombre(data.nombre);
      }
      cargarHistorial();
    };
    init();
  }, []);

  // --- LÓGICA 1: TARIFAS DINÁMICAS ---
  // Cada vez que cambia origen, destino o peso, recalculamos el precio
  useEffect(() => {
    calcularPrecio();
  }, [formData.origen, formData.destino, formData.peso]);

  const calcularPrecio = () => {
    const peso = parseFloat(formData.peso) || 0;
    if (peso === 0) {
      setCostoTotal(0);
      return;
    }

    let tarifaBase = 100; // Tarifa estándar

    // Matriz de distancias simplificada para Tlaxcala
    const { origen, destino } = formData;

    if (origen === destino) {
      tarifaBase = 50; // Envío local (misma ciudad)
    } else if (
      (origen === 'Tlaxcala Centro' && destino === 'Chiautempan') ||
      (origen === 'Chiautempan' && destino === 'Tlaxcala Centro')
    ) {
      tarifaBase = 70; // Muy cerca
    } else if (origen === 'Calpulalpan' || destino === 'Calpulalpan') {
      tarifaBase = 200; // Zona lejana
    } else if (origen === 'Huamantla' || destino === 'Huamantla') {
      tarifaBase = 150; // Zona media
    } else {
      tarifaBase = 120; // Estándar (ej: Apizaco - Tlaxcala)
    }

    // Fórmula: Base + ($15 por cada Kg extra)
    const precioFinal = tarifaBase + (peso * 15);
    setCostoTotal(precioFinal);
  };

// --- LÓGICA MEJORADA: BUSCADOR HÍBRIDO ---
  const buscarClientePorEmail = async () => {
    if (!formData.email_cliente) return;
    setBuscandoCliente(true);

    try {
      // 1. Primero buscamos en USUARIOS REGISTRADOS (Tabla perfiles)
      // Ahora que agregamos la columna 'email' y los permisos, esto funcionará.
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre')
        .eq('email', formData.email_cliente)
        .maybeSingle(); // maybeSingle no da error si no encuentra nada

      if (perfil) {
        setFormData(prev => ({ ...prev, cliente: perfil.nombre }));
        toast.success(`Cuenta encontrada: ${perfil.nombre}`, { icon: '👤' });
        setBuscandoCliente(false);
        return;
      }

      // 2. Si no tiene cuenta, buscamos en el HISTORIAL DE ENVÍOS (Tabla paquetes)
      // Nota: Esto asume que agregaste la columna 'cliente_email' a paquetes anteriormente
      const { data: historial } = await supabase
        .from('paquetes')
        .select('cliente_nombre')
        .eq('cliente_email', formData.email_cliente) // Asegúrate de guardar este dato al crear paquetes
        .limit(1);

      if (historial && historial.length > 0) {
        setFormData(prev => ({ ...prev, cliente: historial[0].cliente_nombre }));
        toast.success(`Cliente frecuente encontrado: ${historial[0].cliente_nombre}`, { icon: '📦' });
      } else {
        toast('Cliente nuevo (o sin registros)', { icon: '🆕' });
      }

    } catch (error) {
      console.error(error);
      toast.error("Error buscando cliente");
    } finally {
      setBuscandoCliente(false);
    }
  };

  const cargarHistorial = async () => {
    const { data } = await supabase
      .from('paquetes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setHistorial(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
    toast.success("Turno finalizado");
  };

  const generarTrackingID = () => {
    // Genera algo como: TLX-API-9382 (Incluye 3 letras del destino)
    const destCode = formData.destino.substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TLX-${destCode}-${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const trackingId = generarTrackingID();

    try {
      // Nota: Tu tabla 'paquetes' necesita la columna 'cliente_email' si queremos guardarlo
      // Si no la creaste, el insert ignorará ese campo o dará error. 
      // Asegúrate de agregarla en Supabase o quitarla de aquí si solo quieres buscar por nombre.
      const { error } = await supabase.from('paquetes').insert({
        tracking_id: trackingId,
        cliente_nombre: formData.cliente,
        cliente_email: formData.email_cliente,
        origen: formData.origen,
        destino: formData.destino,
        descripcion: formData.descripcion,
        costo: costoTotal,
        peso: formData.peso, 
        estado: 'recibido'
      });

      if (error) throw error;

      toast.success(`Guía generada: ${trackingId}`);
      
      setFormData({ cliente: '', email_cliente: '', origen: 'Tlaxcala Centro', destino: 'Apizaco', descripcion: '', peso: '' });
      cargarHistorial();

    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      <nav className="bg-celeris-dark text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Package size={24} className="text-celeris-light"/>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Celeris <span className="text-celeris-light font-normal">Desk</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm bg-white/10 px-3 py-1 rounded-full">
              <User size={14} className="text-celeris-light"/>
              <span>{usuarioNombre}</span>
            </div>
            <button onClick={handleLogout} className="text-red-300 hover:text-white transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULARIO */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Nuevo Envío</h2>
              <div className="bg-blue-50 text-celeris-main px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2">
                <Calculator size={16}/> Cotizador Activo
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Sección Inteligente de Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="relative">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Correo del Cliente</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      placeholder="cliente@email.com"
                      className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-celeris-main outline-none transition-all"
                      value={formData.email_cliente}
                      onChange={(e) => setFormData({...formData, email_cliente: e.target.value})}
                      onBlur={buscarClientePorEmail} // <--- Al salir del campo, busca
                    />
                    {buscandoCliente && <div className="absolute right-3 top-3.5"><RefreshCw size={18} className="animate-spin text-celeris-main"/></div>}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">Presiona fuera o Tab para buscar cliente existente.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                      type="text" required placeholder="Se llena automático si existe"
                      className={`w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-celeris-main outline-none transition-all ${formData.cliente ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                      value={formData.cliente}
                      onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Ruta y Cotización */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Origen</label>
                  <select 
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-celeris-main"
                    value={formData.origen} onChange={(e) => setFormData({...formData, origen: e.target.value})}
                  >
                    <option>Tlaxcala Centro</option>
                    <option>Apizaco</option>
                    <option>Huamantla</option>
                    <option>Chiautempan</option>
                    <option>Calpulalpan</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Destino</label>
                  <select 
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-celeris-main"
                    value={formData.destino} onChange={(e) => setFormData({...formData, destino: e.target.value})}
                  >
                    <option>Apizaco</option>
                    <option>Tlaxcala Centro</option>
                    <option>Huamantla</option>
                    <option>Chiautempan</option>
                    <option>Calpulalpan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Contenido</label>
                  <input 
                    type="text" required placeholder="Ej: Ropa, Electrónicos..."
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-celeris-main outline-none"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Peso (kg)</label>
                  <input 
                    type="number" required step="0.5" placeholder="0.0" min="0"
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-celeris-main outline-none font-bold text-center"
                    value={formData.peso}
                    onChange={(e) => setFormData({...formData, peso: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="submit" disabled={loading}
                className="w-full bg-celeris-main text-white py-4 rounded-xl font-bold hover:shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-lg transform active:scale-[0.99]"
              >
                {loading ? <RefreshCw className="animate-spin"/> : <CheckCircle size={22} />}
                {loading ? 'Generando Guía...' : `Registrar Envío ($${costoTotal.toFixed(2)})`}
              </button>
            </form>
          </div>
        </div>

        {/* PANEL DERECHO: COTIZACIÓN E HISTORIAL */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Tarjeta de Precio Dinámica */}
          <div className="bg-gradient-to-br from-celeris-dark to-blue-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-celeris-light opacity-20 rounded-full blur-2xl group-hover:opacity-30 transition-opacity"></div>
            
            <div className="relative z-10">
              <p className="text-blue-200 text-sm font-medium mb-1 flex items-center gap-2">
                <MapPin size={14}/> {formData.origen} <span className="opacity-50">➔</span> {formData.destino}
              </p>
              <h3 className="text-5xl font-black tracking-tight my-4">
                ${costoTotal.toFixed(2)}
              </h3>
              
              <div className="space-y-2 text-sm text-blue-100/80">
                <div className="flex justify-between border-b border-white/10 pb-1">
                  <span>Peso ({formData.peso || 0}kg)</span>
                  <span>+ ${(parseFloat(formData.peso || 0) * 15).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tarifa Ruta</span>
                  <span>+ ${(costoTotal - (parseFloat(formData.peso || 0) * 15)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Historial Compacto */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden h-[350px] flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">Últimos Registros</h3>
              <button onClick={cargarHistorial} className="bg-white p-2 rounded-lg shadow-sm hover:text-celeris-main transition-colors">
                <RefreshCw size={14}/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {historial.map((item) => (
                <div key={item.id} className="p-4 border border-gray-100 rounded-2xl hover:bg-blue-50/50 transition-colors group cursor-default">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black text-celeris-dark">{item.tracking_id}</span>
                    <span className="text-xs font-bold text-gray-400 group-hover:text-celeris-main transition-colors">${item.costo}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.cliente_nombre}</p>
                      <p className="text-xs text-gray-400">{item.destino}</p>
                    </div>
                    <button className="text-gray-300 hover:text-celeris-main transition-colors" title="Reenviar comprobante">
                      <Mail size={16}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};