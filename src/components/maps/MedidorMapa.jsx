import LBL from "../ui/LBL";
import { useEffect, useRef, useState } from "react";
import { B, SI, ST } from "../../styles/tokens";
import { loadLeafletAssets, parseLatLngValue, measurementTypeLabel } from "../../lib/maps";
import { distanciaEnMetros } from "../../lib/mapaEstatico";

// Medicion sobre foto satelital, sin Google.
//
// Reemplaza al medidor que usaba la API de Google Maps. Aquello exigia cuenta,
// tarjeta y una clave que se podia bloquear -y se bloqueo: cuando cerraron la
// facturacion del proyecto, la medicion dejo de funcionar y el mapa desaparecio
// de las cotizaciones-. Esto usa mosaicos publicos: no hay clave que caduque ni
// factura que pagar.
//
// La distancia se calcula aqui con la formula del semiverseno, que da lo mismo
// que daba Google: se comprobo contra las mismas referencias.

const TIPOS = [
  ["LVH", "Línea horizontal"],
  ["LVV", "Línea vertical"],
  ["CON", "Conexión"],
  ["ESC", "Escalera"],
];

const COLOR = (tipo) =>
  tipo === "CON" ? "#EAB308" : tipo === "LVV" ? "#22C55E" : tipo === "ESC" ? "#F97316" : "#3B82F6";

