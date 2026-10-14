export default function H1({ title, subtitle, eyebrow, action, badge, divider = true, style }) {
  return (
    <div
      style={{
        marginBottom: 16,
        paddingBottom: divider ? 14 : 0,
        borderBottom: divider ? "1px solid var(--border, rgba(0, 0, 0, 0.08))" : "none",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        flexWrap: "wrap",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 200px" }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-subtle, #667085)",
              marginBottom: 3,
            }}
          >
            {eyebrow}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h1
            style={{
              fontSize: "clamp(19px, 4vw, 23px)",
              fontWeight: 700,
              letterSpacing: "-0.022em",
              margin: 0,
              color: "var(--text-main, #101828)",
              lineHeight: 1.25,
            }}
          >
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p
            style={{
              fontSize: 12.5,
              color: "var(--text-muted, #475467)",
              margin: "4px 0 0",
              lineHeight: 1.45,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div style={{ flexShrink: 0, maxWidth: "100%", boxSizing: "border-box" }}>
          {action}
        </div>
      )}
    </div>
  );
}

