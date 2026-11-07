"""Escaleras de resolución para las imágenes fijas del sitio (v4, E-58).

Una sola resolución por imagen se veía pixelada o con dientes de sierra: grande al reducirse
mucho (el navegador submuestrea) y pequeña al ampliarse. Aquí se generan anchos intermedios
desde el ORIGINAL más grande (Lanczos), y los componentes los sirven con srcset + sizes
(srcset + sizes en cada componente). Ejecutar tras añadir o cambiar una imagen:  python scripts/imagenes/variantes.py
"""
from pathlib import Path
from PIL import Image

PUB = Path(__file__).resolve().parents[2] / 'public'
Q = 82

def escalera(src: Path, anchos, nombre):
    im = Image.open(src).convert('RGBA' if src.suffix == '.png' else 'RGB')
    for w in anchos:
        if w >= im.width:
            continue
        h = round(im.height * w / im.width)
        out = src.parent / nombre(w)
        im.resize((w, h), Image.LANCZOS).save(out, 'WEBP', quality=Q, method=6)
        print(out.relative_to(PUB), w, h)

# Avatar de Marcy (original 256 px, sale a 16-58 px): 32/64/96/128 + el original.
escalera(PUB / 'assets/bot/marcy-mini.png', (32, 64, 96, 128), lambda w: f'marcy-mini-{w}.webp')
# Marcy de cuerpo (364 px de ancho, sale a 120-364 px).
escalera(PUB / 'assets/bot/marcy-hero.png', (182, 270), lambda w: f'marcy-hero-{w}.webp')
# Capturas de proyectos (escritorio 1920 y móvil 1320).
for f in sorted((PUB / 'Galeria').glob('*-pc.webp')):
    escalera(f, (480, 640, 1280), lambda w, s=f.stem: f'{s}-{w}.webp')
for f in sorted((PUB / 'Galeria').glob('*-movil.webp')):
    escalera(f, (160, 260, 390, 780), lambda w, s=f.stem: f'{s}-{w}.webp')
