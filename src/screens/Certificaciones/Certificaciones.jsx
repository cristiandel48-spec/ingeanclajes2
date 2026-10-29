import AvisoFlujo from "../../components/AvisoFlujo";
import Badge from "../../components/ui/Badge";
import CertificacionDetalle from "./CertificacionDetalle";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useEffect, useRef, useState } from "react";
import { useSubirAlFormulario } from "../../hooks/useSubirAlFormulario";
import { B, CD, SI, ST } from "../../styles/tokens";
import { buildCertForm, construirTextoSistema, getCertDefaultElements, unAnoDespues } from "./certConfig";
import { redactarSistemasDesdeCotizacion } from "../../lib/certificacionTexto";
import { fmtD, fmtL, scrollAppToTop } from "../../lib/format";
import { normalizarRazonSocial, normalizarFrase, normalizarTextoCertificacion } from "../../lib/normalizarEntrada";
import { corregirOrtografiaLocal } from "../../lib/correctorTexto";
import BotonCorregir from "../../components/ui/BotonCorregir";
import { printCurrentPz } from "../../lib/print";
import { descargarDocumentoPdf } from "../../lib/documentoPdf";
import { nombreDocumento } from "../../lib/nombreArchivo";
import { siguienteIdUnico } from "../../lib/identificadores";
import { nuevoCodigoVerificacion } from "../../lib/verificacionCertificados";
import ListaCertificaciones from "./ListaCertificaciones";
import { useAccionesPantalla, useTituloPantalla } from "../../context/accionesPantalla";
import { Button } from "../../components/ui";
import { resolverAutorGuardado, normalizarNombrePersona } from "../../lib/autorAuditoria";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { obrasMasNuevasPrimero } from "../../lib/identificadores";
import { confirmar } from "../../lib/dialogos";
import { esCamilaSepulveda } from "../../lib/agendaEspecial";
import { certificacionRepetida } from "../../lib/duplicados";
import { AVISO_ACTA_SIN_FIRMAR, motivoActaPendiente } from "../../lib/actaEntrega";
import { useEstadosFirmaActas } from "../../hooks/useEnviosFirma";
// Informes de una obra. Si se indica uno concreto, solo ese.
const informesFuente = (informes, obraId, informeId = "")=>{
  if(!obraId) return [];
  const elegido = informeId ? (informes||[]).find((i)=>i?.id===informeId) : null;
  return elegido && elegido.obraId===obraId
    ? [elegido]
    : (informes||[]).filter((i)=>i?.obraId===obraId);
};

// La fecha del trabajo: el fin del periodo del informe, o su fecha de emision.
const fechaDesdeInformes = (informes, obraId, informeId = "")=>{
  const fechas = informesFuente(informes, obraId, informeId)
    .map((i)=>String(i.periodoFin || i.fechaInforme || "").trim())
    .filter(Boolean)
    .sort();
  return fechas.length ? fechas[fechas.length-1] : "";
};

// El nombre del proyecto del informe: "CREAFAM SEDE SAN BLAS". Es el DONDE
// del certificado, y distingue una sede de otra dentro de la misma obra.
const proyectoDesdeInformes = (informes, obraId, informeId = "")=>{
  const nombres = [...new Set(informesFuente(informes, obraId, informeId)
    .map((i)=>String(i.proyecto || "").trim())
    .filter(Boolean))];
  return nombres[0] || "";
};

// Lo que se hizo, tal como se anoto al registrar el avance de la obra:
// "Creafam san blas recertificacion 1 linea de vida". Sirve de respaldo
// cuando el informe no trae observaciones.
const actividadesDesdeInformes = (informes, obraId, informeId = "")=>{
  const titulos = [...new Set(informesFuente(informes, obraId, informeId)
    .flatMap((i)=>(i.actividades||[]).map((a)=>String(a?.titulo||"").trim()))
    .filter(Boolean))];
  return titulos.join("; ");
};

// Lo anotado en las observaciones de esos informes, sin repetir.
const observacionesDesdeInformes = (informes, obraId, informeId = "")=>{
  const textos = informesFuente(informes, obraId, informeId)
    .flatMap((i)=>(i.actividades||[]).map((a)=>String(a?.observaciones||"").trim()))
    .filter(Boolean)
    .map((t)=>t.replace(/[.\s]+$/, ""));
  return [...new Set(textos)].join(". ");
};

