"""Monta la página de Houston vuelta 6 (atmósfera) en un solo HTML.
Uso: python build4.py <dir proto4> [--artifact]
Local: proto4/houston-atmosfera.html (con doctype). Artifact: proto4/houston-atmosfera-art.html (sin esqueleto)."""
import sys, os
d = sys.argv[1]
art = '--artifact' in sys.argv
rd = lambda f: open(os.path.join(d, f), encoding='utf-8').read()
css = rd('base.css') + '\n' + rd('page.css')
body = rd('cuerpo.html')
head = """<title>Houston, la atmósfera</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@300..700&display=swap">
<script>document.documentElement.classList.add('js')</script>
<style>""" + css + "</style>\n"
scripts = """
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script src="geo-data.js"></script>
<script src="lucide.js"></script>
<script src="atmo.js"></script>
<script src="hero.js"></script>
<script src="page.js"></script>
"""
if art:
    html = head + body + scripts
    out = os.path.join(d, 'houston-atmosfera-art.html')
else:
    html = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + head + '</head>\n<body>\n' + body + scripts + '</body>\n</html>\n'
    out = os.path.join(d, 'houston-atmosfera.html')
open(out, 'w', encoding='utf-8').write(html)
print('ok', out, len(html))
