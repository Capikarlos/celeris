import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { 
  Truck, Package, ShieldCheck, Clock, MapPin, 
  ArrowRight, Search, X, Globe, Users, TrendingUp, CheckCircle, LogIn 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Home = () => {
  const navigate = useNavigate();
  const [guia, setGuia] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  // --- RASTREO PÚBLICO ---
  const rastrearPublico = async (e) => {
    e.preventDefault();
    if (!guia) return toast.error("Ingresa un número de guía válido");
    
    setLoading(true);
    setModalAbierto(true);
    setResultado(null);

    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('tracking_id, estado, origen, destino, created_at')
        .eq('tracking_id', guia.trim().toUpperCase())
        .single();

      if (error || !data) {
        setResultado('no_encontrado');
      } else {
        setResultado(data);
      }
    } catch (err) {
      setResultado('error');
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setGuia('');
    setResultado(null);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 selection:bg-celeris-main selection:text-white">
      
      {/* 1. NAVBAR PREMIUM */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="bg-gradient-to-tr from-celeris-dark to-celeris-main text-white p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <Truck size={22} />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Celeris</span>
          </div>

          {/* Botón Acceso Unificado */}
          <button 
            onClick={() => navigate('/login')} 
            className="group flex items-center gap-2 bg-gray-900 hover:bg-celeris-main text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shadow-xl shadow-gray-200 hover:shadow-blue-200"
          >
            <LogIn size={16} className="group-hover:translate-x-1 transition-transform"/>
            Acceso
          </button>
        </div>
      </nav>

      {/* 2. HERO SECTION (Encabezado) */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Fondo decorativo (Grid) */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
          
          <div className="inline-flex items-center gap-2 bg-blue-50 text-celeris-main px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8 border border-blue-100 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-celeris-main"></span>
            </span>
            La red logística #1 en Tlaxcala
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 leading-[1.1] tracking-tight">
            Envíos inteligentes, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-celeris-main to-blue-400">futuro conectado.</span>
          </h1>
          
          <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Gestionamos tu cadena de suministro desde la recolección hasta la última milla con tecnología de punta y rastreo en tiempo real.
          </p>

          {/* RASTREADOR FLOTANTE */}
          <form onSubmit={rastrearPublico} className="relative z-20 bg-white p-2 rounded-full shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-gray-100 flex gap-2 max-w-lg mx-auto transform hover:scale-[1.02] transition-all duration-300 ring-4 ring-gray-50">
             <div className="flex-1 relative">
                <Search className="absolute left-5 top-4 text-gray-400" size={20}/>
                <input 
                  type="text" 
                  placeholder="Rastrear envío (Ej: TLX-API-8206)" 
                  className="w-full h-full pl-14 pr-4 outline-none text-gray-800 font-bold bg-transparent rounded-full placeholder-gray-400"
                  value={guia}
                  onChange={(e) => setGuia(e.target.value)}
                />
             </div>
             <button type="submit" className="bg-celeris-main hover:bg-gray-900 text-white px-8 py-3.5 rounded-full font-bold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30">
               <span className="hidden sm:inline">Buscar</span> <ArrowRight size={20}/>
             </button>
          </form>

        </div>
      </section>

      {/* 3. BARRA DE ESTADÍSTICAS (Social Proof) */}
      <section className="bg-gray-900 text-white py-12 border-y border-gray-800">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
           {[
             { num: "99.8%", label: "Efectividad", icon: <CheckCircle className="text-green-400 mb-2 mx-auto"/> },
             { num: "24h", label: "Tiempo Promedio", icon: <Clock className="text-blue-400 mb-2 mx-auto"/> },
             { num: "5k+", label: "Envíos Mensuales", icon: <Package className="text-purple-400 mb-2 mx-auto"/> },
             { num: "100%", label: "Cobertura Tlaxcala", icon: <MapPin className="text-red-400 mb-2 mx-auto"/> },
           ].map((stat, i) => (
             <div key={i} className="flex flex-col items-center hover:scale-110 transition-transform cursor-default">
                {stat.icon}
                <span className="text-3xl font-black tracking-tight">{stat.num}</span>
                <span className="text-gray-400 text-sm font-bold uppercase mt-1">{stat.label}</span>
             </div>
           ))}
        </div>
      </section>

      {/* 4. CARACTERÍSTICAS (Grid Bento) */}
      <section className="py-24 bg-gray-50 px-6">
         <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">¿Por qué elegir Celeris?</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Nuestra plataforma integra a todos los actores de la logística en un solo ecosistema digital.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Card 1 */}
               <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-celeris-main mb-6 group-hover:bg-celeris-main group-hover:text-white transition-colors">
                     <Globe size={28}/>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Tecnología en la Nube</h3>
                  <p className="text-gray-500 leading-relaxed">Accede desde cualquier lugar. Gerentes, choferes y clientes conectados en tiempo real.</p>
               </div>

               {/* Card 2 */}
               <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                  <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                     <ShieldCheck size={28}/>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Seguridad OTP</h3>
                  <p className="text-gray-500 leading-relaxed">Cada entrega está protegida con un código único. Adiós a los paquetes perdidos.</p>
               </div>

               {/* Card 3 */}
               <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
                     <TrendingUp size={28}/>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Analítica Avanzada</h3>
                  <p className="text-gray-500 leading-relaxed">Dashboards financieros y operativos para tomar decisiones basadas en datos reales.</p>
               </div>
            </div>
         </div>
      </section>

      {/* 5. MODAL DE RASTREO (Pop-up) */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
              <button onClick={cerrarModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={20}/></button>
              
              <div className="text-center mb-8">
                 <div className="w-20 h-20 bg-blue-50 text-celeris-main rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Search size={36}/>
                 </div>
                 <h3 className="text-2xl font-bold text-gray-900">Resultado del Rastreo</h3>
              </div>

              {loading ? (
                 <div className="py-12 text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-celeris-main border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400 text-sm font-bold animate-pulse">Buscando en la red...</p>
                 </div>
              ) : resultado === 'no_encontrado' ? (
                 <div className="text-center py-8 bg-red-50 rounded-2xl border border-red-100">
                    <p className="text-red-600 font-bold text-lg">Guía no encontrada</p>
                    <p className="text-sm text-red-400 mt-1 px-4">El código no existe en nuestra base de datos. Verifica e intenta de nuevo.</p>
                 </div>
              ) : resultado ? (
                 <div className="space-y-6">
                    {/* Header Tarjeta */}
                    <div className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl border border-gray-100">
                       <div className="flex flex-col">
                          <span className="text-xs text-gray-400 font-bold uppercase">Guía</span>
                          <span className="font-black text-celeris-main text-xl tracking-tight">{resultado.tracking_id}</span>
                       </div>
                       <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-md ${
                          resultado.estado === 'entregado' ? 'bg-green-500' : 
                          resultado.estado === 'en_ruta' ? 'bg-blue-500 animate-pulse' : 
                          'bg-yellow-500'
                       }`}>
                          {resultado.estado.replace('_', ' ')}
                       </span>
                    </div>

                    {/* Timeline Vertical */}
                    <div className="relative pl-6 border-l-2 border-gray-100 space-y-8 py-2 ml-2">
                       <div className="relative">
                          <div className="absolute -left-[31px] top-1 w-4 h-4 bg-gray-300 rounded-full border-4 border-white shadow-sm"></div>
                          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Origen</p>
                          <p className="font-bold text-gray-800 text-lg">{resultado.origen}</p>
                       </div>
                       <div className="relative">
                          <div className="absolute -left-[31px] top-1 w-4 h-4 bg-celeris-main rounded-full border-4 border-white shadow-md ring-4 ring-blue-50"></div>
                          <p className="text-xs text-celeris-main font-bold uppercase mb-1">Destino</p>
                          <p className="font-bold text-gray-800 text-lg">{resultado.destino}</p>
                       </div>
                    </div>

                    <div className="text-center pt-4 border-t border-gray-50">
                       <p className="text-xs text-gray-400 font-medium">Registrado el {new Date(resultado.created_at).toLocaleDateString()}</p>
                    </div>
                 </div>
              ) : null}
           </div>
        </div>
      )}

      {/* 6. FOOTER CLEAN */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
               <div className="bg-gray-100 p-1.5 rounded-lg"><Truck size={18} className="text-gray-600"/></div>
               <span className="font-bold text-gray-800">Celeris Inc.</span>
            </div>
            <p className="text-gray-500 text-xs">© 2026 Celeris Logística S.A. de C.V.</p>
            <div className="flex gap-6 text-xs font-bold text-gray-500">
               <a href="#" className="hover:text-celeris-main">Términos</a>
               <a href="#" className="hover:text-celeris-main">Privacidad</a>
               <a href="#" className="hover:text-celeris-main">Contacto</a>
            </div>
         </div>
      </footer>
    </div>
  );
};