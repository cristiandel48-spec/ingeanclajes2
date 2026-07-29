# -*- coding: utf-8 -*-
"""Genera docs/Guia-Cotizaciones.pdf

Guia de usuario del modulo de cotizaciones. Los diagramas se dibujan como
vectores (no son capturas de pantalla) para que se vean nitidos en cualquier
tamano y no dependan de un navegador.

Uso:  python docs/generar_guia_cotizaciones.py
"""
import os
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, KeepTogether, NextPageTemplate,
    PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

# ----------------------------------------------------------------- paleta
ROJO = colors.HexColor("#E0342A")
TINTA = colors.HexColor("#101828")
GRIS = colors.HexColor("#667085")
GRIS_CLARO = colors.HexColor("#98A2B3")
LINEA = colors.HexColor("#E4E7EC")
FONDO = colors.HexColor("#F7F8FA")
AMBAR_BG = colors.HexColor("#FFF7ED")
AMBAR_LN = colors.HexColor("#FDBA74")
AMBAR_TX = colors.HexColor("#9A3412")
VERDE_BG = colors.HexColor("#F0FDF4")
VERDE_LN = colors.HexColor("#BBF7D0")
VERDE_TX = colors.HexColor("#15803D")
AZUL_BG = colors.HexColor("#EFF6FF")
AZUL_LN = colors.HexColor("#BFDBFE")
AZUL_TX = colors.HexColor("#1E40AF")
ROJO_BG = colors.HexColor("#FEF3F2")
ROJO_LN = colors.HexColor("#FECDCA")
ROJO_TX = colors.HexColor("#B42318")
OSCURO = colors.HexColor("#14151A")

ANCHO_UTIL = LETTER[0] - 40 * mm

# ----------------------------------------------------------------- estilos
_ss = getSampleStyleSheet()

def _st(nombre, **kw):
    base = dict(fontName="Helvetica", fontSize=10, leading=15, textColor=TINTA)
    base.update(kw)
    return ParagraphStyle(nombre, parent=_ss["Normal"], **base)

E = {
    "portada_kicker": _st("pk", fontName="Helvetica-Bold", fontSize=11, textColor=GRIS,
                          alignment=TA_CENTER, leading=16),
    "portada_titulo": _st("pt", fontName="Helvetica-Bold", fontSize=38, leading=44,
                          alignment=TA_CENTER),
    "portada_sub": _st("ps", fontSize=13, leading=20, textColor=GRIS, alignment=TA_CENTER),
    "h1": _st("h1", fontName="Helvetica-Bold", fontSize=20, leading=26, spaceBefore=2, spaceAfter=10),
    "h2": _st("h2", fontName="Helvetica-Bold", fontSize=13.5, leading=19, spaceBefore=14, spaceAfter=6),
    "h3": _st("h3", fontName="Helvetica-Bold", fontSize=11, leading=16, spaceBefore=10, spaceAfter=4),
    "p": _st("p", fontSize=10, leading=15.5, spaceAfter=7, alignment=TA_JUSTIFY),
    "li": _st("li", fontSize=10, leading=15, spaceAfter=4, leftIndent=12, bulletIndent=2),
    "nota": _st("nota", fontSize=9.5, leading=14),
    "pie_tabla": _st("pt2", fontSize=8.5, leading=12, textColor=GRIS_CLARO),
    "celda": _st("celda", fontSize=9, leading=13),
    "celda_b": _st("celdab", fontName="Helvetica-Bold", fontSize=9, leading=13),
    "toc": _st("toc", fontSize=10.5, leading=20),
    "toc_b": _st("tocb", fontName="Helvetica-Bold", fontSize=10.5, leading=20),
    "codigo": _st("cod", fontName="Courier-Bold", fontSize=10, leading=15, textColor=TINTA),
    "diag": _st("diag", fontSize=8, leading=11, textColor=TINTA),
}

# ------------------------------------------------------- bloques auxiliares
def aviso(texto, tono="info", titulo=None):
    """Caja de color con un mensaje destacado."""
    tonos = {
        "info":  (AZUL_BG, AZUL_LN, AZUL_TX, "Nota"),
        "ok":    (VERDE_BG, VERDE_LN, VERDE_TX, "Recomendado"),
        "ojo":   (AMBAR_BG, AMBAR_LN, AMBAR_TX, "Importante"),
        "alto":  (ROJO_BG, ROJO_LN, ROJO_TX, "Atención"),
    }
    bg, ln, tx, etiqueta = tonos[tono]
    encabezado = titulo or etiqueta
    contenido = [
        Paragraph(f'<font color="{tx.hexval()}"><b>{encabezado}</b></font>', E["nota"]),
        Spacer(1, 3),
        Paragraph(texto, E["nota"]),
    ]
    t = Table([[contenido]], colWidths=[ANCHO_UTIL])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.7, ln),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def tabla(encabezados, filas, anchos=None, alineaciones=None):
    datos = [[Paragraph(h, E["celda_b"]) for h in encabezados]]
    for fila in filas:
        datos.append([Paragraph(str(c), E["celda"]) for c in fila])
    anchos = anchos or [ANCHO_UTIL / len(encabezados)] * len(encabezados)
    t = Table(datos, colWidths=anchos, repeatRows=1)
    estilo = [
        ("BACKGROUND", (0, 0), (-1, 0), OSCURO),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINEA),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, FONDO]),
    ]
    for i, h in enumerate(encabezados):
        datos[0][i] = Paragraph(f'<font color="#FFFFFF"><b>{h}</b></font>', E["celda_b"])
    if alineaciones:
        for col, al in alineaciones.items():
            estilo.append(("ALIGN", (col, 0), (col, -1), al))
    t.setStyle(TableStyle(estilo))
    return t


