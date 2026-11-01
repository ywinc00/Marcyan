"""Construye la página completa de Houston: portada (planeta) + secciones nuevas + secciones actuales.
Uso: python build_page.py <hero.html> <dir proto3> <salida.html> [--artifact]"""
import re, sys

hero_p, d, out = sys.argv[1], sys.argv[2], sys.argv[3]
artifact = '--artifact' in sys.argv
h = open(hero_p, encoding='utf-8').read()
style = re.search(r'<style>(.*?)</style>', h, re.S).group(1)
body = re.search(r'<body>(.*)</body>', h, re.S).group(1)
body = body.replace("  window.__hz = { draw: (t) => draw(t, 0) };\n", "")

# la portada vive dentro de un contenedor que ocupa el ancho y escala el escenario de 1440×900
body = body.replace('<div class="stage" id="stage">', '<div class="hero-wrap" id="heroWrap"><div class="stage" id="stage">', 1)
i = body.index('<button class="replay"')
body = body[:i] + '</div>\n' + body[i:]
old_fit = re.search(r"  function fit\(\) \{.*?\n  \}\n", body, re.S).group(0)
new_fit = """  function fit() {
    const st = document.getElementById('stage'), wrap = document.getElementById('heroWrap');
    if (mobile()) { st.style.transform = 'none'; st.style.left = '0px'; st.style.top = '0px'; wrap.style.height = innerHeight + 'px'; return; }
    const s = Math.min(1.15, innerWidth / 1440);
    st.style.transform = `scale(${s})`; st.style.left = (innerWidth - 1440 * s) / 2 + 'px'; st.style.top = '0px';
    wrap.style.height = 900 * s + 'px';
  }
"""
body = body.replace(old_fit, new_fit)
# el escenario escalado: usar el ancho de la ventana para la nitidez del lienzo
body = body.replace("const stageScale = mobile() ? 1 : Math.min(innerWidth / 1440, innerHeight / 900);",
                    "const stageScale = mobile() ? 1 : Math.min(1.15, innerWidth / 1440);")
style = style.replace("html,body{width:100%;height:100%;margin:0;background:#080808;overflow:hidden}", "html,body{margin:0;background:#080808}")
style = style.replace("@media (max-width:600px){\n  .stage{width:100%;height:100%;transform:none!important}", "@media (max-width:600px){\n  .stage{width:100%;height:100%;transform:none!important}\n  .hero-wrap{height:100svh}")

secs = open(d + '/secciones.html', encoding='utf-8').read()
css = open(d + '/secciones.css', encoding='utf-8').read()
# las secciones van después de la portada y antes de los scripts
j = body.index('<script src="https://cdnjs')
body = body[:j] + '<main id="main-sections">\n' + secs + '\n</main>\n' + body[j:]
body = body.replace('<script src="base.js"></script>', '<script src="base.js"></script>\n<script src="metro.js"></script>')

head = """<title>Houston, página completa</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@300..700&display=swap">
<link rel="stylesheet" href="base.css">
<style>""" + style + "\n" + css + "</style>\n"
if artifact:
    html = head + body
else:
    html = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' + head + '</head>\n<body>' + body + '</body>\n</html>\n'
open(out, 'w', encoding='utf-8').write(html)
print('ok', out, len(html))
