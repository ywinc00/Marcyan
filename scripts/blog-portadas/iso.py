# Motor isométrico mínimo para las portadas del blog de Marcyan (serie v3).
# Principio tomado del blog de WorkOS (no sus imágenes): un objeto-metáfora grande,
# volumen con degradados suaves, paleta acotada, grano y luz dirigida. Identidad Marcyan:
# noche cálida, oro como luz, crema como cara iluminada, teal solo en guías de IA.
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SS = 2  # supersampling


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def lerp(a, b, t):
    return a + (b - a) * t


MAT = {
    'oro': dict(top=('#f6ecd6', '#c8a96e'), lit=('#d9bd84', '#4a3a22'), dark=('#3a3125', '#100e0b'), rim='#fff3d6'),
    'crema': dict(top=('#fbf7ef', '#d8cfbf'), lit=('#e6dccb', '#6b6153'), dark=('#4a453d', '#151412'), rim='#ffffff'),
    'noche': dict(top=('#34302a', '#1d1b18'), lit=('#3a342a', '#14120f'), dark=('#1b1916', '#0b0a09'), rim='#c8a96e'),
    'teal': dict(top=('#e3f7ef', '#4fc3a1'), lit=('#5cc7a6', '#123b30'), dark=('#1f4a3e', '#08130f'), rim='#d8fff1'),
}