def paso(numero, titulo):
    """Encabezado de paso con el numero en un circulo rojo."""
    circulo = Table([[Paragraph(f'<font color="#FFFFFF"><b>{numero}</b></font>',
                                _st("n", fontName="Helvetica-Bold", fontSize=12,
                                    alignment=TA_CENTER, leading=14))]],
                    colWidths=[9 * mm], rowHeights=[9 * mm])
    circulo.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ROJO),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    t = Table([[circulo, Paragraph(titulo, E["h1"])]],
              colWidths=[13 * mm, ANCHO_UTIL - 13 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


# ------------------------------------------------------------- diagramas
class Diagrama(Flowable):
    """Dibujo vectorial que representa una parte de la pantalla."""

    def __init__(self, alto, pintar, leyenda=None):
        Flowable.__init__(self)
        self.width = ANCHO_UTIL
        self.height = alto
        self._pintar = pintar
        self.leyenda = leyenda

    def wrap(self, *_):
        return self.width, self.height

    # utilidades de dibujo -------------------------------------------------
    def caja(self, x, y, w, h, relleno=colors.white, borde=LINEA, radio=3, grosor=0.7):
        c = self.canv
        if relleno is not None:
            c.setFillColor(relleno)
        c.setStrokeColor(borde)
        c.setLineWidth(grosor)
        c.roundRect(x, y, w, h, radio, stroke=1, fill=1 if relleno is not None else 0)

    def texto(self, x, y, s, tam=7.5, color=TINTA, negrita=False, centrado=False,
              derecha=False):
        c = self.canv
        c.setFont("Helvetica-Bold" if negrita else "Helvetica", tam)
        c.setFillColor(color)
        if centrado:
            c.drawCentredString(x, y, s)
        elif derecha:
            c.drawRightString(x, y, s)
        else:
            c.drawString(x, y, s)

    def boton(self, x, y, w, h, etiqueta, fondo=ROJO, texto_color=colors.white, tam=7.5):
        self.caja(x, y, w, h, relleno=fondo, borde=fondo, radio=3)
        self.texto(x + w / 2, y + h / 2 - tam * 0.35, etiqueta, tam=tam,
                   color=texto_color, negrita=True, centrado=True)

    def campo(self, x, y, w, etiqueta, valor="", alto=9 * mm):
        self.texto(x, y + alto + 2.5, etiqueta, tam=6.8, color=GRIS, negrita=True)
        self.caja(x, y, w, alto)
        if valor:
            self.texto(x + 4, y + alto / 2 - 2.6, valor, tam=7.5, color=TINTA)

    def globo(self, x, y, n):
        """Numero de referencia sobre el diagrama."""
        c = self.canv
        r = 3.1 * mm
        c.setFillColor(ROJO)
        c.setStrokeColor(colors.white)
        c.setLineWidth(1.1)
        c.circle(x, y, r, stroke=1, fill=1)
        c.setFont("Helvetica-Bold", 7.4)
        c.setFillColor(colors.white)
        c.drawCentredString(x, y - 2.6, str(n))

    def draw(self):
        self._pintar(self)


def con_leyenda(diagrama, filas):
    """Diagrama + lista numerada de referencias, sin que se separen."""
    items = []
    for n, txt in filas:
        items.append([
            Paragraph(f'<font color="{ROJO.hexval()}"><b>{n}</b></font>', E["diag"]),
            Paragraph(txt, E["diag"]),
        ])
    t = Table(items, colWidths=[7 * mm, ANCHO_UTIL - 7 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return KeepTogether([diagrama, Spacer(1, 5), t, Spacer(1, 4)])


# --- dibujos concretos ---------------------------------------------------
def dib_login(d):
    w, h = d.width, d.height
    d.caja(0, 0, w, h, relleno=FONDO, borde=LINEA, radio=4)
    cw, ch = 82 * mm, h - 12 * mm
    cx, cy = (w - cw) / 2, 6 * mm
    d.caja(cx, cy, cw, ch, relleno=colors.white, borde=LINEA, radio=6)
    d.caja(cx + 8 * mm, cy + ch - 14 * mm, 8 * mm, 8 * mm, relleno=ROJO, borde=ROJO, radio=2)
    d.texto(cx + 19 * mm, cy + ch - 11.5 * mm, "ACCESO CLOUD", tam=6.8, color=GRIS_CLARO, negrita=True)
    d.texto(cx + 8 * mm, cy + ch - 24 * mm, "Inicia sesión", tam=15, negrita=True)
    d.texto(cx + 8 * mm, cy + ch - 30 * mm, "Guarda tus datos automáticamente en la nube.",
            tam=7, color=GRIS)
    d.campo(cx + 8 * mm, cy + ch - 45 * mm, cw - 16 * mm, "Correo", "usuario@ingeanclajes.com")
    d.globo(cx + 6 * mm, cy + ch - 40.5 * mm, 1)
    d.campo(cx + 8 * mm, cy + ch - 60 * mm, cw - 16 * mm, "Contraseña", "••••••••")
    d.globo(cx + 6 * mm, cy + ch - 55.5 * mm, 2)
    d.boton(cx + 8 * mm, cy + ch - 72 * mm, cw - 16 * mm, 9 * mm, "Entrar")
    d.globo(cx + 6 * mm, cy + ch - 67.5 * mm, 3)
    d.texto(cx + cw / 2, cy + ch - 79 * mm, "¿Olvidaste tu contraseña?", tam=6.8,
            color=GRIS, centrado=True)
    d.globo(cx + cw - 6 * mm, cy + ch - 77 * mm, 4)


def dib_menu(d):
    w, h = d.width, d.height
    d.caja(0, 0, w, h, relleno=FONDO, borde=LINEA, radio=4)
    rw = 46 * mm
    d.caja(0, 0, rw, h, relleno=OSCURO, borde=OSCURO, radio=4)
    d.caja(6 * mm, h - 13 * mm, 7 * mm, 7 * mm, relleno=ROJO, borde=ROJO, radio=2)
    d.texto(16 * mm, h - 9.5 * mm, "Ingeanclajes", tam=7.5, color=colors.white, negrita=True)
    secciones = [
        ("GENERAL", ["Dashboard"]),
        ("COMERCIAL Y PROYECTOS", ["Cotizaciones", "Clientes", "Ejecución de obra", "Cuentas por cobrar"]),
    ]
    y = h - 20 * mm
    for titulo, items in secciones:
        d.texto(6 * mm, y, titulo, tam=5.6, color=GRIS, negrita=True)
        y -= 5 * mm
        for it in items:
            activo = it == "Cotizaciones"
            if activo:
                d.caja(4 * mm, y - 1.6 * mm, rw - 8 * mm, 6.5 * mm,
                       relleno=colors.white, borde=colors.white, radio=2)
                d.globo(rw + 4 * mm, y + 1.5 * mm, 2)
            d.texto(7 * mm, y, it, tam=7,
                    color=OSCURO if activo else colors.HexColor("#9AA2B1"),
                    negrita=activo)
            y -= 7 * mm
        y -= 1 * mm
    d.globo(rw - 3 * mm, h - 9.5 * mm, 1)
    d.texto(rw + 12 * mm, h / 2 + 4 * mm,
            "Al acercar el cursor, el menú se despliega", tam=8, color=GRIS)
    d.texto(rw + 12 * mm, h / 2 - 2 * mm,
            "y muestra el nombre de cada módulo.", tam=8, color=GRIS)


def dib_lista(d):
    w, h = d.width, d.height
    d.caja(0, 0, w, h, relleno=colors.white, borde=LINEA, radio=4)
    d.texto(6 * mm, h - 9 * mm, "Cotizaciones", tam=12, negrita=True)
    d.boton(w - 42 * mm, h - 11 * mm, 36 * mm, 8 * mm, "+ Nueva Cotización")
    d.globo(w - 44 * mm, h - 7 * mm, 1)
    y = h - 22 * mm
    d.caja(6 * mm, y, w - 12 * mm, 7 * mm, relleno=OSCURO, borde=OSCURO, radio=2)
    for x, txt in ((9, "Número"), (45, "Cliente"), (95, "Estado"), (125, "Acciones")):
        d.texto(x * mm, y + 2.4 * mm, txt, tam=6.4, color=colors.white, negrita=True)
    filas = [("ANC003", "Ferrasa", "Pendiente"), ("ANC002", "Sergio Zapata", "Aprobada")]
    for i, (num, cli, est) in enumerate(filas):
        fy = y - (i + 1) * 12 * mm
        d.caja(6 * mm, fy, w - 12 * mm, 11 * mm, relleno=colors.white if i % 2 == 0 else FONDO)
        d.texto(9 * mm, fy + 4 * mm, num, tam=7.5, negrita=True)
        d.texto(45 * mm, fy + 4 * mm, cli, tam=7.5)
        d.texto(95 * mm, fy + 4 * mm, est, tam=7.5, color=GRIS)
        bx = 122 * mm
        for etiqueta, color_b in (("Ver", colors.HexColor("#F1F5F9")),
                                  ("Editar", colors.HexColor("#DBEAFE")),
                                  ("PDF", ROJO)):
            ancho = 11 * mm if etiqueta != "Editar" else 13 * mm
            d.boton(bx, fy + 2.5 * mm, ancho, 6 * mm, etiqueta,
                    fondo=color_b,
                    texto_color=colors.white if etiqueta == "PDF" else colors.HexColor("#475569"),
                    tam=6.4)
            if i == 0 and etiqueta == "PDF":
                d.globo(bx + ancho + 3 * mm, fy + 5.5 * mm, 3)
            if i == 0 and etiqueta == "Editar":
                d.globo(bx + 6 * mm, fy + 11 * mm, 2)
            bx += ancho + 2 * mm


def dib_formulario(d):
    w, h = d.width, d.height
    d.caja(0, 0, w, h, relleno=FONDO, borde=LINEA, radio=4)
    secciones = [
        ("Portada · Identificación", "N° Cotización · Fecha · Válida (días)"),
        ("Portada · Cliente", "Empresa · Contacto · Obra · Teléfono · Ciudad"),
        ("01 · Carta de presentación", "Frase de apertura · Párrafo del cliente"),
        ("02 · Marco técnico", "Definiciones (vacío = automáticas)"),
        ("03 · Propuestas", "Una o varias, cada una completa"),
        ("Cierre", "SST · Próximos pasos · Contacto · Firma"),
    ]
    y = h - 11 * mm
    for i, (titulo, detalle) in enumerate(secciones, start=1):
        d.caja(6 * mm, y - 3 * mm, w - 12 * mm, 12 * mm, relleno=colors.white)
        d.texto(11 * mm, y + 4.2 * mm, titulo, tam=8, negrita=True)
        d.texto(11 * mm, y + 0.2 * mm, detalle, tam=6.8, color=GRIS)
        d.globo(9 * mm, y + 3 * mm, i)
        y -= 14.5 * mm
    d.texto(6 * mm, 3.5 * mm,
            "El formulario sigue el mismo orden en que sale impreso el documento.",
            tam=7.2, color=GRIS_CLARO)


def dib_items(d):
    w, h = d.width, d.height
    d.caja(0, 0, w, h, relleno=colors.white, borde=LINEA, radio=4)
    d.texto(6 * mm, h - 8 * mm, "Detalle económico", tam=9, negrita=True)
    d.boton(w - 54 * mm, h - 10 * mm, 22 * mm, 7 * mm, "Catálogo",
            fondo=colors.white, texto_color=ROJO, tam=6.8)
    d.caja(w - 54 * mm, h - 10 * mm, 22 * mm, 7 * mm, relleno=None, borde=ROJO, radio=3)
    d.globo(w - 56 * mm, h - 5 * mm, 1)
    y = h - 20 * mm
    cols = [(9, "Descripción"), (78, "Cant."), (94, "Unidad"), (116, "V. unit."), (148, "Subtotal")]
    d.caja(6 * mm, y, w - 12 * mm, 7 * mm, relleno=OSCURO, borde=OSCURO, radio=2)
    for x, txt in cols:
        d.texto(x * mm, y + 2.4 * mm, txt, tam=6.2, color=colors.white, negrita=True)
    datos = [("LINEA DE VIDA HORIZONTAL", "21", "ML", "$ 280.000", "$ 5.880.000"),
             ("PUNTO DE ANCLAJE EPOXICO", "8", "UND", "$ 380.000", "$ 3.040.000")]
    for i, fila in enumerate(datos):
        fy = y - (i + 1) * 9 * mm
        d.caja(6 * mm, fy, w - 12 * mm, 8 * mm, relleno=colors.white if i % 2 == 0 else FONDO)
        for (x, _), val in zip(cols, fila):
            d.texto(x * mm, fy + 2.8 * mm, val, tam=6.8)
        if i == 0:
            d.globo(78 * mm + 6 * mm, fy + 8 * mm, 2)
            d.globo(116 * mm + 12 * mm, fy + 8 * mm, 3)
    ty = y - 3 * 9 * mm - 2 * mm
    for etiqueta, valor in (("SUBTOTAL", "$ 8.920.000"), ("UTILIDAD 10%", "$ 892.000"),
                            ("IVA SOBRE LA UTILIDAD (19%)", "$ 169.480")):
        d.texto(9 * mm, ty, etiqueta, tam=6.8, color=GRIS)
        d.texto(w - 9 * mm, ty, valor, tam=6.8, derecha=True)
        ty -= 6 * mm
    d.caja(6 * mm, ty - 3 * mm, w - 12 * mm, 8 * mm, relleno=OSCURO, borde=OSCURO, radio=2)
    d.texto(9 * mm, ty + 0.2 * mm, "TOTAL", tam=8, color=colors.white, negrita=True)
    d.texto(w - 9 * mm, ty + 0.2 * mm, "$ 9.981.480", tam=8,
            color=colors.HexColor("#F47C20"), negrita=True, derecha=True)
    d.globo(9 * mm, ty + 12 * mm, 4)


def dib_preview(d):
    w, h = d.width, d.height
    d.caja(0, 0, w, h, relleno=FONDO, borde=LINEA, radio=4)
    mitad = (w - 18 * mm) / 2
    d.caja(6 * mm, 6 * mm, mitad, h - 20 * mm, relleno=colors.white)
    d.texto(6 * mm + mitad / 2, h - 18 * mm, "FORMULARIO", tam=7, color=GRIS,
            negrita=True, centrado=True)
    for i in range(5):
        d.caja(11 * mm, h - 30 * mm - i * 11 * mm, mitad - 10 * mm, 8 * mm, relleno=FONDO)
    px = 12 * mm + mitad
    d.caja(px, 6 * mm, mitad, h - 20 * mm, relleno=colors.HexColor("#E8EAEE"))
    d.texto(px + mitad / 2, h - 18 * mm, "DOCUMENTO COMO SE IMPRIMIRÁ", tam=7,
            color=GRIS, negrita=True, centrado=True)
    d.caja(px + 6 * mm, h - 62 * mm, mitad - 12 * mm, 36 * mm, relleno=colors.white)
    d.texto(px + mitad / 2, h - 32 * mm, "Cotización", tam=9, negrita=True, centrado=True)
    d.texto(px + mitad / 2, h - 38 * mm, "ANC003 · Ferrasa", tam=6.6, color=GRIS, centrado=True)
    for i in range(4):
        d.caja(px + 11 * mm, h - 46 * mm - i * 4.5 * mm, mitad - 22 * mm, 2.6 * mm,
               relleno=colors.HexColor("#EEF0F3"), borde=colors.HexColor("#EEF0F3"))
    d.boton(w - 44 * mm, h - 11 * mm, 34 * mm, 7.5 * mm, "Ver documento", fondo=OSCURO)
    d.globo(w - 46 * mm, h - 6 * mm, 1)
    d.globo(px + 4 * mm, h - 24 * mm, 2)


def dib_imprimir(d):
    w, h = d.width, d.height
    d.caja(0, 0, w, h, relleno=FONDO, borde=LINEA, radio=4)
    d.caja(0, h - 12 * mm, w, 12 * mm, relleno=colors.HexColor("#1A2840"),
           borde=colors.HexColor("#1A2840"), radio=4)
    d.texto(7 * mm, h - 7.5 * mm, "Cotizacion ANC003", tam=8, color=colors.white, negrita=True)
    d.boton(w - 68 * mm, h - 10 * mm, 42 * mm, 8 * mm, "Imprimir / Guardar PDF",
            fondo=colors.HexColor("#F47C20"))
    d.globo(w - 70 * mm, h - 4 * mm, 1)
    d.boton(w - 24 * mm, h - 10 * mm, 18 * mm, 8 * mm, "Cerrar",
            fondo=colors.HexColor("#475569"))
    d.globo(w - 6 * mm, h - 4 * mm, 3)
    d.caja((w - 74 * mm) / 2, 5 * mm, 74 * mm, h - 22 * mm, relleno=colors.white)
    d.texto(w / 2, h - 26 * mm, "INGEANCLAJES", tam=7, color=ROJO, negrita=True, centrado=True)
    d.texto(w / 2, h - 34 * mm, "Cotización", tam=13, negrita=True, centrado=True)
    d.texto(w / 2, h - 40 * mm, "ANC003 · Ferrasa", tam=7, color=GRIS, centrado=True)
    for i in range(6):
        d.caja((w - 62 * mm) / 2, h - 50 * mm - i * 5 * mm, 62 * mm, 3 * mm,
               relleno=colors.HexColor("#EEF0F3"), borde=colors.HexColor("#EEF0F3"))
    d.globo(w / 2, 10 * mm, 2)


def dib_guardado(d):
    w, h = d.width, d.height
    d.caja(0, 0, w, h, relleno=colors.white, borde=LINEA, radio=4)
    estados = [
        ("Cambios pendientes", colors.HexColor("#B54708"), colors.HexColor("#FEF0E6"),
         "Escribiste algo y aún no se ha subido."),
        ("Guardando…", GRIS, FONDO, "Se está subiendo en este momento."),
        ("Guardado 14:32", VERDE_TX, VERDE_BG, "Todo quedó a salvo en la nube."),
        ("Cambios sin guardar", ROJO_TX, ROJO_BG, "Hubo un problema. Toca para reintentar."),
    ]
    y = h - 12 * mm
    for etiqueta, tx, bg, detalle in estados:
        d.caja(6 * mm, y - 2 * mm, 42 * mm, 8 * mm, relleno=bg, borde=bg, radio=4)
        d.canv.setFillColor(tx)
        d.canv.circle(11 * mm, y + 2 * mm, 1.4 * mm, stroke=0, fill=1)
        d.texto(14 * mm, y + 0.6 * mm, etiqueta, tam=7.2, color=tx, negrita=True)
        d.texto(52 * mm, y + 0.6 * mm, detalle, tam=7.6, color=TINTA)
        y -= 13 * mm


# --------------------------------------------------------------- documento
class Guia(BaseDocTemplate):
    def __init__(self, ruta):
        BaseDocTemplate.__init__(self, ruta, pagesize=LETTER,
                                 leftMargin=20 * mm, rightMargin=20 * mm,
                                 topMargin=20 * mm, bottomMargin=18 * mm,
                                 title="Guía de Cotizaciones · Ingeanclajes",
                                 author="Ingeanclajes S.A.S.",
                                 subject="Manual de usuario del módulo de cotizaciones")
        marco = Frame(self.leftMargin, self.bottomMargin, ANCHO_UTIL,
                      self.height, id="cuerpo")
        self.addPageTemplates([
            PageTemplate(id="portada", frames=[marco]),
            PageTemplate(id="normal", frames=[marco], onPage=self._pie),
        ])

    def _pie(self, canv, doc):
        canv.saveState()
        canv.setStrokeColor(LINEA)
        canv.setLineWidth(0.5)
        y = self.bottomMargin - 6 * mm
        canv.line(self.leftMargin, y, self.leftMargin + ANCHO_UTIL, y)
        canv.setFont("Helvetica", 7.5)
        canv.setFillColor(GRIS_CLARO)
        canv.drawString(self.leftMargin, y - 4.5 * mm,
                        "Guía de Cotizaciones · Ingeanclajes S.A.S.")
        canv.drawRightString(self.leftMargin + ANCHO_UTIL, y - 4.5 * mm,
                             "Página %d" % doc.page)
        canv.restoreState()


MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def construir():
    hoy = date.today()
    fecha_larga = "%d de %s de %d" % (hoy.day, MESES[hoy.month - 1], hoy.year)

    aqui = os.path.dirname(os.path.abspath(__file__))
    ruta = os.path.join(aqui, "Guia-Cotizaciones.pdf")
    doc = Guia(ruta)
    H = []

    # ---------------------------------------------------------- portada
    H.append(Spacer(1, 42 * mm))
    logo = Table([[""]], colWidths=[16 * mm], rowHeights=[16 * mm])
    logo.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ROJO),
                              ("BOX", (0, 0), (-1, -1), 0, ROJO)]))
    envoltorio = Table([[logo]], colWidths=[ANCHO_UTIL])
    envoltorio.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"),
                                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                    ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    H.append(envoltorio)
    H.append(Spacer(1, 12 * mm))
    H.append(Paragraph("INGEANCLAJES S.A.S. · SISTEMA DE GESTIÓN", E["portada_kicker"]))
    H.append(Spacer(1, 6 * mm))
    H.append(Paragraph("Guía de Cotizaciones", E["portada_titulo"]))
    H.append(Spacer(1, 8 * mm))
    H.append(Paragraph(
        "Manual paso a paso para crear, guardar y enviar una cotización<br/>"
        "sin necesidad de ayuda técnica.", E["portada_sub"]))
    H.append(Spacer(1, 26 * mm))
    linea = Table([[""]], colWidths=[60 * mm], rowHeights=[1])
    linea.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LINEA)]))
    cent = Table([[linea]], colWidths=[ANCHO_UTIL])
    cent.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    H.append(cent)
    H.append(Spacer(1, 8 * mm))
    H.append(Paragraph("Fecha de creación: %s" % fecha_larga, E["portada_sub"]))
    H.append(Paragraph("Versión 1.0", E["portada_sub"]))

    H.append(NextPageTemplate("normal"))
    H.append(PageBreak())

    # ------------------------------------------------- credenciales
    H.append(Paragraph("Credenciales de acceso", E["h1"]))
    H.append(Paragraph(
        "Para entrar al sistema necesita dos datos, que le entrega la persona "
        "encargada del sistema en la empresa. Anótelos aquí antes de empezar:", E["p"]))

    cred = Table(
        [[Paragraph("Dirección del sistema", E["celda_b"]),
          Paragraph("<font face='Courier'>https://___________________________</font>", E["celda"])],
         [Paragraph("Usuario (correo)", E["celda_b"]),
          Paragraph("<font face='Courier'>usuario@ingeanclajes.com</font>", E["celda"])],
         [Paragraph("Contraseña", E["celda_b"]),
          Paragraph("<font face='Courier'>_______________________</font>", E["celda"])]],
        colWidths=[52 * mm, ANCHO_UTIL - 52 * mm])
    cred.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), FONDO),
        ("BOX", (0, 0), (-1, -1), 0.7, LINEA),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINEA),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    H.append(cred)
    H.append(Spacer(1, 5 * mm))
    H.append(aviso(
        "El usuario que aparece arriba es solo un <b>ejemplo del formato</b>. "
        "Por seguridad, <b>no escriba la contraseña real en este documento</b> si va a "
        "compartirlo o imprimirlo: cualquiera que lo vea tendría acceso a la información "
        "de nómina, contabilidad y clientes. Cada persona debe tener su propio usuario.",
        tono="alto", titulo="Antes de continuar"))
    H.append(Spacer(1, 4 * mm))
    H.append(aviso(
        "Si olvida la contraseña, no necesita llamar a nadie: en la pantalla de ingreso "
        "hay un enlace <b>¿Olvidaste tu contraseña?</b> que le envía un correo para "
        "cambiarla.", tono="ok", titulo="Buena noticia"))

    H.append(PageBreak())

    # ------------------------------------------------- contenido
    H.append(Paragraph("Contenido", E["h1"]))
    secciones_toc = [
        ("1", "Introducción: qué es el módulo de cotizaciones"),
        ("2", "Iniciar sesión en el sistema"),
        ("3", "Encontrar el módulo de cotizaciones"),
        ("4", "Crear una nueva cotización"),
        ("5", "Datos del cliente"),
        ("6", "Textos del documento y personalización"),
        ("7", "Las propuestas: agregar productos y servicios"),
        ("8", "Cantidades y precios"),
        ("9", "Descuentos y ajustes de precio"),
        ("10", "Ver el documento mientras lo escribe"),
        ("11", "Guardar la cotización"),
        ("12", "Descargar o enviar el PDF"),
        ("13", "Preguntas frecuentes"),
        ("14", "Solución de problemas comunes"),
        ("15", "Tips y recomendaciones"),
    ]
    filas_toc = [[Paragraph(f'<font color="{ROJO.hexval()}"><b>{n}</b></font>', E["toc_b"]),
                  Paragraph(t, E["toc"])] for n, t in secciones_toc]
    t_toc = Table(filas_toc, colWidths=[12 * mm, ANCHO_UTIL - 12 * mm])
    t_toc.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINEA),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
    ]))
    H.append(t_toc)

    H.append(PageBreak())

    # ------------------------------------------------- 1. introduccion
    H.append(paso(1, "Introducción"))
    H.append(Paragraph(
        "El <b>módulo de cotizaciones</b> es la parte del sistema donde se arma la oferta "
        "comercial que se le entrega a un cliente. No es solo una lista de precios: con los "
        "datos que usted escribe, el sistema genera un <b>documento completo en PDF</b>, "
        "con portada, carta de presentación, definiciones técnicas, el detalle de precios, "
        "las condiciones comerciales y la firma.", E["p"]))
    H.append(Paragraph("¿Para qué sirve?", E["h2"]))
    for txt in [
        "Preparar la oferta de una obra en pocos minutos, sin armar el documento a mano.",
        "Ofrecer <b>varias alternativas</b> al mismo cliente (por ejemplo, una cubierta con "
        "30 anclajes y otra con 20) dentro de la misma cotización.",
        "Calcular solo los totales, la utilidad y el IVA.",
        "Guardar todo en la nube, para consultarlo o corregirlo después desde cualquier "
        "computador o desde el celular.",
        "Convertir una cotización aprobada en una obra, sin volver a escribir los datos.",
    ]:
        H.append(Paragraph(txt, E["li"], bulletText="•"))

    H.append(Paragraph("Cómo está organizada una cotización", E["h2"]))
    H.append(Paragraph(
        "Una cotización tiene <b>datos generales</b> (el cliente, la obra, la fecha) y "
        "<b>una o más propuestas</b>. Cada propuesta es una alternativa con sus propios "
        "servicios, precios, fotos y condiciones. Así el cliente puede escoger.", E["p"]))
    H.append(aviso(
        "El formulario está ordenado <b>igual que el documento impreso</b>: lo que llena "
        "arriba sale al principio del PDF, y lo del final sale al final. Si ve un error en la "
        "sección «02» del PDF, la corrige en la sección «02» del formulario.",
        tono="info", titulo="Le va a servir saber esto"))

    H.append(PageBreak())

    # ------------------------------------------------- 2. iniciar sesion
    H.append(paso(2, "Iniciar sesión en el sistema"))
    H.append(Paragraph(
        "Abra el navegador de internet (Chrome, Edge o Safari) y escriba la dirección del "
        "sistema. Verá esta pantalla:", E["p"]))
    H.append(con_leyenda(Diagrama(96 * mm, dib_login), [
        (1, "Escriba su <b>correo</b>, completo y sin espacios."),
        (2, "Escriba su <b>contraseña</b>. Se muestra con puntos por seguridad."),
        (3, "Presione <b>Entrar</b>. También puede oprimir la tecla Enter."),
        (4, "Si no recuerda la contraseña, escriba su correo y presione aquí: le llegará un "
            "mensaje para cambiarla."),
    ]))
    H.append(Paragraph(
        "Si los datos son correctos, entrará al <b>Dashboard</b>, que es la pantalla de "
        "resumen. Arriba a la derecha aparecerá su correo: así confirma que entró con la "
        "cuenta correcta.", E["p"]))
    H.append(aviso(
        "El sistema recuerda su sesión: la próxima vez que abra la dirección, entrará "
        "directo. Si usa un computador compartido, <b>cierre sesión</b> al terminar desde el "
        "menú de su correo, arriba a la derecha.", tono="ojo"))

    H.append(PageBreak())

    # ------------------------------------------------- 3. encontrar modulo
    H.append(paso(3, "Encontrar el módulo de cotizaciones"))
    H.append(Paragraph(
        "A la izquierda de la pantalla hay una <b>barra oscura con iconos</b>. Al acercar el "
        "cursor, se despliega y muestra el nombre de cada módulo.", E["p"]))
    H.append(con_leyenda(Diagrama(70 * mm, dib_menu), [
        (1, "Acerque el cursor a la barra: se abre y muestra los nombres. Si prefiere "
            "dejarla siempre abierta, use el botón <b>Fijar menú</b> al final de la barra."),
        (2, "Presione <b>Cotizaciones</b>, en el grupo «Comercial y proyectos»."),
    ]))
    H.append(Paragraph(
        "Si está en el celular, en lugar de la barra verá un botón con tres líneas "
        "(≡) arriba a la izquierda: presiónelo para abrir el menú.", E["p"]))

    H.append(PageBreak())

    # ------------------------------------------------- 4. crear
    H.append(paso(4, "Crear una nueva cotización"))
    H.append(Paragraph(
        "Al entrar al módulo verá la lista de cotizaciones ya existentes.", E["p"]))
    H.append(con_leyenda(Diagrama(66 * mm, dib_lista), [
        (1, "<b>+ Nueva Cotización</b>: crea una desde cero. El número (por ejemplo "
            "ANC003) se asigna solo."),
        (2, "<b>Editar</b>: abre una cotización existente para corregirla."),
        (3, "<b>PDF</b>: genera el documento para imprimir o guardar. También hay "
            "<b>Ver</b> (vista previa), <b>Aprobar y crear obra</b> y <b>Eliminar</b>."),
    ]))
    H.append(Paragraph(
        "Al presionar <b>+ Nueva Cotización</b> se abre el formulario. Está dividido en "
        "secciones numeradas, en el mismo orden del documento:", E["p"]))
    H.append(con_leyenda(Diagrama(96 * mm, dib_formulario), [
        (1, "Número de la cotización, fecha y por cuántos días es válida (30 por defecto)."),
        (2, "Los datos del cliente y de la obra."),
        (3, "La frase con que abre la carta, y un párrafo opcional para ese cliente."),
        (4, "Las definiciones técnicas. <b>Si lo deja vacío</b>, el sistema pone las que "
            "corresponden al tipo de trabajo."),
        (5, "Las propuestas: aquí van los servicios y los precios."),
        (6, "Los textos del final: seguridad y salud, próximos pasos, contacto y firma."),
    ]))

    H.append(PageBreak())

    # ------------------------------------------------- 5. cliente
    H.append(paso(5, "Datos del cliente"))
    H.append(Paragraph(
        "En la sección <b>Portada · Cliente</b> llene los datos de quien recibe la oferta. "
        "Estos salen en la portada del PDF, en el bloque «Cotización preparada para».", E["p"]))
    H.append(tabla(
        ["Campo", "Qué escribir", "¿Obligatorio?"],
        [["Empresa", "El nombre de la empresa o de la persona. Ej.: <i>Ferrasa</i>", "Sí"],
         ["Contacto", "La persona con quien trata. Si es la misma, repítalo.", "Recomendado"],
         ["Obra", "El nombre del proyecto. Ej.: <i>Parque de Belén</i>", "Sí"],
         ["Teléfono", "Número de contacto, sin puntos ni guiones.", "Recomendado"],
         ["Ciudad", "Ciudad de la obra. Ej.: <i>Medellín</i>", "Recomendado"]],
        anchos=[30 * mm, ANCHO_UTIL - 60 * mm, 30 * mm]))
    H.append(Spacer(1, 5 * mm))
    H.append(aviso(
        "Escriba bien la <b>Empresa</b> y la <b>Obra</b>: con esos dos datos se busca la "
        "cotización después, y son los que salen más grandes en la portada.", tono="ojo"))

    # ------------------------------------------------- 6. textos
    H.append(Paragraph("", E["p"]))
    H.append(paso(6, "Textos del documento y personalización"))
    H.append(Paragraph(
        "El documento incluye textos que se repiten en todas las cotizaciones: la carta de "
        "presentación, las definiciones técnicas, el texto de seguridad y salud en el "
        "trabajo, los próximos pasos y la firma. <b>Vienen escritos y listos</b>, así que "
        "puede dejarlos como están.", E["p"]))
    H.append(Paragraph(
        "Si necesita cambiar alguno para un cliente en particular, simplemente escriba "
        "encima. El cambio aplica <b>solo a esa cotización</b>; las demás siguen con el "
        "texto de siempre.", E["p"]))
    H.append(Paragraph("Reglas útiles", E["h3"]))
    for txt in [
        "<b>Si deja un campo vacío</b>, el sistema usa el texto estándar de la empresa. "
        "No se queda en blanco.",
        "En <b>Marco técnico</b>, vacío significa «usar las definiciones automáticas» según "
        "el tipo de trabajo. Solo si escribe algo, reemplaza ese bloque.",
        "En <b>Próximos pasos</b>, escriba un paso por línea: salen numerados en el orden "
        "en que los escriba.",
        "Si se arrepiente, el botón <b>Restaurar textos estándar</b> devuelve todo a como "
        "estaba.",
    ]:
        H.append(Paragraph(txt, E["li"], bulletText="•"))

    H.append(PageBreak())

    # ------------------------------------------------- 7. propuestas
    H.append(paso(7, "Las propuestas: agregar productos y servicios"))
    H.append(Paragraph(
        "Aquí está el corazón de la cotización. Una <b>propuesta</b> es una alternativa que "
        "le ofrece al cliente. Puede tener una sola, o varias para que escoja.", E["p"]))
    H.append(Paragraph("Datos de cada propuesta", E["h3"]))
    H.append(tabla(
        ["Campo", "Para qué sirve"],
        [["Nombre de la propuesta",
          "El título que sale en el PDF. Ej.: <i>Instalación de 30 puntos de anclaje — Cubierta #1</i>"],
         ["Tipo",
          "Escoja entre <b>Línea de vida</b>, <b>Puntos de anclaje</b> u <b>Obra blanca</b>. "
          "Define qué definiciones técnicas y qué anexos salen en el documento."],
         ["Descripción",
          "El párrafo que explica el servicio, los materiales y el alcance."],
         ["Esta cotización incluye",
          "La lista de lo que va incluido. Para puntos de anclaje se llena solo con el texto "
          "estándar; puede editarlo."],
         ["Fotos",
          "Imágenes de la obra. Salen impresas en el PDF, en «Registro fotográfico»."],
         ["Medición automática",
          "Permite medir sobre el mapa satelital y traer los metros a la lista de servicios."]],
        anchos=[42 * mm, ANCHO_UTIL - 42 * mm]))
    H.append(Spacer(1, 5 * mm))
    H.append(Paragraph("Agregar varias propuestas", E["h3"]))
    H.append(Paragraph(
        "Con <b>+ Nueva</b> agrega una propuesta vacía. Con <b>Duplicar</b> copia la actual, "
        "que es lo más práctico cuando las alternativas se parecen: duplica y solo cambia la "
        "cantidad. Todas las propuestas se ven abiertas, una debajo de otra, así que puede "
        "compararlas sin cambiar de pantalla.", E["p"]))
    H.append(aviso(
        "Cada propuesta lleva <b>sus propios</b> servicios, precios, fotos y condiciones. "
        "Lo que escriba en una no afecta a las otras.", tono="info"))

    H.append(PageBreak())

    # ------------------------------------------------- 8. cantidades
    H.append(paso(8, "Cantidades y precios"))
    H.append(Paragraph(
        "En <b>Detalle económico</b>, dentro de cada propuesta, se listan los servicios con "
        "su cantidad y su valor.", E["p"]))
    H.append(con_leyenda(Diagrama(84 * mm, dib_items), [
        (1, "<b>Catálogo</b>: abre la lista de servicios con precios ya cargados "
            "(Líneas de vida, Escaleras, Anclajes, Sistemas completos y Servicios). "
            "Presione <b>+</b> junto al que necesite. También puede usar "
            "<b>+ Agregar ítem manual</b> para escribir uno desde cero."),
        (2, "<b>Cantidad</b>: los metros o las unidades. Acepta decimales."),
        (3, "<b>Valor unitario</b>: el precio de una unidad. Escriba solo números, sin "
            "puntos ni signo de pesos."),
        (4, "Los totales se calculan solos cada vez que cambia algo."),
    ]))
    H.append(Paragraph("Cómo se calcula el total", E["h3"]))
    H.append(Paragraph(
        "El cálculo tiene una particularidad importante: <b>el IVA se aplica sobre la "
        "utilidad, no sobre el subtotal</b>. Así funciona:", E["p"]))
    H.append(tabla(
        ["Concepto", "Cómo se obtiene", "Ejemplo"],
        [["Subtotal", "Suma de cantidad × valor unitario de cada servicio", "$ 8.920.000"],
         ["Utilidad", "El porcentaje que usted indique, sobre el subtotal", "10% = $ 892.000"],
         ["IVA", "19% <b>sobre la utilidad</b>", "$ 169.480"],
         ["Total", "Subtotal + utilidad + IVA", "<b>$ 9.981.480</b>"]],
        anchos=[28 * mm, ANCHO_UTIL - 66 * mm, 38 * mm]))
    H.append(Spacer(1, 4 * mm))
    H.append(Paragraph(
        "El porcentaje de utilidad se cambia en el campo <b>Utilidad %</b>, debajo de la "
        "tabla. Viene en 10%.", E["p"]))

    H.append(PageBreak())

    # ------------------------------------------------- 9. descuentos
    H.append(paso(9, "Descuentos y ajustes de precio"))
    H.append(aviso(
        "El sistema <b>no tiene un campo de descuento</b> como tal. No es un error: el "
        "descuento se aplica ajustando el precio, y a continuación le explicamos las tres "
        "formas de hacerlo.", tono="ojo", titulo="Tenga en cuenta"))
    H.append(Spacer(1, 4 * mm))
    H.append(Paragraph("Opción A — Bajar el valor unitario", E["h3"]))
    H.append(Paragraph(
        "La más simple y la más común. Si el valor de catálogo es $280.000 el metro y le da "
        "un 10% de descuento, escriba <b>252.000</b> en el valor unitario. El cliente ve el "
        "precio final, sin mención del descuento.", E["p"]))
    H.append(Paragraph("Opción B — Reducir el porcentaje de utilidad", E["h3"]))
    H.append(Paragraph(
        "Útil cuando quiere ceder parte de su margen sin tocar los precios de lista. Baje "
        "<b>Utilidad %</b> de 10 a 5, por ejemplo. Ojo: como el IVA se calcula sobre la "
        "utilidad, el IVA también baja.", E["p"]))
    H.append(Paragraph("Opción C — Un ítem con valor negativo", E["h3"]))
    H.append(Paragraph(
        "Si necesita que el descuento <b>se vea</b> en el documento, agregue un ítem manual "
        "llamado por ejemplo «Descuento comercial», con cantidad 1 y valor unitario en "
        "negativo (por ejemplo <b>-500000</b>). Aparecerá como una línea más y se restará "
        "del subtotal.", E["p"]))
    H.append(aviso(
        "Revise siempre el total en la vista previa antes de enviar. Con la opción C, "
        "confirme que el subtotal quedó como esperaba.", tono="ok", titulo="Recomendación"))

    H.append(PageBreak())

    # ------------------------------------------------- 10. vista previa
    H.append(paso(10, "Ver el documento mientras lo escribe"))
    H.append(Paragraph(
        "No hace falta guardar ni generar el PDF para saber cómo va quedando.", E["p"]))
    H.append(con_leyenda(Diagrama(80 * mm, dib_preview), [
        (1, "Presione <b>Ver documento</b>, arriba a la derecha."),
        (2, "El documento aparece al lado y se actualiza medio segundo después de que deja "
            "de escribir. Es exactamente lo que se va a imprimir."),
    ]))
    H.append(Paragraph(
        "Sirve para revisar los textos completos y encontrar errores antes de enviar. En "
        "pantallas pequeñas, el mismo botón alterna entre el formulario y el documento.",
        E["p"]))

    # ------------------------------------------------- 11. guardar
    H.append(paso(11, "Guardar la cotización"))
    H.append(Paragraph(
        "Hay dos botones para guardar, arriba a la derecha:", E["p"]))
    for txt in [
        "<b>Guardar</b> (o <b>Actualizar</b> si la está editando): guarda y vuelve a la lista.",
        "<b>Guardar y ver</b>: guarda y muestra el documento terminado.",
    ]:
        H.append(Paragraph(txt, E["li"], bulletText="•"))
    H.append(Paragraph(
        "Además, el sistema <b>guarda solo</b> mientras trabaja. En la barra de arriba, junto "
        "a su correo, un indicador le dice en qué estado está:", E["p"]))
    H.append(Diagrama(56 * mm, dib_guardado))
    H.append(Spacer(1, 4 * mm))
    H.append(aviso(
        "Si ve <b>Cambios sin guardar</b> en rojo, hay un problema de conexión. El sistema "
        "reintenta solo, y usted puede presionar el indicador para reintentar de inmediato. "
        "<b>No cierre el navegador</b> mientras esté en rojo: le va a preguntar si está "
        "seguro, y la respuesta es no.", tono="alto"))

    H.append(PageBreak())

    # ------------------------------------------------- 12. pdf
    H.append(paso(12, "Descargar o enviar el PDF"))
    H.append(Paragraph(
        "Desde la lista de cotizaciones, presione el botón <b>PDF</b> de la fila "
        "correspondiente. Se abre una pestaña nueva con el documento terminado:", E["p"]))
    H.append(con_leyenda(Diagrama(84 * mm, dib_imprimir), [
        (1, "<b>Imprimir / Guardar PDF</b>: abre el cuadro de impresión del navegador. "
            "Para guardar el archivo, en «Destino» escoja <b>Guardar como PDF</b> y presione "
            "Guardar."),
        (2, "Revise el documento completo antes de enviarlo, bajando con la rueda del mouse."),
        (3, "<b>Cerrar</b> vuelve al sistema."),
    ]))
    H.append(Paragraph("Recomendaciones al imprimir", E["h3"]))
    for txt in [
        "En el cuadro de impresión, deje el tamaño en <b>Carta</b> y los márgenes como vienen.",
        "Si las imágenes no salen, active la opción <b>Gráficos de fondo</b> "
        "(«Background graphics») en «Más configuraciones».",
        "Guarde el archivo con un nombre reconocible, por ejemplo "
        "<i>ANC003-Ferrasa.pdf</i>, para encontrarlo después.",
    ]:
        H.append(Paragraph(txt, E["li"], bulletText="•"))

    H.append(PageBreak())

    # ------------------------------------------------- 13. FAQ
    H.append(paso(13, "Preguntas frecuentes"))
    faq = [
        ("¿Puedo editar una cotización ya enviada?",
         "Sí. Búsquela en la lista, presione <b>Editar</b>, haga el cambio y guarde. Tenga "
         "en cuenta que el cliente ya tiene el PDF anterior: si el cambio es de precio, "
         "vuelva a enviarle el documento."),
        ("¿Cuántas propuestas puedo poner en una cotización?",
         "Las que necesite. Lo habitual son dos o tres alternativas. Cada una sale como una "
         "sección numerada del documento."),
        ("¿El número de la cotización lo escribo yo?",
         "Se asigna solo (ANC001, ANC002…), pero puede cambiarlo si su empresa usa otra "
         "numeración."),
        ("¿Qué pasa si no lleno los textos del documento?",
         "Se imprime el texto estándar de la empresa. Un campo vacío nunca sale en blanco."),
        ("¿Puedo trabajar desde el celular?",
         "Sí. El sistema se adapta a la pantalla del teléfono. Para armar una cotización "
         "larga es más cómodo el computador, pero para consultar o generar el PDF funciona "
         "bien desde el celular."),
        ("¿Los precios del catálogo se actualizan?",
         "El catálogo trae precios de referencia. Si cambian, puede escribir el valor "
         "correcto en cada cotización. Para cambiarlos de forma permanente, pida apoyo "
         "a quien administra el sistema."),
        ("¿Qué es «Aprobar y crear obra»?",
         "Cuando el cliente acepta, ese botón convierte la cotización en una obra dentro del "
         "sistema, con sus valores ya cargados. Así no reescribe los datos."),
        ("¿Se pierde algo si se cierra el navegador?",
         "No, si el indicador decía <b>Guardado</b>. El sistema guarda solo mientras trabaja. "
         "Si estaba en rojo, espere a que guarde antes de cerrar."),
    ]
    for preg, resp in faq:
        H.append(Paragraph(preg, E["h3"]))
        H.append(Paragraph(resp, E["p"]))

    H.append(PageBreak())

    # ------------------------------------------------- 14. problemas
    H.append(paso(14, "Solución de problemas comunes"))
    H.append(tabla(
        ["Qué ve", "Qué significa", "Qué hacer"],
        [["<b>Correo o contraseña incorrectos</b>",
          "Los datos no coinciden.",
          "Revise mayúsculas y que no haya espacios al final. Si sigue, use "
          "«¿Olvidaste tu contraseña?»."],
         ["<b>La cuenta no tiene permisos en esta empresa</b>",
          "El usuario existe pero no está autorizado.",
          "Avise a quien administra el sistema: falta asignarle el acceso."],
         ["<b>Sin conexión — recarga la página</b>",
          "No se pudo conectar con la base de datos. Lo que ve en pantalla no es "
          "información real.",
          "Revise su internet y recargue (tecla F5). No escriba datos mientras vea "
          "este mensaje."],
         ["<b>Cambios sin guardar</b> (rojo)",
          "Se perdió la conexión al guardar.",
          "Espere: reintenta solo. O presione el indicador. No cierre el navegador."],
         ["El PDF sale sin imágenes",
          "El navegador no imprime los fondos.",
          "En el cuadro de impresión, «Más configuraciones» → active "
          "<b>Gráficos de fondo</b>."],
         ["No se abre la pestaña del PDF",
          "El navegador bloqueó la ventana emergente.",
          "Permita las ventanas emergentes para este sitio (aviso en la barra de "
          "direcciones) y vuelva a presionar PDF."],
         ["El total no cuadra con lo que esperaba",
          "Suele ser la utilidad o un valor mal escrito.",
          "Revise el campo <b>Utilidad %</b> y que los valores unitarios no tengan "
          "puntos ni comas."],
         ["No encuentro una cotización",
          "Puede estar filtrada.",
          "Ponga el filtro de obra en <b>Todas las obras</b> y borre lo escrito en el "
          "buscador."]],
        anchos=[42 * mm, 46 * mm, ANCHO_UTIL - 88 * mm]))

    H.append(PageBreak())

    # ------------------------------------------------- 15. tips
    H.append(paso(15, "Tips y recomendaciones"))
    consejos = [
        ("Duplique en vez de escribir de nuevo",
         "Para alternativas parecidas, use <b>Duplicar</b> y cambie solo la cantidad. "
         "Ahorra tiempo y evita errores de copia."),
        ("Revise con la vista previa, no con el PDF",
         "Es más rápido: active <b>Ver documento</b> y corrija mientras escribe, en lugar de "
         "generar el PDF, revisarlo y volver atrás."),
        ("Ponga fotos: venden",
         "Una foto de la cubierta o del detalle del anclaje hace la oferta mucho más "
         "convincente. Salen impresas automáticamente."),
        ("Confirme el indicador antes de cerrar",
         "Mire arriba a la derecha y asegúrese de que diga <b>Guardado</b> con la hora."),
        ("Nombres claros para las propuestas",
         "En vez de «Propuesta A», escriba «30 puntos de anclaje — Cubierta #1». El cliente "
         "entiende de una qué está comparando."),
        ("Verifique el total antes de enviar",
         "Es el dato que el cliente mira primero. Un cero de más cuesta caro."),
        ("Cierre sesión en computadores compartidos",
         "Desde el menú de su correo, arriba a la derecha. La información de nómina y "
         "contabilidad queda expuesta si no lo hace."),
        ("Use el buscador",
         "Con el nombre del cliente o de la obra encuentra cualquier cotización en segundos."),
    ]
    for titulo, texto in consejos:
        bloque = Table([[
            [Paragraph(f'<font color="{ROJO.hexval()}"><b>{titulo}</b></font>', E["nota"]),
             Spacer(1, 3),
             Paragraph(texto, E["nota"])]
        ]], colWidths=[ANCHO_UTIL])
        bloque.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), FONDO),
            ("LINEBEFORE", (0, 0), (0, -1), 2.2, ROJO),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        H.append(bloque)
        H.append(Spacer(1, 4 * mm))

    H.append(Spacer(1, 6 * mm))
    H.append(aviso(
        "¿Le quedó una duda que esta guía no resuelve? Anótela y pásela a quien administra "
        "el sistema: la guía se puede ampliar.", tono="info", titulo="Para terminar"))

    doc.build(H)
    return ruta


if __name__ == "__main__":
    destino = construir()
    print("PDF generado:", destino)
    print("Tamano:", round(os.path.getsize(destino) / 1024, 1), "KB")