export default function MedidorMapa({
  queryValue, onQueryChange, measurements, onChange, mapView, onMapViewChange,
}) {
  const nodoRef = useRef(null);
  const mapaRef = useRef(null);
  const LRef = useRef(null);
  const dibujosRef = useRef([]);
  const provisionalRef = useRef([]);
  const primerPuntoRef = useRef(null);

  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [midiendo, setMidiendo] = useState(false);
  const [capa, setCapa] = useState("satelite");
  const [buscando, setBuscando] = useState(false);

  const tramos = Array.isArray(measurements) ? measurements : [];

  // Se guarda donde quedo el mapa para que la imagen del documento salga
  // encuadrada igual que en pantalla.
  const guardarVista = () => {
    const mapa = mapaRef.current;
    if (!mapa || !onMapViewChange) return null;
    const c = mapa.getCenter();
    const vista = {
      center: { lat: c.lat, lng: c.lng },
      zoom: mapa.getZoom(),
      width: Math.min(640, Math.max(320, Math.round(nodoRef.current?.clientWidth || 640))),
      height: Math.min(640, Math.max(240, Math.round(nodoRef.current?.clientHeight || 420))),
    };
    onMapViewChange(vista);
    return vista;
  };

  useEffect(() => {
    let vivo = true;
    loadLeafletAssets()
      .then((L) => {
        if (!vivo || !nodoRef.current || mapaRef.current) return;
        LRef.current = L;

        const inicial = parseLatLngValue(queryValue || "");
        const centro = mapView?.center || (inicial ? { lat: inicial.lat, lng: inicial.lng } : { lat: 6.2442, lng: -75.5812 });

        const mapa = L.map(nodoRef.current, { zoomControl: true, attributionControl: true })
          .setView([centro.lat, centro.lng], mapView?.zoom || (inicial ? 19 : 13));

        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          maxZoom: 19, attribution: "Imágenes: Esri, Maxar, Earthstar Geographics",
        }).addTo(mapa);

        mapa.on("moveend zoomend", guardarVista);
        mapaRef.current = mapa;
        setEstado("listo");
        // El contenedor puede montarse con el alto todavia en cero.
        setTimeout(() => mapa.invalidateSize(), 120);
      })
      .catch((e) => { if (vivo) { setEstado("error"); setError(e.message); } });

    return () => {
      vivo = false;
      if (mapaRef.current) { mapaRef.current.remove(); mapaRef.current = null; }
    };
    // Se monta una sola vez: el resto se sincroniza en los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambio de capa: satelital para medir sobre la cubierta, calles para ubicarse.
  useEffect(() => {
    const mapa = mapaRef.current, L = LRef.current;
    if (!mapa || !L) return;
    mapa.eachLayer((capaActual) => { if (capaActual instanceof L.TileLayer) mapa.removeLayer(capaActual); });
    const fuente = capa === "calles"
      ? { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", cred: "© OpenStreetMap" }
      : { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", cred: "Imágenes: Esri, Maxar, Earthstar Geographics" };
    L.tileLayer(fuente.url, { maxZoom: 19, attribution: fuente.cred }).addTo(mapa);
  }, [capa]);

  // Redibuja los tramos cada vez que cambian.
  useEffect(() => {
    const mapa = mapaRef.current, L = LRef.current;
    if (!mapa || !L) return;
    dibujosRef.current.forEach((d) => mapa.removeLayer(d));
    dibujosRef.current = [];

    tramos.forEach((seg, i) => {
      if (!seg?.start || !seg?.end) return;
      const puntos = [[seg.start.lat, seg.start.lng], [seg.end.lat, seg.end.lng]];
      // Reborde blanco debajo: sobre una foto aerea el color solo se pierde.
      dibujosRef.current.push(L.polyline(puntos, { color: "#fff", weight: 8, opacity: .85 }).addTo(mapa));
      dibujosRef.current.push(L.polyline(puntos, { color: COLOR(seg.tipo), weight: 4 }).addTo(mapa));
      const medio = [(seg.start.lat + seg.end.lat) / 2, (seg.start.lng + seg.end.lng) / 2];
      dibujosRef.current.push(L.marker(medio, {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#fff;border:1px solid ${COLOR(seg.tipo)};border-radius:6px;padding:2px 7px;font:600 11px system-ui;color:#1a1a2e;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${seg.label || `Tramo ${i + 1}`} · ${Number(seg.ml || 0).toFixed(2)} m</div>`,
          iconSize: [0, 0],
        }),
      }).addTo(mapa));
    });
  }, [measurements]);

  // Modo medicion: dos clics hacen un tramo.
  useEffect(() => {
    const mapa = mapaRef.current, L = LRef.current;
    if (!mapa || !L) return;

    const limpiarProvisional = () => {
      provisionalRef.current.forEach((d) => mapa.removeLayer(d));
      provisionalRef.current = [];
      primerPuntoRef.current = null;
    };

    const alHacerClic = (e) => {
      const punto = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (!primerPuntoRef.current) {
        primerPuntoRef.current = punto;
        provisionalRef.current.push(
          L.circleMarker(e.latlng, { radius: 6, color: "#3B82F6", fillColor: "#fff", fillOpacity: 1, weight: 3 }).addTo(mapa)
        );
        return;
      }
      const a = primerPuntoRef.current;
      const metros = distanciaEnMetros(a, punto);
      limpiarProvisional();
      onChange([...tramos, {
        id: `m${Date.now()}`,
        tipo: "LVH",
        label: `LÍNEA ${tramos.length + 1}`,
        ml: Number(metros.toFixed(2)),
        start: a,
        end: punto,
      }]);
      guardarVista();
    };

    if (midiendo) {
      mapa.on("click", alHacerClic);
      if (mapa.getContainer()) mapa.getContainer().style.cursor = "crosshair";
    }
    return () => {
      mapa.off("click", alHacerClic);
      if (mapa.getContainer()) mapa.getContainer().style.cursor = "";
      limpiarProvisional();
    };
  }, [midiendo, measurements]);

  // Busca una direccion con el buscador libre de OpenStreetMap.
  const buscar = async () => {
    const texto = String(queryValue || "").trim();
    if (!texto || !mapaRef.current) return;

    const directo = parseLatLngValue(texto);
    if (directo) {
      mapaRef.current.setView([directo.lat, directo.lng], 19);
      guardarVista();
      return;
    }

    setBuscando(true);
    setError("");
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=co&q=${encodeURIComponent(texto)}`,
        { headers: { Accept: "application/json" } }
      );
      const datos = await r.json();
      if (!datos?.length) {
        setError("No se encontró esa dirección. Prueba con el barrio y la ciudad, o pega las coordenadas.");
        return;
      }
      mapaRef.current.setView([Number(datos[0].lat), Number(datos[0].lon)], 18);
      guardarVista();
    } catch {
      setError("No se pudo buscar la dirección. Pega las coordenadas y sigue.");
    } finally {
      setBuscando(false);
    }
  };

  const actualizarTramo = (i, campo, valor) =>
    onChange(tramos.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)));

  const totalMetros = tramos.reduce((s, t) => s + Number(t.ml || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <LBL>Dirección o coordenadas</LBL>
          <input
            value={queryValue || ""}
            onChange={(e) => onQueryChange && onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder="Calle 30 # 45-12, Medellín — o 6.2442, -75.5812"
            style={SI}
          />
        </div>
        <button onClick={buscar} disabled={buscando} style={{ ...B("#f47c20"), alignSelf: "flex-end" }}>
          {buscando ? "Buscando…" : "Ubicar"}
        </button>
        <button
          onClick={() => setMidiendo((v) => !v)}
          style={{ ...B(midiendo ? "#cc0000" : "#142840"), alignSelf: "flex-end" }}
        >
          {midiendo ? "Terminar medición" : "Medir"}
        </button>
        <button
          onClick={() => setCapa((c) => (c === "satelite" ? "calles" : "satelite"))}
          style={{ ...B("#f1f5f9", "#475569"), alignSelf: "flex-end" }}
        >
          {capa === "satelite" ? "Ver calles" : "Ver satélite"}
        </button>
      </div>

      {midiendo && (
        <div style={{ background: "#fff7ed", border: "1px solid #fde3c4", color: "#b54708", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 8 }}>
          Haz clic en el <strong>punto de inicio</strong> y luego en el <strong>punto final</strong>. El sistema calcula los metros.
        </div>
      )}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecdca", color: "#b42318", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 8 }}>
          {error}
        </div>
      )}

      <div
        ref={nodoRef}
        style={{ width: "100%", height: 420, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", background: "#eef0f3" }}
      />
      {estado === "cargando" && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Cargando el mapa…</div>}

      {tramos.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ ...ST, marginBottom: 8 }}>
            Tramos medidos · {tramos.length} · {totalMetros.toFixed(2)} m en total
          </div>
          {tramos.map((t, i) => (
            <div key={t.id || i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 90px 28px", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <input value={t.label || ""} onChange={(e) => actualizarTramo(i, "label", e.target.value)} placeholder="Nombre del tramo" style={{ ...SI, fontSize: 12 }} />
              <select value={t.tipo || "LVH"} onChange={(e) => actualizarTramo(i, "tipo", e.target.value)} style={{ ...SI, fontSize: 12 }}>
                {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1a1a2e", textAlign: "right" }}>
                {Number(t.ml || 0).toFixed(2)} m
              </div>
              <button
                onClick={() => onChange(tramos.filter((_, j) => j !== i))}
                title={`Quitar ${t.label || measurementTypeLabel(t.tipo)}`}
                style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: 6, cursor: "pointer", fontSize: 14, height: 30 }}
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
