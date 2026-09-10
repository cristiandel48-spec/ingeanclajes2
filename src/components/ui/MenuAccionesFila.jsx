import { useEffect, useRef, useState } from "react";

/**
 * Menú desplegable para acciones secundarias en filas de listados.
 * Reemplaza la saturación de botones multicolor por un botón kebab (...) discreto.
 *
 * @param {Array} items - Lista de acciones: [{ label, icon, onClick, danger, success, divider, title }]
 * @param {string} triggerLabel - Opcional, por defecto "···"
 */
export default function MenuAccionesFila({ items = [], triggerLabel = "···", triggerTitle = "Más acciones" }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const validItems = items.filter(Boolean);
  if (validItems.length === 0) return null;

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        title={triggerTitle}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          background: open ? "var(--surface-subtle, #f2f4f7)" : "transparent",
          color: "var(--text-muted, #475467)",
          border: "1px solid var(--border, #eaecf0)",
          borderRadius: 8,
          width: 28,
          height: 28,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          transition: "background .12s ease, border-color .12s ease, color .12s ease",
          lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--surface-subtle, #f2f4f7)";
          e.currentTarget.style.color = "var(--text-main, #101828)";
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted, #475467)";
          }
        }}
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 5px)",
            zIndex: 90,
            minWidth: 165,
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, #eaecf0)",
            borderRadius: 10,
            padding: "4px 0",
            boxShadow: "0 10px 24px -4px rgba(16,24,40,0.12), 0 4px 10px -2px rgba(16,24,40,0.06)",
            animation: "fadeInMenu 0.12s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {validItems.map((item, idx) => {
            if (item.divider) {
              return (
                <div
                  key={`div-${idx}`}
                  style={{ height: 1, background: "var(--border, #eaecf0)", margin: "4px 0" }}
                />
              );
            }

            const isDanger = Boolean(item.danger);
            const isSuccess = Boolean(item.success);
            const defaultColor = isDanger
              ? "#d92d20"
              : isSuccess
              ? "#079455"
              : "var(--text-main, #101828)";

            return (
              <button
                key={item.label || idx}
                type="button"
                title={item.title || item.label}
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  if (typeof item.onClick === "function") item.onClick(e);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  fontSize: 12.5,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  color: item.disabled ? "var(--text-subtle, #98a2b3)" : defaultColor,
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: item.disabled ? "default" : "pointer",
                  transition: "background .1s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!item.disabled) {
                    e.currentTarget.style.background = isDanger
                      ? "rgba(217, 45, 32, 0.08)"
                      : isSuccess
                      ? "rgba(7, 148, 85, 0.08)"
                      : "var(--surface-subtle, #f2f4f7)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {item.icon && (
                  <span style={{ fontSize: 13, flexShrink: 0, display: "inline-flex" }}>
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
