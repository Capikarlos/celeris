import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Truck,
  ArrowRight,
  CheckSquare,
  LogOut,
  RefreshCw,
  Calendar,
  MapPin,
  User,
  Box,
  ClipboardList,
  History,
  Undo2,
  Search,
  LayoutGrid,
  List,
  Filter,
  Scale,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

export const Bodega = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pendientes");
  const [viewMode, setViewMode] = useState("grid");

  const [paquetes, setPaquetes] = useState([]);
  const [choferes, setChoferes] = useState([]); // Incluye capacidad y carga actual
  const [selecciones, setSelecciones] = useState({});
  const [loading, setLoading] = useState(false);
  const [usuarioNombre, setUsuarioNombre] = useState("Encargado");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroCiudad, setFiltroCiudad] = useState("");

  useEffect(() => {
    const init = async () => {
      await obtenerUsuario();
      // Cargamos todo junto para calcular pesos correctamente
      cargarDatosCompletos();
    };
    init();
  }, []);

  // Recargar datos al cambiar de pestaña o realizar acción
  useEffect(() => {
    // Si solo cambiamos de tab, no necesitamos recargar todo de la BD,
    // pero para mantener consistencia de pesos, lo haremos.
    cargarDatosCompletos();
  }, [activeTab]);

  const obtenerUsuario = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("perfiles")
        .select("nombre")
        .eq("id", user.id)
        .single();
      if (data) setUsuarioNombre(data.nombre);
    }
  };

  const cargarDatosCompletos = async () => {
    setLoading(true);
    try {
      // 1. Cargar TODOS los paquetes activos (Recibidos y En Ruta)
      const { data: dataPaquetes } = await supabase
        .from("paquetes")
        .select("*")
        .or("estado.eq.recibido,estado.eq.en_ruta") // Traemos ambos para calcular carga
        .order("created_at", { ascending: false });

      if (dataPaquetes) setPaquetes(dataPaquetes);

      // 2. Cargar Choferes y sus capacidades
      const { data: dataChoferes } = await supabase
        .from("perfiles")
        .select("id, nombre, capacidad_kg")
        .eq("rol", "chofer");

      if (dataChoferes && dataPaquetes) {
        // 3. CALCULAR CARGA ACTUAL DE CADA CHOFER
        const choferesConCarga = dataChoferes.map((chofer) => {
          // Sumar peso de paquetes que este chofer YA tiene 'en_ruta'
          const cargaActual = dataPaquetes
            .filter((p) => p.chofer_id === chofer.id && p.estado === "en_ruta")
            .reduce((sum, p) => sum + (parseFloat(p.peso) || 0), 0);

          return { ...chofer, cargaActual };
        });
        setChoferes(choferesConCarga);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado visual
  const paquetesVisibles = paquetes.filter((p) => {
    // Primero filtro por tab
    if (activeTab === "pendientes" && p.estado !== "recibido") return false;
    if (activeTab === "en_ruta" && p.estado !== "en_ruta") return false;

    // Luego filtros de texto/ciudad
    const matchTexto =
      p.tracking_id.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchCiudad = filtroCiudad ? p.destino === filtroCiudad : true;

    return matchTexto && matchCiudad;
  });

  const ciudadesUnicas = [...new Set(paquetes.map((p) => p.destino))];

  const handleSelectChange = (paqueteId, valor) => {
    setSelecciones((prev) => ({ ...prev, [paqueteId]: valor }));
  };

  const gestionarPaquete = async (paqueteId, accion, choferId = null) => {
    setLoading(true);
    try {
      let updates = {};
      let mensaje = "";

      if (accion === "despachar") {
        if (!choferId) throw new Error("Selecciona un chofer");

        // --- VALIDACIÓN DE PESO CRÍTICA ---
        const paquete = paquetes.find((p) => p.id === paqueteId);
        const chofer = choferes.find((c) => c.id === choferId);
        const pesoPaquete = parseFloat(paquete.peso) || 0;

        if (chofer.cargaActual + pesoPaquete > chofer.capacidad_kg) {
          throw new Error(
            `⚠️ ¡Sobrecarga! El chofer excedería su capacidad máxima de ${chofer.capacidad_kg}kg.`
          );
        }
        // ----------------------------------

        updates = { chofer_id: choferId, estado: "en_ruta" };
        mensaje = "Paquete en ruta 🚚";
      } else if (accion === "cancelar") {
        updates = { chofer_id: null, estado: "recibido" };
        mensaje = "Regresado a bodega ↩️";
      }

      const { data, error } = await supabase
        .from("paquetes")
        .update(updates)
        .eq("id", paqueteId)
        .select();
      if (error) throw error;
      if (data.length === 0)
        throw new Error("❌ Permiso denegado. Requiere rol 'bodega'.");

      toast.success(mensaje);
      cargarDatosCompletos(); // Recargar todo para actualizar las barras de carga
      setSelecciones((prev) => ({ ...prev, [paqueteId]: "" })); // Limpiar select
    } catch (error) {
      toast.error(error.message, { duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  const obtenerNombreChofer = (id) => {
    const chofer = choferes.find((c) => c.id === id);
    return chofer ? chofer.nombre : "...";
  };

  // Renderizar la barra de progreso de capacidad en el Select
  const renderOpcionChofer = (chofer, pesoPaquete) => {
    const pesoNuevo = parseFloat(pesoPaquete) || 0;
    const cargaFutura = chofer.cargaActual + pesoNuevo;
    const esLleno = cargaFutura > chofer.capacidad_kg;

    return (
      <option
        key={chofer.id}
        value={chofer.id}
        disabled={esLleno}
        className={esLleno ? "text-red-400 bg-red-50" : ""}
      >
        {chofer.nombre} • {chofer.cargaActual}kg / {chofer.capacidad_kg}kg{" "}
        {esLleno ? "(LLENO)" : ""}
      </option>
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* NAVBAR */}
      <nav className="bg-celeris-dark text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm">
              <Box size={26} className="text-celeris-light" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-none tracking-tight">
                Celeris{" "}
                <span className="text-celeris-light font-normal">Hub</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              <User size={16} className="text-celeris-light" />
              <span className="text-sm font-medium">{usuarioNombre}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* CONTENIDO */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-8">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-end mb-8 gap-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <ClipboardList className="text-celeris-main" size={28} />
              Control de Carga
            </h2>
            <p className="text-gray-500 mt-2">Gestión de peso y rutas.</p>
          </div>

          {/* FILTROS */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-celeris-main"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <select
                className="pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-celeris-main appearance-none cursor-pointer"
                value={filtroCiudad}
                onChange={(e) => setFiltroCiudad(e.target.value)}
              >
                <option value="">Todas las Ciudades</option>
                {ciudadesUnicas.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${
                  viewMode === "grid"
                    ? "bg-gray-100 text-celeris-main"
                    : "text-gray-400"
                }`}
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${
                  viewMode === "list"
                    ? "bg-gray-100 text-celeris-main"
                    : "text-gray-400"
                }`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("pendientes")}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "pendientes"
                ? "border-celeris-main text-celeris-main"
                : "border-transparent text-gray-500"
            }`}
          >
            <Package size={18} /> Por Despachar{" "}
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs ml-1">
              {paquetes.filter((p) => p.estado === "recibido").length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("en_ruta")}
            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "en_ruta"
                ? "border-celeris-main text-celeris-main"
                : "border-transparent text-gray-500"
            }`}
          >
            <Truck size={18} /> En Ruta{" "}
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs ml-1">
              {paquetes.filter((p) => p.estado === "en_ruta").length}
            </span>
          </button>
        </div>

        {/* LISTADO */}
        {paquetesVisibles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-lg">No hay paquetes aquí.</p>
          </div>
        ) : (
          <>
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paquetesVisibles.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative"
                  >
                    {/* Badge de Peso */}
                    <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 border border-gray-200">
                      <Scale size={12} /> {p.peso}kg
                    </div>

                    <div className="mb-4">
                      <span className="bg-blue-50 text-celeris-main text-[11px] font-black px-2 py-1 rounded uppercase">
                        {p.tracking_id}
                      </span>
                      <h3 className="font-bold text-gray-800 text-lg mt-2 truncate">
                        {p.cliente_nombre}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {p.descripcion}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-xl mb-4 text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500">Destino:</span>
                        <span className="font-bold">{p.destino}</span>
                      </div>
                    </div>

                    {activeTab === "pendientes" ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Truck
                            className="absolute left-3 top-2.5 text-gray-400"
                            size={16}
                          />
                          <select
                            className="w-full pl-9 p-2 bg-white border border-gray-200 rounded-lg text-sm outline-none cursor-pointer"
                            value={selecciones[p.id] || ""}
                            onChange={(e) =>
                              handleSelectChange(p.id, e.target.value)
                            }
                          >
                            <option value="">Seleccionar Chofer...</option>
                            {choferes.map((c) => renderOpcionChofer(c, p.peso))}
                          </select>
                        </div>
                        <button
                          onClick={() =>
                            gestionarPaquete(
                              p.id,
                              "despachar",
                              selecciones[p.id]
                            )
                          }
                          disabled={loading}
                          className="w-full bg-gray-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-celeris-main transition-colors flex items-center justify-center gap-2"
                        >
                          Despachar <ArrowRight size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => gestionarPaquete(p.id, "cancelar")}
                        disabled={loading}
                        className="w-full border border-red-200 text-red-500 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Undo2 size={14} /> Regresar a Bodega
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* VISTA TABLA (CON PESO) */}
            {viewMode === "list" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="p-4">Guía</th>
                      <th className="p-4">Peso</th>
                      <th className="p-4">Destino</th>
                      <th className="p-4">
                        {activeTab === "pendientes"
                          ? "Asignar Chofer (Capacidad)"
                          : "Responsable"}
                      </th>
                      <th className="p-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {paquetesVisibles.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="p-4 font-bold text-celeris-main">
                          {p.tracking_id}
                        </td>
                        <td className="p-4 font-bold text-gray-700">
                          {p.peso}kg
                        </td>
                        <td className="p-4">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">
                            {p.destino}
                          </span>
                        </td>
                        <td className="p-4">
                          {activeTab === "pendientes" ? (
                            <select
                              className="w-full max-w-[250px] p-2 bg-white border border-gray-200 rounded text-xs outline-none"
                              value={selecciones[p.id] || ""}
                              onChange={(e) =>
                                handleSelectChange(p.id, e.target.value)
                              }
                            >
                              <option value="">Seleccionar Chofer...</option>
                              {choferes.map((c) =>
                                renderOpcionChofer(c, p.peso)
                              )}
                            </select>
                          ) : (
                            <span className="font-medium">
                              {obtenerNombreChofer(p.chofer_id)}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {activeTab === "pendientes" ? (
                            <button
                              onClick={() =>
                                gestionarPaquete(
                                  p.id,
                                  "despachar",
                                  selecciones[p.id]
                                )
                              }
                              className="bg-gray-900 text-white p-2 rounded hover:bg-celeris-main"
                            >
                              <ArrowRight size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => gestionarPaquete(p.id, "cancelar")}
                              className="text-red-400 hover:bg-red-50 p-2 rounded"
                            >
                              <Undo2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
