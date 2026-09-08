// Conversión de valores monetarios en pesos colombianos a texto en letras (M/CTE)
export function numeroALetras(num) {
  const n = Math.round(Math.abs(Number(num) || 0));
  if (n === 0) return "CERO PESOS M/CTE";

  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const especiales = {
    10: "DIEZ", 11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
    16: "DIECISÉIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
    20: "VEINTE", 21: "VEINTIÚN", 22: "VEINTIDÓS", 23: "VEINTITRÉS", 24: "VEINTICUATRO",
    25: "VEINTICINCO", 26: "VEINTISÉIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE",
  };
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  function seccion(val) {
    if (val === 0) return "";
    if (val === 100) return "CIEN";
    let res = "";
    const c = Math.floor(val / 100);
    const du = val % 100;
    const d = Math.floor(du / 10);
    const u = du % 10;

    if (c > 0) res += centenas[c] + " ";
    if (du > 0) {
      if (especiales[du]) {
        res += especiales[du];
      } else if (d > 0 && u > 0) {
        res += decenas[d] + " Y " + unidades[u];
      } else if (d > 0) {
        res += decenas[d];
      } else if (u > 0) {
        res += unidades[u];
      }
    }
    return res.trim();
  }

  function procesar(val) {
    if (val === 0) return "";
    if (val === 1) return "UN";
    if (val < 1000) return seccion(val);

    if (val < 1000000) {
      const miles = Math.floor(val / 1000);
      const resto = val % 1000;
      const milesTxt = miles === 1 ? "MIL" : seccion(miles) + " MIL";
      const restoTxt = seccion(resto);
      return (milesTxt + " " + restoTxt).trim();
    }

    const millones = Math.floor(val / 1000000);
    const resto = val % 1000000;
    const millTxt = millones === 1 ? "UN MILLÓN" : procesar(millones) + " MILLONES";
    if (resto === 0) return millTxt + " DE";
    return (millTxt + " " + procesar(resto)).trim();
  }

  const texto = procesar(n);
  return `${texto} PESOS M/CTE`.replace(/\s+/g, " ").trim();
}
