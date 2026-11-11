"""Fondo de hero de los barrios (v4, E-58): plano REAL de calles de noche.

Principio tomado de Mapbox (Refero 8ae30fcd-d223-493b-b4d2-e06910d2dc55): el mapa es la única luz
de la composición. Datos: OpenStreetMap (ODbL, © colaboradores de OpenStreetMap; el crédito va en
el hero). Se piden a Overpass una vez y se guardan (sin versionar) en scripts/mapas-barrio/osm/.

Proyección = la MISMA del chip del barrio (src/components/w/objetos/barrios/<barrio>.svg.ts, generado
por scripts/w/build-barrio-tracks.mjs): mismo centro y misma escala (900 px de escritorio por la
ventana de `km` del chip). Así las vías del chip caen encima de sus autopistas reales.
El centro del chip va en (CX, CY) de la imagen; F31Mapa.astro lo coloca sobre el chip medido.

Salida: public/assets/w/barrios/<barrio>-mapa-{1200,2400,3600}.webp (ancho de escritorio 2400 = 1x).
Ejecutar:  python scripts/mapas-barrio/render.py [barrio ...]
"""
import json, math, re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parents[2]
OSM = Path(__file__).parent / 'osm'
OUT = RAIZ / 'public/assets/w/barrios'
CHIPS = RAIZ / 'src/components/w/objetos/barrios'

W1, H1 = 2400, 1400          # tamaño 1x (escritorio)
CX, CY = 1200, 700           # centro del chip en la imagen (1x)
ESC = 1.5                    # se dibuja a 1,5x (3600 px) y se reduce
# Radio (km) con calles de barrio; fuera, solo las vías de primary hacia arriba.
RES_KM = {'katy': 13, 'sugar-land': 13, 'doral': 9, 'hialeah': 8}
ORO = (200, 169, 110)
CLASE = {  # ancho (px a 1x), opacidad, halo
    'motorway': (3.2, 1.0, True), 'trunk': (2.8, .95, True),
    'motorway_link': (1.3, .5, False), 'trunk_link': (1.2, .45, False),
    'primary': (1.8, .6, True), 'secondary': (1.4, .42, False), 'tertiary': (1.1, .4, False),
    'unclassified': (.9, .3, False), 'residential': (.8, .26, False),
}

def chip(nombre):
    s = (CHIPS / f'{nombre}.svg.ts').read_text(encoding='utf-8')
    m = re.search(r'Ventana de ([\d.]+) km de ancho centrada en (-?[\d.]+), (-?[\d.]+)', s)
    return float(m.group(1)), float(m.group(2)), float(m.group(3))

def overpass(q):
    import urllib.parse, urllib.request
    error = None
    for url in ('https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
                'https://maps.mail.ru/osm/tools/overpass/api/interpreter'):
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(),
                                         headers={'User-Agent': 'marcyan-map-render/1.0'})
            return urllib.request.urlopen(req, timeout=180).read()
        except Exception as ex:  # servidor saturado: siguiente espejo
            error = ex
    raise error

def datos(nombre, caja_mayor, caja_barrio):
    OSM.mkdir(exist_ok=True)
    f = OSM / f'{nombre}-v2.json'
    if not f.exists():
        bm = ','.join(f'{v:.4f}' for v in caja_mayor); bb = ','.join(f'{v:.4f}' for v in caja_barrio)
        q = (f'[out:json][timeout:170];('
             f'way["highway"~"^(motorway|trunk|primary|secondary|motorway_link|trunk_link)$"]({bm});'
             f'way["highway"~"^(tertiary|residential|unclassified)$"]({bb});'
             f'way["natural"="water"]({bm});'
             f');out geom;')
        f.write_bytes(overpass(q))
    return json.load(open(f, encoding='utf-8'))

def render(nombre):
    km, lon, lat = chip(nombre)
    kx = 111.32 * math.cos(math.radians(lat)); ky = 110.57
    s1 = 900 / km                                     # px por km a 1x (escala del chip)
    W, H, s = int(W1 * ESC), int(H1 * ESC), s1 * ESC
    cx, cy = CX * ESC, CY * ESC
    P = lambda p: (cx + (p['lon'] - lon) * kx * s, cy - (p['lat'] - lat) * ky * s)
    inv = lambda x, y: (lon + (x - cx) / (kx * s), lat - (y - cy) / (ky * s))
    (w, n), (e, sur) = inv(0, 0), inv(W, H)
    r = RES_KM[nombre]
    caja_b = (lat - r / ky, lon - r / kx, lat + r / ky, lon + r / kx)
    d = datos(nombre, (sur, w, n, e), caja_b)

    agua = Image.new('L', (W, H), 0); da = ImageDraw.Draw(agua)
    capas = {k: Image.new('L', (W, H), 0) for k in ('fina', 'media', 'halo')}
    dib = {k: ImageDraw.Draw(v) for k, v in capas.items()}
    els = sorted(d['elements'], key=lambda el: CLASE.get(el.get('tags', {}).get('highway', ''), (0, 0, 0))[0])
    for el in els:
        g = el.get('geometry'); t = el.get('tags', {})
        if not g: continue
        pts = [P(p) for p in g]
        if t.get('natural') == 'water':
            if len(pts) > 2: da.polygon(pts, fill=255)
            continue
        c = CLASE.get(t.get('highway'))
        if not c or len(pts) < 2: continue
        ancho, op, halo = c
        a = ancho * ESC
        capa = 'media' if ancho >= 1.2 else 'fina'
        dib[capa].line(pts, fill=int(255 * op), width=max(1, round(a)), joint='curve')
        if halo: dib['halo'].line(pts, fill=int(255 * op), width=round(a * 6), joint='curve')

    # Las calles de barrio se funden hacia su radio (sin borde de círculo).
    rad = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(rad)
    rx = ry = r * s
    dr.ellipse((cx - rx * .7, cy - ry * .7, cx + rx * .7, cy + ry * .7), fill=255)
    rad = rad.filter(ImageFilter.GaussianBlur(r * s * .28))
    from PIL import ImageChops
    capas['fina'] = ImageChops.multiply(capas['fina'], rad)

    base = Image.new('RGB', (W, H), (8, 8, 8))
    base.paste((12, 16, 22), mask=agua.filter(ImageFilter.GaussianBlur(1.5)))
    halo = capas['halo'].filter(ImageFilter.GaussianBlur(16 * ESC)).point(lambda v: int(v * .24))
    base.paste((214, 150, 84), mask=halo)
    base.paste(ORO, mask=capas['fina'])
    base.paste((226, 196, 140), mask=capas['media'])
    luz = Image.new('L', (W, H), 0); dl = ImageDraw.Draw(luz)
    rr = 420 * ESC
    dl.ellipse((cx - rr, cy - rr * .6, cx + rr, cy + rr * .6), fill=64)
    base.paste((226, 150, 90), mask=luz.filter(ImageFilter.GaussianBlur(200 * ESC)))

    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob(f'{nombre}-mapa-*.webp'):
        old.unlink()
    for ancho in (1200, 2400, 3600):
        alto = round(H * ancho / W)
        out = OUT / f'{nombre}-mapa-{ancho}.webp'
        base.resize((ancho, alto), Image.LANCZOS).save(out, 'WEBP', quality=70, method=6)
        print(nombre, ancho, out.stat().st_size)

if __name__ == '__main__':
    for b in (sys.argv[1:] or RES_KM):
        render(b)