export default function Certificaciones({ctx}){
  const isMobile = useIsMobile();
  const {certs,setCerts,obras,clientes,cotizaciones,informes,intencion,limpiarIntencion,irAPantalla}=ctx;
  // Para el candado del acta: sin acta firmada por el cliente no se certifica.
  const { estados: estadosActas, listo: estadosActasListos } = useEstadosFirmaActas();
  const [sel,setSel]=useState(null);
  const puedeEliminar = esCamilaSepulveda(ctx?.membresia, ctx?.authUserEmail);

  // Borra la certificacion. El QR que ya se entrego deja de validarla: la
  // pagina de verificacion dira que no existe. Por eso se pregunta con el
  // folio y el cliente a la vista.
  const eliminarCertificacion = async (c) => {
    if (!puedeEliminar) return;
    const folio = c?.numero || c?.id || "";
    const ok = await confirmar({
      titulo: `Eliminar la certificación ${folio}`,
      mensaje: `Se borrará la certificación ${folio}${c?.cliente ? ` de ${c.cliente}` : ""}. `
        + "Si ya se entregó, su código QR dejará de validarla. Esta acción no se puede deshacer.",
      textoConfirmar: "Eliminar certificación",
      destructivo: true,
    });
    if (!ok) return;
    setCerts((prev) => prev.filter((x) => x.id !== c.id));
    if (sel?.id === c.id) setSel(null);
  };
  // Obra que llega desde el detalle de obra ("Crear certificación").
  const obraSolicitada = intencion?.pantalla==="certificaciones" ? intencion.obraId : null;
  // Al llegar desde el boton «Certificar» de un informe viene tambien de cual,
  // para no tener que elegirlo a mano cuando la obra tiene varios.
  const informeSolicitado = intencion?.pantalla==="certificaciones" ? (intencion.informeId || "") : "";
  const obraInicial = obras.find((x)=>x.id===obraSolicitada) || obras[0] || null;
  // El NIT no se escribe a mano: ya esta en algun lado del sistema. Se busca
  // en la propia obra, luego en la ficha del cliente y por ultimo en la
  // cotizacion que dio origen a la obra. Se compara por razon social
  // acomodada, para que "Proco Inc" encuentre a "PROCO INC".
  const buscarNit=(obra,clienteTexto)=>{
    if(obra?.nit) return obra.nit;
    const nombre=normalizarRazonSocial(clienteTexto || obra?.cliente || "");
    if(!nombre) return "";

    const ficha=(clientes||[]).find((c)=>normalizarRazonSocial(c.nombre)===nombre);
    if(ficha?.nit) return ficha.nit;

    const vinculada=obra?.cotizacionId
      ? (cotizaciones||[]).find((c)=>c.id===obra.cotizacionId)
      : null;
    if(vinculada?.nit) return vinculada.nit;

    const porNombre=(cotizaciones||[]).find((c)=>normalizarRazonSocial(c.cliente)===nombre && c.nit);
    return porNombre?.nit || "";
  };

  // La direccion tambien sale de la ficha del cliente, no de la obra. En la
  // obra suele estar la sede concreta -"TENERIFE #43"- y en el certificado
  // tiene que ir la del cliente, que es a quien se le expide el documento.
  const buscarDireccionCliente=(obra,clienteTexto)=>{
    const nombre=normalizarRazonSocial(clienteTexto || obra?.cliente || "");
    if(nombre){
      const ficha=(clientes||[]).find((c)=>normalizarRazonSocial(c.nombre)===nombre);
      if(ficha?.direccion) return ficha.direccion;
      const vinculada=obra?.cotizacionId
        ? (cotizaciones||[]).find((c)=>c.id===obra.cotizacionId)
        : null;
      if(vinculada?.direccion) return vinculada.direccion;
    }
    return obra?.direccion || obra?.ciudad || "";
  };

  const [nueva,setNueva]=useState(()=>Boolean(obraSolicitada));
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(()=>{
    // La fecha del informe TAMBIEN al montar, no solo al elegir obra a mano.
    const fechaObra = fechaDesdeInformes(ctx.informes, obraInicial?.id, informeSolicitado);
    const cotIni = obraInicial?.cotizacionId ? (cotizaciones||[]).find(c=>c.id===obraInicial.cotizacionId) : null;
    const cotRedactada = cotIni ? redactarSistemasDesdeCotizacion(cotIni) : null;
    const cantIni = cotRedactada?.cantidadTotal || 1;
    const inicial = buildCertForm({
      elementos:getCertDefaultElements("Certificación"),
      obraId: obraInicial?.id || "",
      cliente: obraInicial?.cliente || "",
      direccion: buscarDireccionCliente(obraInicial),
      nit: buscarNit(obraInicial),
      cantidad: cantIni,
      ...(fechaObra ? {fecha:fechaObra} : {}),
    });
    if(obraInicial?.id){
      const detalleIni = cotRedactada?.texto
        || observacionesDesdeInformes(ctx.informes, obraInicial.id, informeSolicitado)
        || actividadesDesdeInformes(ctx.informes, obraInicial.id, informeSolicitado);
      const t = construirTextoSistema({
        tipo: inicial.tipo,
        tipoSistema: inicial.tipoSistema,
        cantidad: inicial.cantidad,
        cliente: inicial.cliente,
        nit: inicial.nit,
        direccion: inicial.direccion,
        fechaLarga: fmtL(inicial.fecha),
        normativa: inicial.normativa,
        lugar: inicial.lugar || proyectoDesdeInformes(ctx.informes, obraInicial.id, informeSolicitado) || obraInicial.proyecto || "",
        detalle: detalleIni,
      });
      if(t) inicial.sistema = t;
    }
    return inicial;
  });

  // Se descarta al salir, para que al volver por el menu no se reabra.
  useEffect(()=>()=>limpiarIntencion(),[limpiarIntencion]);
  const [nuevoElem,setNuevoElem]=useState("");

  // Una obra puede tener VARIOS informes -una sede por informe- y de cada uno
  // sale su propia certificacion. Por eso se elige de cual se toman los datos
  // en vez de juntarlos todos: certificar "San Blas" y "Medellin" en el mismo
  // documento seria decir que se hizo en un sitio lo que se hizo en otro.
  const informesDeObra = (obraId)=>
    (informes||[]).filter((inf)=>inf?.obraId===obraId);

  // El informe elegido en el formulario, si hay mas de uno.
  const [informeRef,setInformeRef]=useState(informeSolicitado);

  const proyectoDeObra = (obraId)=>
    proyectoDesdeInformes(informes, obraId, informeRef)
    || String((obras||[]).find((o)=>o.id===obraId)?.proyecto || "").trim();

  // Obtiene los sistemas redactados gramaticalmente con cantidades en letras y números
  // a partir de la cotización que dio origen a la obra.
  const sistemasDesdeCotizacionDeObra = (obraId) => {
    const o = (obras || []).find((x) => x.id === obraId);
    if (!o?.cotizacionId) return null;
    const cot = (cotizaciones || []).find((c) => c.id === o.cotizacionId);
    if (!cot) return null;
    return redactarSistemasDesdeCotizacion(cot);
  };

  // QUE se certifica:
  // 1. Si la obra proviene de una cotización con sistemas aprobados, se redactan
  //    automáticamente: "cuatro (4) líneas de vida horizontales de 12 m...".
  // 2. Si no, se toma la observación escrita a mano en el informe de actividades.
  // 3. Como respaldo, las actividades registradas.
  const queSeCertifica = (obraId, fuente = "auto") => {
    const desdeCot = sistemasDesdeCotizacionDeObra(obraId);
    const obsInf = observacionesDesdeInformes(informes, obraId, informeRef);
    const actInf = actividadesDesdeInformes(informes, obraId, informeRef);

    if (fuente === "cotizacion" && desdeCot?.texto) return desdeCot.texto;
    if (fuente === "informe" && (obsInf || actInf)) return obsInf || actInf;

    if (desdeCot?.texto) return desdeCot.texto;
    return obsInf || actInf;
  };

  // La fecha del certificado sale del informe de actividades de esa obra.
  //
  // Se certifica lo que se termino de hacer, y esa fecha esta en el periodo del
  // informe. Antes el certificado nacia con la fecha de hoy, que es la de
  // escribirlo, no la del trabajo: si se certificaba una semana despues, el
  // documento decia una fecha en la que no se hizo nada.
  //
  // Se toma el FIN del periodo -el ultimo dia trabajado- y, si hay varios
  // informes de la obra, el mas reciente.
  const fechaDeLaObra = (obraId)=>fechaDesdeInformes(informes, obraId, informeRef);

  // Cambia algo del encabezado -tipo, sistema, cantidad, cliente, dirección o
  // fecha- y el párrafo se rehace. Solo mientras nadie lo haya editado a mano:
  // en cuanto se toca, manda lo escrito y esto deja de pisarlo.
  const aplicarCambio=(patch, refInforme=informeRef, fuente="auto")=>{
    setForm((prev)=>{
      const siguiente={...prev,...patch};
      if(siguiente.sistemaAuto!==false){
        const detalleTexto = queSeCertifica(siguiente.obraId, fuente);
        const texto=construirTextoSistema({
          tipo:siguiente.tipo,
          tipoSistema:siguiente.tipoSistema,
          cantidad:siguiente.cantidad,
          cliente:siguiente.cliente,
          nit:siguiente.nit,
          direccion:siguiente.direccion,
          fechaLarga:fmtL(siguiente.fecha),
          normativa:siguiente.normativa,
          lugar:siguiente.lugar
            || proyectoDesdeInformes(informes, siguiente.obraId, refInforme)
            || String((obras||[]).find((o)=>o.id===siguiente.obraId)?.proyecto || "").trim(),
          detalle: detalleTexto,
        });
        if(texto) siguiente.sistema=texto;
      }
      // El proximo mantenimiento va pegado a la fecha del certificado -un año
      // justo, que es lo que promete el documento- mientras nadie lo haya
      // escrito a mano.
      if(patch.fecha!==undefined && siguiente.proxMantAuto!==false){
        siguiente.proxMant=unAnoDespues(siguiente.fecha);
      }
      return siguiente;
    });
  };

  const rehacerTexto=(fuente="auto")=>{
    // Rehacer es volver a armarlo con los datos buenos, asi que la direccion
    // se vuelve a traer de la ficha del cliente en vez de usar la que quedo.
    const obraSel=obras.find((x)=>x.id===form.obraId);
    const direccionCliente=buscarDireccionCliente(obraSel, form.cliente) || form.direccion;
    const detalleTexto = queSeCertifica(form.obraId, fuente);
    const texto=construirTextoSistema({
      tipo:form.tipo,
      tipoSistema:form.tipoSistema,
      cantidad:form.cantidad,
      cliente:form.cliente,
      nit:form.nit,
      direccion:direccionCliente,
      fechaLarga:fmtL(form.fecha),
      normativa:form.normativa,
      lugar:form.lugar || proyectoDeObra(form.obraId),
      detalle:detalleTexto,
    });
    if(!texto){
      window.alert("Para armar el texto hace falta el cliente. Elige la obra y se completa solo.");
      return;
    }
    setForm((prev)=>({...prev,direccion:direccionCliente,sistema:texto,sistemaAuto:true}));
  };

  // Al abrir una certificacion nueva se preselecciona la primera obra real
  // y se traen sus datos, para no tener que reescribir cliente y direccion.
  // El formulario va arriba del listado (o del detalle): «Editar» y «+ Certificación»
  // desde abajo lo abrian fuera de la vista. Sube solo hasta el.
  const [formRef, subirAlFormulario] = useSubirAlFormulario();
  // Abrir el detalle de una certificacion de abajo tambien empieza arriba.
  useEffect(()=>{
    if(sel && !nueva) scrollAppToTop("auto");
  }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirNuevaCertificacion = (tipo="Certificación", obraId=null)=>{
    const obra = obras.find((x)=>x.id===obraId) || obras[0] || null;
    setEditId(null);
    setNuevoElem("");
    setInformeRef("");
    // La cantidad y la fecha tambien se traen de una: son los dos datos que se
    // copiaban a mano de la cotizacion y del informe.
    const fechaObra = fechaDeLaObra(obra?.id);
    const cotDeObra = sistemasDesdeCotizacionDeObra(obra?.id);
    const cantSugerida = cotDeObra?.cantidadTotal || 1;
    const nuevo = buildCertForm({
      tipo,
      elementos:getCertDefaultElements(tipo),
      obraId: obra?.id || "",
      cliente: obra?.cliente || "",
      direccion: buscarDireccionCliente(obra),
      nit: buscarNit(obra),
      cantidad: cantSugerida,
      ...(fechaObra ? {fecha:fechaObra} : {}),
    });
    if(obra?.id){
      const t = construirTextoSistema({
        tipo: nuevo.tipo,
        tipoSistema: nuevo.tipoSistema,
        cantidad: nuevo.cantidad,
        cliente: nuevo.cliente,
        nit: nuevo.nit,
        direccion: nuevo.direccion,
        fechaLarga: fmtL(nuevo.fecha),
        normativa: nuevo.normativa,
        lugar: nuevo.lugar || proyectoDeObra(obra.id),
        detalle: queSeCertifica(obra.id),
      });
      if(t) nuevo.sistema = t;
    }
    setForm(nuevo);
    setNueva(true);
    subirAlFormulario();
  };

  useEffect(() => {
    if (intencion?.pantalla === "certificaciones" && intencion?.obraId) {
      abrirNuevaCertificacion("Certificación", intencion.obraId);
    }
  }, [intencion]); // eslint-disable-line react-hooks/exhaustive-deps

  const editarCertificacion = (cert)=>{
    setEditId(cert.id);
    setNuevoElem("");
    setForm(buildCertForm(cert));
    setNueva(true);
    setSel(cert);
    subirAlFormulario();
  };

  // Un segundo clic en «Guardar» antes de que se cierre el formulario creaba
  // otra certificación igual.
  const guardandoRef = useRef(false);

  const guardar=async()=>{
    if (guardandoRef.current) return;
    // Requisito obligatorio: no se certifica una obra cuya acta de entrega no
    // este hecha Y firmada por el cliente. Lo que cierra la entrega es la
    // firma de quien recibe; sin ella la obra no esta entregada.
    //
    // Solo se bloquea al CREAR y cuando ya se sabe el estado de las firmas:
    // una certificacion vieja se sigue pudiendo corregir, y un corte de red
    // no puede dejar sin certificar a obras que si estan firmadas.
    // La alarma se muestra en el banner superior del formulario; no bloquea el guardado según solicitud.
    guardandoRef.current = true;
    try {
      // La misma obra (y sede) no se certifica dos veces mientras la anterior
      // siga vigente. Paso con una obra certificada tres veces el mismo dia.
      // Solo al crear: al editar se deja corregir aunque ya hubiera repetidas.
      const repetida = editId ? null : certificacionRepetida(certs, { ...form, obraId: form.obraId || null });
      if (repetida) {
        const folio = repetida.numero || repetida.id;
        const ver = await confirmar({
          titulo: "Esta obra ya está certificada",
          mensaje: `${repetida.tipo || "La certificación"} ${folio} de ${repetida.cliente || "este cliente"} sigue vigente`
            + (repetida.proxMant ? ` hasta el ${fmtL(repetida.proxMant)}` : "")
            + ". No se puede crear otra para la misma obra y sede. Si hay que corregir algo, edita la que ya existe; "
            + "si es otra sede de la obra, escríbela en el campo de la sede.",
          textoConfirmar: `Ver ${folio}`,
          textoCancelar: "Volver al formulario",
          destructivo: false,
          conGuardando: false,
        });
        if (ver) {
          setNueva(false);
          setEditId(null);
          setSel(repetida);
        }
        return;
      }
      guardarSinRepetir();
    } finally {
      setTimeout(() => { guardandoRef.current = false; }, 800);
    }
  };

  const guardarSinRepetir=()=>{
    const prev = editId ? certs.find((item) => item.id === editId) : null;
    const miUserId = ctx?.membresia?.userId || null;
    const miNombre = resolverAutorGuardado(ctx?.membresia, prev?.modificadoPorNombre);
    const obraIdNormalizado = form.obraId || null;
    const c = {
      ...(editId
        ? { ...form, obraId: obraIdNormalizado, id: editId, estado: form.estado || "Vigente" }
        : { id: siguienteIdUnico(certs, "CERT"), estado: "Vigente", ...form, obraId: obraIdNormalizado }),
      // El codigo del QR no cambia nunca: un QR ya impreso tiene que seguir
      // sirviendo despues de editar el certificado.
      codigoVerificacion: prev?.codigoVerificacion || form.codigoVerificacion || nuevoCodigoVerificacion(),
      creadoPor: prev?.creadoPor || miUserId,
      creadoPorNombre: prev?.creadoPorNombre ? normalizarNombrePersona(prev.creadoPorNombre, "Camila Sepúlveda") : (resolverAutorGuardado(ctx?.membresia) || "Camila Sepúlveda"),
      creadoEn: prev?.creadoEn || new Date().toISOString(),
      modificadoPor: miUserId,
      modificadoPorNombre: miNombre || resolverAutorGuardado(ctx?.membresia, prev?.modificadoPorNombre) || "Camila Sepúlveda",
      modificadoEn: new Date().toISOString(),
    };
    setCerts(prevList=>editId ? prevList.map(item=>item.id===editId?{...item,...c}:item) : [...prevList,c]);
    setNueva(false);
    setSel(c);
    setEditId(null);
  };

  // El certificado se descarga solo, con su nombre, sin pasar por el cuadro
  // de impresion de Chrome. Igual que la cotizacion y el informe.
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  const descargarPdf = async (c = sel) => {
    if (!c || descargandoPdf) return;
    setDescargandoPdf(true);
    try {
      if (!sel || sel.id !== c.id) {
        setSel(c);
        await new Promise((r) => setTimeout(r, 260));
      }
      const nodo = document.getElementById("pz");
      if (!nodo) {
        alert("No se encontró el documento para generar el PDF.");
        return;
      }
      // Con la obra dentro: en una carpeta con veinte certificaciones,
      // «CERT-002» a secas no dice de cual es.
      await descargarDocumentoPdf(
        nodo,
        nombreDocumento(c.tipo || "Certificación", [c.numero || c.id, c.lugar, c.cliente])
      );
    } catch (err) {
      console.error("Error al descargar PDF del certificado:", err);
      alert("No se pudo generar el PDF. Puedes imprimirlo con el botón de Imprimir.");
    } finally {
      setDescargandoPdf(false);
    }
  };

  const imprimir = (c) => {
    setSel(c);
    setTimeout(() => printCurrentPz("Certificación " + (c?.numero || c?.id || "")), 250);
  };

  // En la barra superior: botones de acción fija para detalle (Volver, Editar, Descargar, Imprimir)
  // o botones de creación (+ Certificación, + Recertificación) en la lista.
  // Mismos botones y mismo orden que en informes y cotizaciones.
  const accionesCertRef = useRef({});
  useEffect(() => { accionesCertRef.current = { editarCertificacion, descargarPdf, imprimir }; });
  useAccionesPantalla(
    sel && !nueva ? (
      <div style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "nowrap" }}>
        <Button variante="texto" tam="sm" icono="flechaIzq" onClick={() => setSel(null)}>
          Certificaciones
        </Button>
        <Button variante="texto" tam="sm" onClick={() => accionesCertRef.current.editarCertificacion(sel)}>
          Editar
        </Button>
        <Button variante="texto" tam="sm" onClick={() => accionesCertRef.current.imprimir(sel)}>
          Imprimir
        </Button>
        <Button
          variante="oscuro"
          tam="sm"
          icono="descargar"
          style={{ marginLeft: 6 }}
          disabled={descargandoPdf}
          onClick={() => accionesCertRef.current.descargarPdf(sel)}
        >
          {descargandoPdf ? "Generando…" : "Descargar PDF"}
        </Button>
      </div>
    ) : (!sel && !nueva) ? (
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        <button
          style={{
            background: "var(--surface, #ffffff)",
            color: "var(--text-main, #101828)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
            borderRadius: 10,
            padding: "7px 13px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
          onClick={() => abrirNuevaCertificacion("Recertificación")}
        >
          + Recertificación
        </button>
        <button
          style={{
            ...B("#1d1d1f"),
            fontSize: 12,
            padding: "7px 14px",
            fontWeight: 600,
            borderRadius: 10,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
          }}
          onClick={() => abrirNuevaCertificacion("Certificación")}
        >
          + Certificación
        </button>
      </div>
    ) : null,
    [sel, nueva, descargandoPdf]
  );
  useTituloPantalla(sel && !nueva ? `Certificación ${sel.numero || sel.id}` : null);

  return(
    <div
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "14px 16px 28px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >


      {obras.length===0 && (
        <AvisoFlujo
          tono="falta"
          titulo="Primero hay que aprobar la obra"
          pasos={[
            "Ve a Cotizaciones y abre la cotización que el cliente aceptó.",
            "Dale «Aprobar». El sistema crea la obra solo, con el mismo número.",
            "Cuando terminen el trabajo, vuelve aquí y genera el certificado.",
          ]}
          accion={
            <button
              onClick={()=>irAPantalla("cotizacion")}
              style={{...B("#1d1d1f"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center",borderRadius:10}}
            >
              Ir a Cotizaciones
            </button>
          }
        >
          Todavía no hay obras en el sistema, y el certificado se genera a partir de una obra.
        </AvisoFlujo>
      )}

      {nueva&&(
        <div ref={formRef} style={{
          ...CD,
          marginBottom: 24,
          scrollMarginTop: 16,
        }}>
          {/* Cabecera como la del informe: titulo en su tamaño de siempre, la
              norma en gris debajo y los dos datos clave como texto, sin la
              caja rosada ni la etiqueta roja. */}
          <div style={{
            marginBottom: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 12
          }}>
            <div>
              <div style={{fontSize:18,fontWeight:700,letterSpacing:"-0.015em",lineHeight:1.25,color:"var(--text-primary)"}}>
                {editId ? `Editar ${form.tipo || "Certificación"} ${form.numero || ""}` : `Nueva ${(form.tipo || "Certificación").toLowerCase()} de seguridad`}
              </div>
              <div style={{fontSize:12,color:"var(--text-tertiary)",marginTop:3}}>
                Protocolo técnico oficial · Resolución 4272 de 2021 y ANSI Z359
              </div>
            </div>

            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:11,color:"var(--text-tertiary)"}}>Validez máxima</div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>12 meses</div>
              </div>
              <div>
                <div style={{fontSize:11,color:"var(--text-tertiary)"}}>Folio</div>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)",fontVariantNumeric:"tabular-nums"}}>{form.numero || "Automático"}</div>
              </div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
            <div><LBL>Obra asociada</LBL>{!obras.length && <div style={{fontSize:10.5,color:"#b45309",marginBottom:4}}>No hay obras. Aprueba una cotización para crear la obra.</div>}<select value={form.obraId} onChange={e=>{const id=e.target.value;setInformeRef("");const o=obras.find(x=>x.id===id);const f=fechaDeLaObra(id);const c=sistemasDesdeCotizacionDeObra(id);aplicarCambio({obraId:id,cliente:o?.cliente||"",direccion:buscarDireccionCliente(o),nit:buscarNit(o),cantidad:c?.cantidadTotal || 1,...(f?{fecha:f}:{})}, "");}} style={SI}>{obrasMasNuevasPrimero(obras).map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            {/* Una obra con varias sedes lleva un informe por sede, y de cada
                uno sale su propia certificacion. Aqui se elige cual. */}
            {informesDeObra(form.obraId).length > 1 && (
              <div style={{gridColumn:"span 2"}}>
                <LBL>¿De cuál informe?</LBL>
                <select
                  value={informeRef}
                  onChange={e=>{
                    const id=e.target.value;
                    setInformeRef(id);
                    const inf=(informes||[]).find((x)=>x.id===id);
                    if(!inf) return;
                    // El "instalados en" es el NOMBRE del proyecto del informe
                    // -"CREAFAM SEDE SAN BLAS"-, no su localizacion, que es la
                    // direccion de la sede y no pinta nada ahi.
                    //
                    // La direccion se vuelve a traer de la ficha del cliente:
                    // antes se pisaba con la del informe y en el documento
                    // salia la de la sede en vez de la del cliente.
                    const obraSel=obras.find((x)=>x.id===form.obraId);
                    aplicarCambio({
                      direccion:buscarDireccionCliente(obraSel, form.cliente),
                      lugar:proyectoDesdeInformes(informes, form.obraId, id),
                      ...(inf.periodoFin || inf.fechaInforme ? {fecha:inf.periodoFin || inf.fechaInforme} : {}),
                    }, id);
                  }}
                  style={SI}
                >
                  <option value="">Todos los informes de la obra</option>
                  {informesDeObra(form.obraId).map((inf)=>(
                    <option key={inf.id} value={inf.id}>
                      {inf.id} · {inf.proyecto || inf.localizacion || "sin nombre"}
                      {inf.periodoFin ? ` · hasta ${fmtD(inf.periodoFin)}` : ""}
                    </option>
                  ))}
                </select>
                <div style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)",marginTop:3,lineHeight:1.45}}>
                  Esta obra tiene {informesDeObra(form.obraId).length} informes. Elige uno y el
                  certificado toma su sede, su fecha y lo que se hizo ahí. Haz una certificación
                  por cada informe.
                </div>
              </div>
            )}

            {/* El candado del acta, a la vista y no solo al pulsar Guardar. */}
            {(() => {
              if (editId || !estadosActasListos) return null;
              const obraSel = obras.find((x) => x.id === form.obraId);
              const motivo = obraSel ? motivoActaPendiente(obraSel, estadosActas) : "";
              if (!motivo) return null;
              return (
                <div style={{gridColumn:"span 3",padding:"8px 12px",borderRadius:8,background:"#fff1f0",border:"1px solid #ffa39e",color:"#cf1322",fontSize:12,lineHeight:1.45}}>
                  ⚠️ <strong>
                    {motivo === "sin-acta"
                      ? "Esta obra no tiene acta de entrega (FORM-SST-89)."
                      : "El cliente todavía no ha firmado el acta de entrega (FORM-SST-89)."}
                  </strong>{" "}
                  {AVISO_ACTA_SIN_FIRMAR}
                </div>
              );
            })()}
            <div><LBL>Tipo</LBL><select value={form.tipo} onChange={e=>{
              const t=e.target.value;
              aplicarCambio({tipo:t,elementos:getCertDefaultElements(t, form.tipoSistema)});
            }} style={SI}>{["Certificación","Recertificación"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><LBL>Número</LBL><input value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})} placeholder="C-2026-001" style={SI}/></div>
            <div>
              <LBL>Fecha</LBL>
              <input type="date" value={form.fecha} onChange={e=>aplicarCambio({fecha:e.target.value})} style={SI}/>
              {/* De donde salio, para que se note que no es la de hoy sino la
                  del trabajo, y se pueda cambiar sabiendo lo que se cambia. */}
              {fechaDeLaObra(form.obraId) && (
                <div style={{fontSize:10,color: form.fecha===fechaDeLaObra(form.obraId) ? "#34d399" : "#f59e0b", marginTop:3, lineHeight:1.4}}>
                  {form.fecha===fechaDeLaObra(form.obraId)
                    ? <>Es el fin del período del informe de {form.obraId}.</>
                    : <>El informe de {form.obraId} termina el {fmtD(fechaDeLaObra(form.obraId))}.</>}
                </div>
              )}
            </div>
            <div><LBL>Cliente</LBL><input value={form.cliente} onChange={e=>aplicarCambio({cliente:e.target.value})} onBlur={e=>{
              const nombre=normalizarRazonSocial(e.target.value);
              // Si el NIT esta vacio se busca el de ese cliente; si ya hay uno
              // escrito no se pisa, que puede ser una sede o un caso especial.
              const nit=form.nit || buscarNit(null,nombre);
              aplicarCambio({cliente:nombre,nit});
            }} style={SI}/></div>
            <div><LBL>NIT</LBL><input value={form.nit} onChange={e=>setForm({...form,nit:e.target.value})} style={SI}/></div>
            <div style={{gridColumn:"span 2"}}><LBL>Dirección del cliente</LBL><input value={form.direccion} onChange={e=>aplicarCambio({direccion:e.target.value})} onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==form.direccion)aplicarCambio({direccion:v});}} style={SI}/></div>
            <div>
              <LBL>Próximo mantenimiento</LBL>
              {/* Al escribirlo a mano deja de seguir a la fecha. */}
              <input type="date" value={form.proxMant}
                onChange={e=>setForm({...form,proxMant:e.target.value,proxMantAuto:false})} style={SI}/>
              <div style={{fontSize:10,color:form.proxMant?"#34d399":"#f59e0b",marginTop:3,lineHeight:1.4}}>
                {form.proxMant
                  ? (form.proxMantAuto!==false
                      ? "Propuesto a un año de la fecha, como dice el documento. Cámbialo si aplica otro plazo."
                      : "Fecha puesta a mano.")
                  : "Sin esta fecha la certificación no aparece en Vencimientos ni en las alertas."}
              </div>
            </div>
          </div>
          {/* El sitio concreto dentro del edificio. Se escribe aqui porque no
              esta en ningun otro documento: se intento sacarlo de las
              observaciones del informe y salia "instalados en 1 LINEA DE VIDA
              HORIZONTAL DE 7 M PERIMETRAL", que dice que se hizo, no donde. */}
          <div style={{marginBottom:12}}>
            <LBL>¿Dónde se instaló?</LBL>
            <input
              value={form.lugar || ""}
              onChange={e=>aplicarCambio({lugar:e.target.value})}
              onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==form.lugar)aplicarCambio({lugar:v});}}
              placeholder={proyectoDeObra(form.obraId) || "El cuarto de ascensores · La cubierta del bloque 2…"}
              style={SI}
            />
            <div style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)",marginTop:3}}>
              Sale en el certificado: «instalados en <strong>{(form.lugar||proyectoDeObra(form.obraId)||"…").toUpperCase()}</strong>».
              Vacío toma el nombre del proyecto del informe. Escribe aquí si quieres precisar el
              sitio: «el cuarto de ascensores», «la cubierta del bloque 2».
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <LBL>Sistema certificado</LBL>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                {sistemasDesdeCotizacionDeObra(form.obraId)?.texto && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = sistemasDesdeCotizacionDeObra(form.obraId);
                      if (c?.texto) {
                        aplicarCambio({ cantidad: c.cantidadTotal, sistemaAuto: true }, informeRef, "cotizacion");
                      }
                    }}
                    style={{
                      background: "#FFFAEB",
                      color: "#B54708",
                      border: "1px solid rgba(181, 71, 8, 0.35)",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                    title="Cargar los sistemas con cantidades en letras y números desde la cotización vinculada"
                  >
                    Desde cotización ({obras.find(o=>o.id===form.obraId)?.cotizacionId ? (cotizaciones.find(c=>c.id===obras.find(o=>o.id===form.obraId)?.cotizacionId)?.numero || "Cot") : "Cot"})
                  </button>
                )}
                {(observacionesDesdeInformes(informes, form.obraId, informeRef) || actividadesDesdeInformes(informes, form.obraId, informeRef)) && (
                  <button
                    type="button"
                    onClick={() => aplicarCambio({ sistemaAuto: true }, informeRef, "informe")}
                    style={{
                      background: "var(--surface-subtle, #f2f4f7)",
                      color: "var(--text-main, #1e293b)",
                      border: "1px solid var(--border, #cbd5e1)",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                    title="Cargar la redacción registrada en el informe de actividades"
                  >
                    Desde informe
                  </button>
                )}
                <BotonCorregir
                  valor={form.sistema}
                  onChange={(v)=>setForm(p=>({...p,sistema:normalizarTextoCertificacion(v),sistemaAuto:false}))}
                  compacto
                />
                <button onClick={()=>rehacerTexto("auto")} style={{...B("var(--btn-cancelar-bg, #f1f5f9)","var(--btn-cancelar-txt, #475569)"),fontSize:11,padding:"5px 11px"}}>
                  Rehacer
                </button>
              </div>
            </div>
            <textarea
              value={form.sistema}
              onChange={e=>setForm({...form,sistema:e.target.value,sistemaAuto:false})}
              onBlur={e=>{const v=normalizarTextoCertificacion(e.target.value);if(v!==form.sistema)setForm(p=>({...p,sistema:v}));}}
              rows={4}
              placeholder="Se arma solo al llenar el tipo, el sistema, la cantidad y el cliente. También puedes escribirlo a mano."
              spellCheck lang="es"
              style={{...SI,resize:"vertical"}}
            />
            <div style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)",marginTop:3}}>
              {form.sistemaAuto===false
                ? "Lo estás escribiendo a mano, así que ya no se rehace solo. Usa el botón para volver al texto automático."
                : "Se actualiza solo con lo que elijas arriba. En cuanto lo edites, deja de hacerlo."}
            </div>
            {/* Indicador de fuente del texto */}
            {sistemasDesdeCotizacionDeObra(form.obraId)?.texto ? (
              <div style={{fontSize:10.5,color:"#15803d",marginTop:5,lineHeight:1.5}}>
                ✓ Redacción legal generada automáticamente desde la <strong>cotización vinculada</strong>: cantidades en letras y números según Res. 4272/2021.
              </div>
            ) : queSeCertifica(form.obraId) ? (
              <div style={{fontSize:10.5,color:"#34d399",marginTop:5,lineHeight:1.5}}>
                Se arma con lo registrado en la obra: <strong>qué se certifica</strong> del informe, <strong>dónde</strong> del nombre del proyecto, y el NIT y la dirección del cliente.
              </div>
            ) : null}
          </div>
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <LBL>Elementos y Componentes Utilizados ({form.elementos.length})</LBL>
              <span style={{fontSize:11,color:"var(--text-subtle, #94a3b8)"}}>Componentes certificados instalados o inspeccionados</span>
            </div>

            <div style={{display:"flex",flexDirection:"column",marginBottom:12}}>
              {form.elementos.map((el,i)=>(
                <div key={i} style={{
                  display:"flex",
                  gap:10,
                  alignItems:"center",
                  borderTop: i===0 ? "none" : "1px solid var(--separator)",
                  padding:"4px 2px"
                }}>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: "var(--text-subtle, #94a3b8)",
                    width: 24,
                    textAlign: "center",
                    flexShrink: 0
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <input
                    value={el}
                    onChange={e=>setForm({...form,elementos:form.elementos.map((x,j)=>j===i?e.target.value:x)})}
                    onBlur={e=>{
                      const auto=corregirOrtografiaLocal(e.target.value);
                      if(auto!==el)setForm(prev=>({...prev,elementos:prev.elementos.map((x,j)=>j===i?auto:x)}));
                    }}
                    style={{...SI,fontSize:12.5,border:"none",background:"transparent",padding:"4px 0",boxShadow:"none"}}
                  />
                  <button
                    type="button"
                    onClick={()=>setForm({...form,elementos:form.elementos.filter((_,j)=>j!==i)})}
                    title="Eliminar elemento"
                    style={{
                      background:"transparent",
                      border:"none",
                      color:"var(--text-tertiary)",
                      borderRadius:6,
                      width:28,
                      height:28,
                      cursor:"pointer",
                      fontSize:14,
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      flexShrink:0
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:10}}>
              <input
                value={nuevoElem}
                onChange={e=>setNuevoElem(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==="Enter"){
                    e.preventDefault();
                    if(nuevoElem.trim()){
                      const val=corregirOrtografiaLocal(nuevoElem.trim());
                      setForm({...form,elementos:[...form.elementos,val]});
                      setNuevoElem("");
                    }
                  }
                }}
                placeholder="Escribe un componente y presiona Enter para agregar..."
                style={{...SI,fontSize:12.5,flex:1}}
              />
              <button
                type="button"
                onClick={()=>{
                  if(nuevoElem.trim()){
                    const val=corregirOrtografiaLocal(nuevoElem.trim());
                    setForm({...form,elementos:[...form.elementos,val]});
                    setNuevoElem("");
                  }
                }}
                style={{
                  ...B("#1d1d1f","#ffffff"),
                  padding:"8px 16px",
                  fontSize:12,
                  fontWeight:600,
                  borderRadius:10,
                  flexShrink:0,
                  boxShadow:"0 1px 3px rgba(0, 0, 0, 0.12)",
                }}
              >
                + Agregar Elemento
              </button>
            </div>
          </div>
          <div style={{display:"flex",gap:12,marginTop:18,paddingTop:14,borderTop:"1px solid var(--border-color, #e2e8f0)"}}>
            <button
              style={{
                ...B("#1d1d1f","#ffffff"),
                padding:"10px 24px",
                fontSize:13,
                fontWeight:600,
                borderRadius:10,
                boxShadow:"0 1px 3px rgba(0, 0, 0, 0.12)"
              }}
              onClick={guardar}
            >
              {editId ? "Guardar cambios" : "Guardar certificación"}
            </button>
            <button
              style={{
                ...B("var(--btn-cancelar-bg, #f1f5f9)","var(--btn-cancelar-txt, #475569)"),
                padding:"10px 20px",
                fontSize:13,
                fontWeight:600,
                borderRadius:10
              }}
              onClick={()=>{setNueva(false);setEditId(null);}}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Se esconde mientras se esta llenando una certificacion: la pantalla se
          dedica al formulario y no a las que ya estan hechas. */}
      {!sel&&!nueva&&(
        <ListaCertificaciones
          certs={certs}
          acciones={{
            ver: (c)=>setSel(c),
            editar: (c)=>editarCertificacion(c),
            descargarPdf: (c)=>descargarPdf(c),
            imprimir: (c)=>imprimir(c),
            // Eliminar es solo de Camila Sepúlveda: a nadie mas le sale el boton.
            ...(puedeEliminar ? { eliminar: (c)=>eliminarCertificacion(c) } : {}),
          }}
        />
      )}

      {sel && !nueva && (
        <CertificacionDetalle
          cert={sel}
          onVolver={()=>setSel(null)}
          onEditar={editarCertificacion}
          onImprimir={imprimir}
          onDescargarPdf={descargarPdf}
          accionesEnBarra
          subtitle="Vista previa completa para revisar, editar e imprimir."
        />
      )}
    </div>
  );
}

// ======================================================
// INFORMES DE ACTIVIDADES
// ======================================================

