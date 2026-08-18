import { useCallback, useEffect, useMemo, useState } from "react";
import AvisoFlujo from "../../components/AvisoFlujo";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import ListaConversaciones from "./ListaConversaciones";
import HiloConversacion from "./HiloConversacion";
import PegarConversacion from "./PegarConversacion";
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
  const [pegando, setPegando] = useState(false);

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

  // El boton vive en la barra superior, no dentro de la pantalla.
  useAccionesPantalla(
    abierta ? null : (
      <div style={{ display: "flex", gap: 7 }}>
      {!pegando && (
        <button
          style={{
            background: "#25D366", color: "#fff", border: "1px solid #25D366",
            borderRadius: 9, padding: "8px 16px", fontSize: 12.5, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}
          onClick={() => setPegando(true)}
          title="Pegar una conversación y sacar de ahí la cotización"
        >💬 Pegar conversación</button>
      )}
      <button
        style={{
          background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0",
          borderRadius: 9, padding: "8px 16px", fontSize: 12.5, fontWeight: 700,
          cursor: cargando ? "default" : "pointer", fontFamily: "inherit",
          whiteSpace: "nowrap", opacity: cargando ? 0.6 : 1,
        }}
        onClick={cargar}
        disabled={cargando}
      >{cargando ? "Cargando…" : "Actualizar"}</button>
      </div>
    ),
    [cargando, abierta, cargar, pegando]
  );

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
      {/* Sin titulo propio: la barra de arriba ya dice «WhatsApp», y repetirlo
          gastaba una franja entera de pantalla. Igual que en cotizaciones y
          obras. Lo que si aporta -que numero es y en que modo esta- se pone en
          una linea fina. */}
      {config && (
        <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 12 }}>
          Número <strong style={{ color: "#0f172a" }}>{config.numero_visible || config.phone_number_id}</strong>
          {" · "}{config.activo ? "activo" : "apagado"}
          {" · "}modo {config.modo}
        </div>
      )}

      {pegando && <PegarConversacion onCerrar={() => setPegando(false)} />}

      {error && (
        <div style={{ background: "#FEF3F2", border: "1px solid #FECDCA", color: "#B42318",
          borderRadius: 10, padding: "11px 14px", fontSize: 12.5, marginBottom: 14, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      {!error && !config && !cargando && (
        <>
          <AvisoFlujo
            tono="info"
            titulo="El programa ya está listo. Falta conectar el número en Meta"
            pasos={[
              "Crea la cuenta de WhatsApp Business API en Meta (business.facebook.com) y verifica el negocio. Es el paso que más tarda: Meta puede pedir documentos y demorarse días.",
              "En la app de Meta, apunta el webhook a la función whatsapp-entrada de Supabase y pega el token de verificación que inventaste.",
              "Guarda en Supabase los tres secretos: WA_VERIFY_TOKEN, WA_APP_SECRET y WA_TOKEN (el permanente del System User, no el de pruebas, que caduca en 24 horas).",
              "Registra el número en la tabla wa_config con su phone_number_id. Desde ese momento esta pantalla se llena sola.",
            ]}
          >
            Las tablas, la función que recibe los mensajes y esta pantalla ya están funcionando.
            Lo único que falta es del lado de Meta.
            <div style={{ marginTop: 7 }}>
              <strong>Vale la pena el trámite.</strong> Hoy, una solicitud que entra un sábado por la
              noche espera hasta el lunes. Con esto el cliente recibe respuesta <strong>en segundos y
              a cualquier hora</strong>, su solicitud queda registrada y el asesor la ve al llegar.
              El que escribe y no recibe respuesta pronto termina llamando a otro: esto lo evita, y
              de paso ahorra el tiempo de contestar a mano lo mismo de siempre.
            </div>
          </AvisoFlujo>

          {/* Dos cosas que conviene saber ANTES de migrar el numero, porque
              despues cuestan caro. La segunda no tiene vuelta atras facil. */}
          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12,
            padding: "13px 16px", fontSize: 12, color: "#78350f", lineHeight: 1.6, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: "#451a03", marginBottom: 6 }}>
              Dos cosas antes de dar el paso
            </div>
            <div style={{ marginBottom: 7 }}>
              <strong>Los chats que ya existen no se van a subir.</strong> WhatsApp solo entrega los
              mensajes que llegan a partir del momento en que se conecta; el historial anterior no se
              puede descargar. Aquí vas a ver las conversaciones nuevas, desde cero.
              {" "}Para los que ya tiene, y mientras llega lo de Meta, está el botón
              <strong> «Pegar conversación»</strong> de arriba: copia el chat y sale la cotización.
            </div>
            <div>
              <strong>El número que se conecte deja de funcionar en la aplicación normal de
              WhatsApp.</strong> Ya no se contesta desde el celular como hasta ahora: todo pasa por
              el sistema. Por eso suele convenir conectar un número nuevo y dejar el de siempre para
              el trato directo.
            </div>
          </div>
        </>
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
