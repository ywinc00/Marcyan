# Portadas del blog (vuelta 3). Uso: python scripts/blog-portadas/covers.py public/assets/blog/portadas [slug...]
# Una función por guía; al añadir una guía, se añade su función a COVERS y su slug a
# src/components/w/sections/blog/portadas.ts.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from iso import *

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(OUT, exist_ok=True)
ONLY = sys.argv[2:]


def base(L, gx=640, gy=430, beam_x=None):
    """Noche cálida + amanecer oro bajo el objeto + haz de luz suave. Un solo motivo: la luz."""
    L.fondo(base='#0b0907', top='#1a150e')
    L.glow(gx + 260, gy + 300, 900, 520, '#8a6a36', .45)
    L.glow(gx, gy + 140, 640, 320, '#c8a96e', .28)
    L.glow(gx - 300, gy - 360, 700, 420, '#3a2f22', .35)
    L.glow(gx, gy, 420, 300, '#f0dcb0', .10)
    if beam_x is not None:
        L.glow(beam_x, 0, 170, 700, '#f6e7c4', .12)


def precio_web(L):
    blocks = [(-230, 70, 260, 'oro'), (-70, 70, 160, 'crema'), (90, 70, 70, 'noche')]
    for y, d, h, m in blocks:
        L.sombra(rect(-90, y, 180, 150), blur=26, alpha=.55, dx=26, dy=18)
    for y, d, h, m in blocks:
        L.caja(-90, y, 180, 150, 0, h, mat=m)
    # ventana de navegador en la cara de arriba del bloque más alto
    z = 260
    fr = rect(-70, -212, 140, 114)
    L.fill([[L.p(x, yy, z) for x, yy in fr]], L.p(-70, -212, z), L.p(70, -98, z), '#1b1814', '#0f0d0b')
    bar = rect(-70, -212, 22, 114)
    L.fill([[L.p(x, yy, z) for x, yy in bar]], L.p(-70, -212, z), L.p(-48, -98, z), '#3a3226', '#2a241b')
    for k, c in enumerate(['#c8a96e', '#8a7a5c', '#5a5040']):
        L.prisma(circulo(-59, -200 + k * 12, 3.4, 24), z, z + 2, mat='oro', rim=0)
    for k, w in enumerate([92, 70, 80]):
        r = rect(-36 + k * 22, -200, 10, w)
        L.fill([[L.p(x, yy, z) for x, yy in r]], L.p(-36, -200, z), L.p(-26, -200 + w, z), '#c8a96e', '#6e5c3c', alpha=.75)
    return L


def chatbot_precio(L):
    L.sombra(circulo(0, 0, 120), blur=24, alpha=.6, dx=24, dy=16)
    for k in range(8):
        off = [(0, 0), (6, -4), (-3, 5), (4, 3), (-5, -2), (2, -6), (-4, 4), (3, 0)][k]
        L.prisma(circulo(off[0], off[1], 100, 240), k * 15, k * 15 + 12, mat='oro', rim=.5)
    # bocadillo flotante (teal: guía de IA)
    zb = 250
    bub = redondo(-190, -150, 300, 230, 60, 10)
    L.sombra(bub, z=120, blur=40, alpha=.35, dx=30, dy=20)
    L.prisma([(10, 80), (60, 130), (-40, 80)][::-1] if area([(10, 80), (60, 130), (-40, 80)]) < 0 else [(10, 80), (60, 130), (-40, 80)], zb, zb + 34, mat='teal', rim=.6)
    L.prisma(bub, zb, zb + 34, mat='teal', rim=.6)
    # tres puntos de "escribiendo" sobre la cara superior, alineados con el eje largo del bocadillo
    for k in range(3):
        L.prisma(circulo(-40 + (k - 1) * 0, -35 + (k - 1) * 62, 17, 40), zb + 34, zb + 46, mat='noche', rim=.4)
    return L


def aparecer_ia(L):
    L.glow(640, 120, 120, 420, '#e8fff6', .10)
    tiles = []
    for i in range(-2, 3):
        for j in range(-2, 3):
            tiles.append((i + j, i, j))
    tiles.sort()
    for _, i, j in tiles:
        x, y = i * 96 - 40, j * 96 - 40
        if i == 0 and j == 0:
            L.sombra(rect(x, y, 80, 80), blur=20, alpha=.6, dx=40, dy=24)
            L.caja(x, y, 80, 80, 0, 230, mat='oro', rim=.8)
            # anillo teal flotando sobre el pilar elegido
            L.prisma(circulo(0, 0, 62, 200), 300, 312, mat="teal", hole=circulo(0, 0, 48, 200), rim=.6)
        else:
            far = max(abs(i), abs(j))
            L.caja(x, y, 80, 80, 0, 22 - far * 4, mat='noche', rim=.35)
    return L


