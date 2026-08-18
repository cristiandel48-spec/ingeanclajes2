import { useCallback, useEffect, useMemo, useState } from "react";
import AvisoFlujo from "../../components/AvisoFlujo";
import H1 from "../../components/ui/H1";
import ListaConversaciones from "./ListaConversaciones";
import HiloConversacion from "./HiloConversacion";
import { B } from "../../styles/tokens";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/backend/supabaseClient";
import { agruparEnConversaciones } from "../../lib/whatsappCrm";

// Los mensajes que entran por WhatsApp y que se hizo con cada uno.
//
// SE CARGA AL ENTRAR, NO CON EL RESTO DE LA APLICACION. Todo lo demas viaja en
// el arranque -clientes, obras, cotizaciones-, pero esto puede crecer sin
// techo y quien no atiende WhatsApp no tiene por que descargarlo. Con el
// consumo de la base ya justo, meterlo en la carga general seria empeorarlo.
const CUANTOS = 300;

export default function WhatsAppCRM() {
  const [mensajes, setMensajes] = useState([]);
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abierta, setAbierta] = useState(null);   // telefono de la conversacion abierta

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("La aplicación no está conectada a la base todavía.");
      setCargando(false);
      return;
    }
    setCargando(true);
    setError("");
    try {
      const supabase = getSupabaseClient();
      const [{ data: filas, error: fallo }, { data: filasConfig }] = await Promise.all([
        supabase
          .from("wa_mensajes")
          .select("wa_message_id, telefono, perfil_nombre, texto, recibido_en, estado, respuesta, error, cotizacion_id")
          .order("recibido_en", { ascending: false })
          .limit(CUANTOS),
        supabase.from("wa_config").select("phone_number_id, numero_visible, activo, modo"),
      ]);
      if (fallo) throw fallo;
      setMensajes(filas ?? []);
      setConfig((filasConfig ?? [])[0] ?? null);
    } catch (fallo) {
      // La tabla no existe todavia si no se corrio la migracion: se dice tal
      // cual en vez de dejar la pantalla en blanco.
      const mensaje = String(fallo?.message || fallo);
      setError(/relation .* does not exist|schema cache/i.test(mensaje)
        ? "Faltan las tablas de WhatsApp: hay que ejecutar la migración 033 en Supabase."
        : mensaje);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const conversaciones = useMemo(() => agruparEnConversaciones(mensajes), [mensajes]);
  const hilo = useMemo(
    () => (abierta ? conversaciones.find((c) => c.telefono === abierta) : null),
    [abierta, conversaciones],
  );

  const sinAtender = conversaciones.filter((c) => c.sinAtender).length;

  if (hilo) {
    return <HiloConversacion conversacion={hilo} onVolver={() => setAbierta(null)} />;
  }

  return (
    <div style={{ padding: "14px 28px 28px" }}>
      <H1
        title="WhatsApp"
        subtitle={config
          ? `Número ${config.numero_visible || config.phone_number_id} · ${config.activo ? "activo" : "apagado"} · modo ${config.modo}`
          : "Mensajes que llegan al WhatsApp de la empresa"}
        action={
          <button style={{ ...B("#f1f5f9", "#475569"), fontSize: 12, padding: "8px 14px" }}
            onClick={cargar} disabled={cargando}>
            {cargando ? "Cargando…" : "Actualizar"}
          </button>
        }
      />

      {error && (
        <div style={{ background: "#FEF3F2", border: "1px solid #FECDCA", color: "#B42318",
          borderRadius: 10, padding: "11px 14px", fontSize: 12.5, marginBottom: 14, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      {!error && !config && !cargando && (
        <AvisoFlujo tono="info" titulo="WhatsApp todavía no está conectado">
          Cuando se conecte el número, aquí van a aparecer solos los mensajes que le escriban a la
          empresa, con lo que el sistema respondió a cada uno.
          <div style={{ marginTop: 5 }}>
            Falta darlo de alta en Meta, poner los tres secretos en Supabase y registrar el número
            en la tabla <code>wa_config</code>. Esta pantalla ya funciona: está esperando datos.
          </div>
        </AvisoFlujo>
      )}

      {sinAtender > 0 && (
        <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 10,
          padding: "10px 14px", fontSize: 12.5, color: "#b45309", marginBottom: 14 }}>
          <strong>{sinAtender}</strong> {sinAtender === 1 ? "conversación" : "conversaciones"} sin
          atender: llegaron pero no se les pudo responder.
        </div>
      )}

      <ListaConversaciones
        conversaciones={conversaciones}
        acciones={{ abrir: (c) => setAbierta(c.telefono) }}
      />
    </div>
  );
}
