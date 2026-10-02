// Ícono de Paloma (mensajera / enviado) basado en el dibujo de referencia
export default function IconoPalomita({ size = 19, color = "currentColor", strokeWidth = 14, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 227 222"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {/* Ala trasera */}
      <path d="M 112 105 C 122 75, 140 50, 162 54 C 172 65, 172 78, 168 92" />
      {/* Cabeza y pico */}
      <path d="M 67 102 L 54 113 L 65 120" />
      <path d="M 67 102 C 78 88, 98 88, 118 108" />
      {/* Ojo */}
      <circle cx="81" cy="107" r="4.5" fill={color} />
      {/* Pecho, vientre y cola */}
      <path d="M 65 120 C 78 145, 92 178, 120 198 C 145 208, 175 208, 200 214 C 206 205, 198 190, 195 185 C 202 178, 204 172, 198 168 C 188 165, 178 164, 170 165" />
      {/* Ala delantera con 3 plumas */}
      <path d="M 120 133 C 126 95, 144 68, 195 73 C 182 92, 174 102, 166 108 C 180 108, 192 110, 195 114 C 184 124, 174 130, 163 134 C 174 138, 180 142, 182 146 C 170 156, 154 162, 138 162" />
      {/* Plumas internas */}
      <path d="M 166 108 C 154 114, 146 118, 140 120" />
      <path d="M 163 134 C 154 136, 146 137, 140 138" />
    </svg>
  );
}