class Lienzo:
    def __init__(self, w=1280, h=800, scale=1.0, cx=None, cy=None):
        self.W, self.H = w * SS, h * SS
        self.w, self.h = w, h
        self.a = np.zeros((self.H, self.W, 3), np.float32)
        self.s = scale * SS
        self.cx = (cx if cx is not None else w / 2) * SS
        self.cy = (cy if cy is not None else h / 2) * SS

    # proyección isométrica: +x abajo-derecha, +y abajo-izquierda, +z arriba
    def p(self, x, y, z=0):
        c, s = math.cos(math.radians(30)), math.sin(math.radians(30))
        return (self.cx + (x - y) * c * self.s, self.cy + (x + y) * s * self.s - z * self.s)

    # --- primitivas de pintura -------------------------------------------------
    def _mask(self, polys, holes=()):
        allp = [q for pl in polys for q in pl]
        xs = [q[0] for q in allp]; ys = [q[1] for q in allp]
        x0, y0 = max(int(min(xs)) - 2, 0), max(int(min(ys)) - 2, 0)
        x1, y1 = min(int(max(xs)) + 3, self.W), min(int(max(ys)) + 3, self.H)
        if x1 <= x0 or y1 <= y0:
            return None
        m = Image.new('L', (x1 - x0, y1 - y0), 0)
        d = ImageDraw.Draw(m)
        for pl in polys:
            d.polygon([(q[0] - x0, q[1] - y0) for q in pl], fill=255)
        for pl in holes:
            d.polygon([(q[0] - x0, q[1] - y0) for q in pl], fill=0)
        return x0, y0, np.asarray(m, np.float32) / 255.0

    def fill(self, polys, A, B, cA, cB, alpha=1.0, holes=()):
        r = self._mask(polys, holes)
        if r is None:
            return
        x0, y0, m = r
        h, w = m.shape
        yy, xx = np.mgrid[y0:y0 + h, x0:x0 + w].astype(np.float32)
        ax, ay = A; bx, by = B
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy or 1.0
        t = np.clip(((xx - ax) * dx + (yy - ay) * dy) / L2, 0, 1)[..., None]
        ca, cb = hexrgb(cA) if isinstance(cA, str) else cA, hexrgb(cB) if isinstance(cB, str) else cB
        col = ca + (cb - ca) * t
        k = (m * alpha)[..., None]
        reg = self.a[y0:y0 + h, x0:x0 + w]
        self.a[y0:y0 + h, x0:x0 + w] = reg * (1 - k) + col * k

    def glow(self, x, y, rx, ry, color, alpha, add=True):
        """Mancha de luz radial (en px finales)."""
        x, y, rx, ry = x * SS, y * SS, rx * SS, ry * SS
        yy, xx = np.mgrid[0:self.H, 0:self.W].astype(np.float32)
        d = np.sqrt(((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2)
        k = np.clip(1 - d, 0, 1) ** 2 * alpha
        c = hexrgb(color)
        if add:
            self.a += c * k[..., None]
        else:
            self.a = self.a * (1 - k[..., None]) + c * k[..., None]

    def line(self, pts, color, width=1.0, alpha=1.0):
        allx = [q[0] for q in pts]; ally = [q[1] for q in pts]
        x0, y0 = max(int(min(allx)) - 8, 0), max(int(min(ally)) - 8, 0)
        x1, y1 = min(int(max(allx)) + 8, self.W), min(int(max(ally)) + 8, self.H)
        if x1 <= x0 or y1 <= y0:
            return
        m = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(m).line([(q[0] - x0, q[1] - y0) for q in pts], fill=255, width=max(1, int(width * SS)), joint='curve')
        k = (np.asarray(m, np.float32) / 255.0 * alpha)[..., None]
        reg = self.a[y0:y1, x0:x1]
        self.a[y0:y1, x0:x1] = reg * (1 - k) + hexrgb(color) * k

    def sombra(self, pts2d_world, z=0, blur=40, alpha=0.6, dx=0, dy=0):
        poly = [self.p(x + dx, y + dy, z) for x, y in pts2d_world]
        m = Image.new('L', (self.W, self.H), 0)
        ImageDraw.Draw(m).polygon(poly, fill=255)
        m = m.filter(ImageFilter.GaussianBlur(blur * SS))
        k = (np.asarray(m, np.float32) / 255.0 * alpha)[..., None]
        self.a = self.a * (1 - k)

    # --- sólidos ----------------------------------------------------------------
    def prisma(self, poly, z0, z1, mat='oro', hole=None, floor_mat=None, rim=0.55, luz=(-0.35, 1.0), top=True, fase='todo', suelo='oscuro'):
        """Extruye un polígono del plano XY (sentido antihorario visto desde arriba) de z0 a z1.
        hole: polígono interior (abre el sólido, p. ej. caja o anillo)."""
        M = MAT[mat]
        lx, ly = luz; ln = math.hypot(lx, ly); lx, ly = lx / ln, ly / ln
        n = len(poly)
        if hole is not None and fase in ('todo', 'fondo'):
            # suelo interior y paredes interiores lejanas (normal hacia el centro que mira al espectador)
            fm = MAT[floor_mat or mat]
            fz = z0 + (z1 - z0) * 0.12
            fl = [self.p(x, y, fz) for x, y in hole]
            fc = fm['top'] if suelo == 'claro' else fm['dark']
            self.fill([fl], self.p(*hole[0], fz), self.p(*hole[len(hole) // 2], fz), fc[0], fc[1])
            m = len(hole)
            for i in range(m):
                a, b = hole[i], hole[(i + 1) % m]
                ex, ey = b[0] - a[0], b[1] - a[1]
                nx, ny = (-ey, ex) if area(hole) > 0 else (ey, -ex)  # hacia dentro
                L = math.hypot(nx, ny) or 1
                nx, ny = nx / L, ny / L
                if nx + ny <= 0:
                    continue
                q = [self.p(a[0], a[1], z1), self.p(b[0], b[1], z1), self.p(b[0], b[1], fz), self.p(a[0], a[1], fz)]
                t = (nx * lx + ny * ly + 1) / 2
                c_top = lerp(hexrgb(M['dark'][0]), hexrgb(M['lit'][0]), t * 0.8)
                c_bot = lerp(hexrgb(M['dark'][1]), hexrgb(M['lit'][1]), t * 0.4)
                self.fill([q], self.p(a[0], a[1], z1), self.p(a[0], a[1], fz), c_top, c_bot)
        if fase == 'fondo':
            return
        faces = []
        sa = area(poly)
        for i in range(n):
            a, b = poly[i], poly[(i + 1) % n]
            ex, ey = b[0] - a[0], b[1] - a[1]
            nx, ny = (ey, -ex) if sa > 0 else (-ey, ex)  # hacia fuera
            L = math.hypot(nx, ny) or 1
            nx, ny = nx / L, ny / L
            if nx + ny <= -1e-6:
                continue
            faces.append(((a[0] + b[0] + a[1] + b[1]) / 2, a, b, nx, ny))
        faces.sort(key=lambda f: f[0])
        for _, a, b, nx, ny in faces:
            q = [self.p(a[0], a[1], z1), self.p(b[0], b[1], z1), self.p(b[0], b[1], z0), self.p(a[0], a[1], z0)]
            t = (nx * lx + ny * ly + 1) / 2
            c_top = lerp(hexrgb(M['dark'][0]), hexrgb(M['lit'][0]), t)
            c_bot = lerp(hexrgb(M['dark'][1]), hexrgb(M['lit'][1]), t)
            self.fill([q], self.p(a[0], a[1], z1), self.p(a[0], a[1], z0), c_top, c_bot)
        if top:
            tp = [self.p(x, y, z1) for x, y in poly]
            holes = [[self.p(x, y, z1) for x, y in hole]] if hole is not None else ()
            xs = [q[0] for q in tp]; ys = [q[1] for q in tp]
            # degradado diagonal: luz arriba-izquierda
            self.fill([tp], (min(xs), min(ys)), (max(xs), max(ys)), M['top'][0], M['top'][1], holes=holes)
            if rim:
                # filo de luz en el borde frontal (las aristas que dan al espectador)
                for _, a, b, nx, ny in faces:
                    self.line([self.p(a[0], a[1], z1), self.p(b[0], b[1], z1)], M['rim'], 1.2, rim * min(1, (nx + ny)))

    def caja(self, x, y, w, d, z0, z1, **kw):
        self.prisma(rect(x, y, w, d), z0, z1, **kw)

    # --- salida -------------------------------------------------------------------
    def fondo(self, base='#0b0a09', top='#14110c'):
        yy = np.linspace(0, 1, self.H, dtype=np.float32)[:, None, None]
        self.a[:] = hexrgb(top) * (1 - yy) + hexrgb(base) * yy

    def guardar(self, path_base, grano=5.0, viñeta=0.35, sizes=(1280, 960, 640), q=74):
        a = self.a
        # viñeta
        yy, xx = np.mgrid[0:self.H, 0:self.W].astype(np.float32)
        d = np.sqrt(((xx - self.W / 2) / (self.W * .62)) ** 2 + ((yy - self.H / 2) / (self.H * .62)) ** 2)
        a = a * (1 - np.clip(d - .55, 0, 1)[..., None] * viñeta * 2)
        img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((self.w, self.h), Image.LANCZOS)
        if grano:
            rng = np.random.default_rng(7)
            arr = np.asarray(img, np.float32)
            n = rng.normal(0, grano, (self.h, self.w, 1)).astype(np.float32)
            lum = arr.mean(axis=2, keepdims=True) / 255
            arr = arr + n * (0.35 + 0.65 * lum)
            img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        out = []
        for w in sizes:
            h = round(w * self.h / self.w)
            im = img.resize((w, h), Image.LANCZOS) if w != self.w else img
            f = f'{path_base}-{w}.webp'
            im.save(f, 'WEBP', quality=q, method=6)
            out.append(f)
        if os.environ.get('PREVIEW'):
            img.save(path_base + '-preview.png')
        return out


def rect(x, y, w, d):
    # antihorario visto desde arriba con +y hacia abajo-izquierda: orden (x,y)->(x,y+d)->(x+w,y+d)->(x+w,y)
    return [(x, y), (x, y + d), (x + w, y + d), (x + w, y)]


def redondo(x, y, w, d, r, seg=8):
    # construcción explícita
    pts = []
    def arc(cx, cy, a0, a1):
        for k in range(seg + 1):
            a = math.radians(a0 + (a1 - a0) * k / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    arc(x + r, y + r, 270, 180)
    arc(x + r, y + d - r, 180, 90)
    arc(x + w - r, y + d - r, 90, 0)
    arc(x + w - r, y + r, 0, -90)
    return pts


def circulo(cx, cy, r, seg=72):
    # mismo sentido que rect()
    return [(cx + r * math.cos(-2 * math.pi * k / seg + math.pi), cy + r * math.sin(-2 * math.pi * k / seg + math.pi)) for k in range(seg)][::-1]


def area(poly):
    return sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))) / 2


class Medidor(Lienzo):
    """Pasada en seco: registra los puntos proyectados para encuadrar la composición."""
    def __init__(self):
        super().__init__(w=8, h=8, scale=1.0 / SS, cx=0, cy=0)
        self.pts = []
    def fill(self, polys, *a, **k):
        for pl in polys: self.pts += pl
    def line(self, pts, *a, **k): self.pts += pts
    def sombra(self, *a, **k): pass
    def glow(self, *a, **k): pass
    def fondo(self, *a, **k): pass
    def bbox(self):
        xs = [q[0] for q in self.pts]; ys = [q[1] for q in self.pts]
        return min(xs), min(ys), max(xs), max(ys)