def elegir_agencia(L):
    L.glow(640, 300, 200, 300, '#f6e2b4', .20)
    box, hole = rect(-150, -150, 300, 300), rect(-130, -130, 260, 260)
    L.sombra(box, blur=30, alpha=.65, dx=30, dy=20)
    L.prisma(box, 0, 130, mat='noche', hole=hole, floor_mat='oro', fase='fondo')
    # luz que sale de la caja abierta
    L.glow(640, 380, 170, 200, '#c8a96e', .35)
    # tarjeta de precio que sube, a la vista
    L.caja(-40, -120, 28, 240, 30, 400, mat='crema', rim=.8)
    L.caja(-12, -120, 3, 240, 30, 400, mat='oro', rim=0)
    # cifra visible en la cara de la tarjeta: tres barras de "precio" (sin texto)
    for k, (zz, w) in enumerate([(330, 150), (290, 110), (250, 170)]):
        a, b = L.p(-9, -100, zz), L.p(-9, -100 + w, zz)
        L.line([a, b], '#c8a96e' if k == 0 else '#8a7a5c', 7 if k == 0 else 4, .95)
    L.prisma(box, 0, 130, mat='noche', hole=hole, floor_mat='oro', fase='frente', rim=.7)
    return L


def restaurantes(L):
    L.sombra(circulo(0, 0, 270), blur=30, alpha=.6, dx=24, dy=18)
    L.prisma(circulo(0, 0, 268, 360), 0, 32, mat='crema', hole=circulo(0, 0, 200, 360), floor_mat='crema', rim=.6, suelo='claro')
    # cuadrícula tipo código QR en relieve (patrón propio, no escaneable)
    n, s = 9, 30
    pat = [
        '111101111',
        '100100001',
        '101011101',
        '111010111',
        '010111010',
        '110101011',
        '111100101',
        '100011001',
        '111101111',
    ]
    cells = []
    for i in range(n):
        for j in range(n):
            if pat[i][j] == '1':
                cells.append((i + j, i, j))
    cells.sort()
    x0 = -n * s / 2
    for _, i, j in cells:
        corner = (i < 3 and j < 3) or (i < 3 and j > 5) or (i > 5 and j < 3)
        h = 34 if corner else 18 + ((i * 7 + j * 3) % 3) * 6
        L.caja(x0 + i * s + 2, x0 + j * s + 2, s - 4, s - 4, 4, 4 + h, mat='oro' if corner else 'noche', rim=.45)
    return L


def llamadas(L):
    ph = redondo(-110, -190, 220, 400, 36, 8)
    L.sombra(ph, blur=26, alpha=.65, dx=24, dy=16)
    L.prisma(ph, 0, 26, mat='noche', rim=.6)
    scr = redondo(-96, -176, 192, 372, 26, 8)
    L.fill([[L.p(x, y, 26) for x, y in scr]], L.p(-96, -176, 26), L.p(96, 196, 26), '#2a261f', '#14120f')
    # mensajes respondidos que suben del teléfono
    for k, (zz, m) in enumerate([(80, 'crema'), (170, 'crema'), (260, 'teal')]):
        msg = redondo(-120 + k * 10, -110 - k * 70, 210, 110, 28, 8)
        L.sombra(msg, z=26, blur=22, alpha=.25, dx=18, dy=14)
        L.prisma(msg, zz, zz + 20, mat=m, rim=.6)
        for t, w in enumerate([150, 100]):
            r = rect(-120 + k * 10 + 26, -110 - k * 70 + 30 + t * 30, w, 12)
            L.fill([[L.p(x, y, zz + 20) for x, y in r]], L.p(r[0][0], r[0][1], zz + 20), L.p(r[2][0], r[2][1], zz + 20), '#1b1916', '#3a342a', alpha=.55)
    return L


def render(fn, beam=True, fw=.74, fh=.70):
    m = Medidor(); fn(m)
    x0, y0, x1, y1 = m.bbox()
    W, H = 1280, 800
    sc = min(W * fw / (x1 - x0), H * fh / (y1 - y0))
    cx = W / 2 - (x0 + x1) / 2 * sc
    cy = H * .52 - (y0 + y1) / 2 * sc
    L = Lienzo(W, H, scale=sc, cx=cx, cy=cy)
    gx, gy = W / 2, H * .52
    base(L, gx, gy, beam_x=gx + 60 if beam else None)
    fn(L)
    return L


COVERS = {
    'precio-pagina-web-houston-guia': precio_web,
    'cuanto-cuesta-chatbot-whatsapp-guia': chatbot_precio,
    'como-aparecer-en-chatgpt-perplexity': aparecer_ia,
    'como-elegir-agencia-diseno-web-hispana': elegir_agencia,
    'diseno-web-restaurantes-menu-pedidos-whatsapp': restaurantes,
    'ia-que-contesta-llamadas-mensajes-perdidos': llamadas,
}
for slug, fn in COVERS.items():
    if ONLY and slug not in ONLY:
        continue
    L = render(fn)
    files = L.guardar(os.path.join(OUT, slug))
    print(slug, [os.path.getsize(f) // 1024 for f in files])
