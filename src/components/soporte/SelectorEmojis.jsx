import { useState, useRef, useEffect, useMemo } from "react";

const CATEGORIAS_EMOJIS = [
  {
    id: "frecuentes",
    nombre: "Populares",
    icono: "🔥",
    emojis: [
      "👍", "✅", "⚠️", "🏗️", "🔨", "🦺", "👷", "🪢", "🏢", "📐",
      "😀", "😂", "😊", "🤝", "📋", "📄", "💬", "❤️", "🔥", "🚀",
      "👏", "🙌", "👌", "💡", "📌", "🚨", "⏳", "💰", "🧾", "✨",
    ],
  },
  {
    id: "caras",
    nombre: "Caras y Gestos",
    icono: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉",
      "😊", "😇", "🥰", "😍", "🤩", "😘", "😋", "😜", "🤪", "😎",
      "🤓", "🥳", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "🙄", "😬",
      "😌", "😔", "😴", "😷", "🤒", "🤕", "🥺", "😭", "😤", "😡",
      "👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "🤙",
      "👌", "👊", "🤛", "🤜", "👋", "🤚", "✋", "✍️", "💪", "🫡",
    ],
  },
  {
    id: "obra",
    nombre: "Obra y Empresa",
    icono: "🏗️",
    emojis: [
      "🏗️", "🔨", "🦺", "👷", "👷‍♀️", "🪢", "🏢", "🏬", "🏭", "🏠",
      "📐", "📏", "🪜", "🧰", "🔧", "🔩", "⚙️", "🧱", "📦", "🚚",
      "🚛", "🚜", "📋", "📑", "📄", "📜", "📊", "📈", "📉", "💼",
      "📁", "📂", "🗂️", "✉️", "📧", "📞", "📱", "💻", "🖥️", "🖨️",
    ],
  },
  {
    id: "estados",
    nombre: "Estados y Alertas",
    icono: "✅",
    emojis: [
      "✅", "✔️", "❌", "✖️", "⚠️", "🚨", "🛑", "⛔", "⏳", "⌛",
      "⏰", "⏱️", "💡", "📌", "📍", "🎯", "💬", "🗨️", "🔔", "🔕",
      "🟢", "🟡", "🔴", "⚪", "⚫", "⭐", "🌟", "✨", "💯", "💰",
      "💵", "💳", "🧾", "🏷️", "🔒", "🔓", "🔍", "🔎", "🎉", "🚀",
    ],
  },
  {
    id: "corazones",
    nombre: "Corazones",
    icono: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🔥", "✨",
    ],
  },
];

export default function SelectorEmojis({ onSeleccionar, onCerrar, posicion = "arriba" }) {
  const [categoriaActiva, setCategoriaActiva] = useState("frecuentes");
  const [busqueda, setBusqueda] = useState("");
  const popoverRef = useRef(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onCerrar();
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCerrar]);

  const emojisFiltrados = useMemo(() => {
    if (!busqueda.trim()) {
      const cat = CATEGORIAS_EMOJIS.find((c) => c.id === categoriaActiva);
      return cat ? cat.emojis : CATEGORIAS_EMOJIS[0].emojis;
    }
    const q = busqueda.toLowerCase().trim();
    const todos = Array.from(new Set(CATEGORIAS_EMOJIS.flatMap((c) => c.emojis)));
    // Si escribe texto en español común, ofrecer mapeo inteligente
    const terminos = {
      obra: ["🏗️", "🔨", "🦺", "👷", "🪢", "🪜", "📐", "🧱"],
      anclaje: ["🪢", "🔩", "🔨", "🏗️"],
      alerta: ["⚠️", "🚨", "🛑", "⛔"],
      ok: ["✅", "✔️", "👍", "👌", "💯"],
      pago: ["💰", "💵", "💳", "🧾"],
      factura: ["🧾", "📄", "💰"],
      plano: ["📐", "📏", "📋", "🏢"],
      gracias: ["🙏", "🤝", "😊", "❤️"],
      feliz: ["😀", "😊", "😁", "🎉"],
      risa: ["😂", "🤣", "😆"],
      corazon: ["❤️", "💙", "💖", "🔥"],
      fuego: ["🔥", "🚀", "⚡"],
    };
    for (const [clave, lista] of Object.entries(terminos)) {
      if (clave.includes(q) || q.includes(clave)) {
        return lista;
      }
    }
    return todos;
  }, [categoriaActiva, busqueda]);

  return (
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        ...(posicion === "arriba" ? { bottom: "calc(100% + 8px)" } : { top: "calc(100% + 8px)" }),
        left: 0,
        zIndex: 100002,
        width: 320,
        maxWidth: "calc(100vw - 24px)",
        backgroundColor: "var(--surface, #ffffff)",
        border: "1px solid var(--border, #eaecf0)",
        borderRadius: 14,
        boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        animation: "fadeIn 0.12s ease",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Cabecera del selector */}
      <div
        style={{
          padding: "8px 10px",
          borderBottom: "1px solid var(--border, #eaecf0)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          backgroundColor: "var(--surface-subtle, #f9fafb)",
        }}
      >
        <input
          type="text"
          placeholder="Buscar emoji (ej: obra, ok, alerta)..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
          style={{
            flex: 1,
            border: "1px solid var(--border, #d0d5dd)",
            borderRadius: 8,
            padding: "5px 9px",
            fontSize: 12,
            outline: "none",
            backgroundColor: "var(--surface, #ffffff)",
            color: "var(--text-main, #101828)",
          }}
        />
        <button
          type="button"
          onClick={onCerrar}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted, #667085)",
            fontSize: 14,
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: 6,
          }}
          title="Cerrar emojis"
        >
          ✕
        </button>
      </div>

      {/* Barra de categorías */}
      {!busqueda && (
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border, #eaecf0)",
            backgroundColor: "var(--surface, #ffffff)",
            padding: "2px 6px",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {CATEGORIAS_EMOJIS.map((cat) => {
            const activo = categoriaActiva === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaActiva(cat.id)}
                title={cat.nombre}
                style={{
                  flex: 1,
                  background: activo ? "var(--surface-subtle, #f2f4f7)" : "transparent",
                  border: "none",
                  borderBottom: activo ? "2px solid #E0342A" : "2px solid transparent",
                  padding: "6px 2px",
                  fontSize: 16,
                  cursor: "pointer",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.12s ease",
                }}
              >
                {cat.icono}
              </button>
            );
          })}
        </div>
      )}

      {/* Grilla de emojis */}
      <div
        style={{
          maxHeight: 210,
          overflowY: "auto",
          padding: "8px 6px",
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 4,
          backgroundColor: "var(--surface, #ffffff)",
        }}
      >
        {emojisFiltrados.map((em, idx) => (
          <button
            key={`${em}-${idx}`}
            type="button"
            onClick={() => {
              onSeleccionar(em);
            }}
            style={{
              background: "transparent",
              border: "none",
              borderRadius: 8,
              padding: "6px 0",
              fontSize: 21,
              cursor: "pointer",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.1s ease, background 0.1s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--surface-subtle, #f2f4f7)";
              e.currentTarget.style.transform = "scale(1.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}
