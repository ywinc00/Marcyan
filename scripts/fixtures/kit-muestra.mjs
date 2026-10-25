// ════════════════════════════════════════════════════════════════
//  scripts/fixtures/kit-muestra.mjs — Brief de EJEMPLO para las pruebas del
//  kit .zip (npm run test:brief). Todo inventado: negocio, personas,
//  teléfonos 555, dominios example.com. Ningún dato real de clientes.
//  Forma: fila de `briefs` (columnas + extra + kit) y filas de brief_files
//  con los bytes falsos de cada archivo en memoria (FAKE_BYTES por pathname).
// ════════════════════════════════════════════════════════════════

export const SAMPLE_BRIEF = {
  id: 9001,
  project_id: 'MRC-099',
  status: 'in_progress',
  source: 'web',
  schema_version: 2,
  lang: 'es',
  services: ['diseno-web', 'seo-local'],
  created_at: '2026-10-01T15:00:00.000Z',
  updated_at: '2026-10-12T15:00:00.000Z',
  kit_status: 'submitted',
  kit_sent_at: '2026-10-05T15:00:00.000Z',
  kit_submitted_at: '2026-10-10T15:00:00.000Z',
  kit_token_hash: 'hash-que-nunca-debe-salir-en-el-kit',
  ip_address: '203.0.113.77',
  user_agent: 'Navegador de prueba 1.0',
  summary: 'Cliente con prisa por la temporada alta. Prefiere WhatsApp.',
  // ── 39 columnas históricas (las que se usan) ──
  business_name: 'Limpiezas Aurora',
  owner_name: 'Ana Ejemplo',
  industry: 'Limpieza de casas y oficinas',
  business_description: 'Limpieza profunda de casas y oficinas.\nTambién mudanzas y fin de obra.',
  phone: '(555) 010-0100',
  email: 'ana@example.com',
  city_state: 'Houston, TX',
  current_website: 'aurora-limpiezas.example.com',
  google_business: 'si',
  website_type: 'corporativo',
  has_domain: 'si',
  has_hosting: 'noSe',
  pages_required: ['Inicio (Home)', 'Servicios / Productos', 'FAQ'],
  features_required: ['Integración WhatsApp', 'Multilenguaje'],
  target_audience: 'Familias con niños y oficinas pequeñas del oeste de Houston.',
  main_objective: 'Más llamadas para limpiezas profundas.',
  visitor_action: 'Que pida una cotización por WhatsApp.',
  has_logo: 'si',
  brand_fonts: 'Fraunces y Work Sans',
  brand_personality: 'amigable',
  design_dislikes: 'Fondos negros y letras muy pequeñas.',
  has_photos: 'si',
  has_copy: 'parcial',
  has_video: 'si',
  language: 'biling',
  budget_range: '1000-2500',
  timeline: '2-4sem',
  deadline: 'Antes de noviembre',
  additional_notes: 'Quiere salir en Google antes de diciembre.',
  referred_by: 'google',
  previous_agency: 'no',
  // ── extra (momento inicial, campos nuevos) ──
  extra: {
    preferred_contact: 'whatsapp',
  },
  // ── kit (momento arranque, campos nuevos) ──
  kit: {
    legal_name: 'Aurora Ejemplo Cleaning LLC',
    legal_form: 'llc',
    start_month: '2019-03',
    employees: 6,
    attributes: ['latino_owned', 'bilingual_team'],
    payment_methods: ['cash', 'zelle', 'card'],
    service_mode: 'onsite',
    address: '100 Calle Falsa, Houston, TX 77000',
    address_public: 'no',
    zones: [{ place: 'Katy', zip: '77450', frequency: 'often' }, { place: 'Memorial', zip: null, frequency: 'sometimes' }],
    service_radius: 25,
    hours: { mon: { closed: false, open: '08:00', close: '18:00' }, sat: { closed: false, open: '09:00', close: '14:00' }, sun: { closed: true, open: null, close: null } },
    same_day: 'si',
    leads_email: 'pedidos@example.com',
    public_email: 'hola@example.com',
    public_phone: '(555) 010-0199',
    channels: ['call', 'whatsapp', 'sms'],
    responders: [{ channel: 'WhatsApp', person: 'Ana', languages: ['es', 'en'] }],
    response_time: '1h',
    spanish_share: 60,
    client_services: [
      { name: 'Limpieza profunda', name_en: 'Deep cleaning', unit: 'visit', price_from: 180, price_to: 350, includes: 'Cocina, baños y pisos', excludes: 'Ventanas exteriores', priority: true },
      { name: 'Limpieza de fin de obra', name_en: 'Post construction cleaning', unit: 'sqft', price_from: 0.25, price_to: null, includes: null, excludes: null, priority: false },
    ],
    not_offered: 'Limpieza de alfombras con vapor.',
    surcharges: 'Mínimo de $120 por visita.',
    customer_words: 'deep cleaning near me, limpieza de casas',
    faq_top: '¿Traen sus productos?',
    brand_status: 'adjustable',
    brand_color_list: [{ name: 'Coral', hex: '#E8604C' }, { name: 'Azul noche', hex: '#14213D' }, { name: 'Crema', hex: '#FBF6EE' }],
    colors_avoid: 'Morado',
    slogan: 'Tu casa, como nueva',
    slogan_translate: 'si',
    name_no_translate: 'Aurora',
    stock_ok: 'si',
    review_links: [{ platform: 'google', url: 'https://maps.example.com/aurora' }],
    insurance: [{ type: 'general_liability', provider: 'Aseguradora Ejemplo', number: 'GL-000' }],
    guarantees: 'Si algo no quedó bien, volvemos en 48 horas.',
    domain_name: 'aurora-limpiezas.example.com',
    registrar: 'namecheap',
    domain_owner: 'Ana Ejemplo',
    domain_access: 'si',
    gbp_status: 'verified',
    gbp_url: 'https://maps.example.com/aurora',
    gbp_invited: true,
    socials: [{ platform: 'instagram', url: 'https://instagram.example.com/aurora', managed_by: 'Ana' }],
    directories: [{ name: 'yelp', url: 'https://yelp.example.com/aurora' }],
    segments: ['homeowners', 'businesses'],
    map_competitors: [{ name: 'Brillo Total Ejemplo', website: 'brillo.example.com', why: 'Tiene más reseñas.' }],
    references: [{ url: 'https://referencia.example.com', likes: 'Fotos grandes', dislikes: 'Demasiado texto' }],
    goal_type: 'quotes',
    goal_monthly: 30,
    avg_ticket: 220,
    seo_timing_ack: true,
    ads_active: 'no',
    search_terms: 'house cleaning katy\nlimpieza de casas houston',
    approver_name: 'Ana',
    approver_channel: 'whatsapp',
    approver_language: 'es',
    approval_time: 'same_day',
    hours_per_week: '1_3',
    post_launch: [{ task: 'reviews', person: 'Ana' }, { task: 'photos', person: 'Luis' }],
    reports_channel: 'email',
  },
};

const enc = (s) => new TextEncoder().encode(s);
const bytes = (head, n = 64) => { const u = new Uint8Array(n); u.set(head); return u; };
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPG = [0xff, 0xd8, 0xff, 0xe0];
const PDF = [...enc('%PDF-1.4\n')];

let n = 500;
const F = (kind, pathname, content_type, original_name, tags, extra = {}) => ({
  id: String(++n), kind, pathname, content_type, size: 0, original_name, converted_from: null,
  tags, verified: true, created_at: `2026-10-0${(n % 9) + 1}T12:00:00.000Z`, purpose: 'brief', ...extra,
});

export const SAMPLE_FILES = [
  F('logo', 'briefs/d1/logo/logo-aurora-AbC1.svg', 'image/svg+xml', 'Logo Aurora (final).svg', { field: 'logo_files', variant: 'full' }),
  F('logo', 'briefs/d1/logo/logo-blanco-AbC2.png', 'image/png', 'logo_blanco.png', { field: 'logo_files', variant: 'dark_bg' }),
  F('photo', 'briefs/d1/photo/IMG-0755-AbC3.jpg', 'image/jpeg', 'IMG_0755.HEIC', { field: 'photo_files', shot: 'team', neighborhood: 'Katy', month: '2026-09', origin: 'own', google_ok: true }, { converted_from: 'image/heic' }),
  F('photo', 'briefs/d1/photo/antes-cocina-AbC4.jpg', 'image/jpeg', 'antes cocina.jpg', { field: 'photo_files', shot: 'before_after', stage: 'before', pair: 'cocina', origin: 'own', service: 'Limpieza profunda' }, { verified: null }),
  F('photo', 'briefs/d2/photo/idea-AbC5.jpg', 'image/jpeg', 'idea-pinterest.jpg', { field: 'kit_photo_files', shot: 'other', origin: 'inspiration' }, { purpose: 'kit' }),
  F('photo', 'briefs/d1/photo/factura-AbC6.jpg', 'image/jpeg', 'factura.jpg', { field: 'photo_files' }, { verified: false }),
  // Nombre hostil: rutas, puntos y acentos. Debe salir saneado.
  F('doc', 'briefs/d2/doc/precios-AbC7.pdf', 'application/pdf', '../../../etc/Lista de précios 2026.pdf', { field: 'price_list', topic: 'Precios' }, { purpose: 'kit' }),
  F('video', 'briefs/d2/video/obra-AbC8.mp4', 'video/mp4', 'obra.mp4', { field: 'video_files', topic: 'Una limpieza de principio a fin' }, { purpose: 'kit' }),
  F('legal', 'briefs/d2/legal/seguro-AbC9.pdf', 'application/pdf', 'certificado seguro.pdf', { field: 'insurance_docs', doc_type: 'insurance' }, { purpose: 'kit' }),
  // Este falla al leerse (simula un blob que ya no existe): el zip sigue.
  F('photo', 'briefs/d2/photo/perdida-AbD1.jpg', 'image/jpeg', 'perdida.jpg', { field: 'kit_photo_files', shot: 'vehicle', origin: 'own' }, { purpose: 'kit' }),
];

export const FAKE_BYTES = {
  'briefs/d1/logo/logo-aurora-AbC1.svg': enc('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#E8604C"/></svg>'),
  'briefs/d1/logo/logo-blanco-AbC2.png': bytes(PNG, 70),
  'briefs/d1/photo/IMG-0755-AbC3.jpg': bytes(JPG, 3000),
  'briefs/d1/photo/antes-cocina-AbC4.jpg': bytes(JPG, 2000),
  'briefs/d2/photo/idea-AbC5.jpg': bytes(JPG, 1500),
  'briefs/d2/doc/precios-AbC7.pdf': bytes(PDF, 400),
  'briefs/d2/video/obra-AbC8.mp4': bytes([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70], 5000),
  'briefs/d2/legal/seguro-AbC9.pdf': bytes(PDF, 300),
};
for (const f of SAMPLE_FILES) if (FAKE_BYTES[f.pathname]) f.size = FAKE_BYTES[f.pathname].length;

// readAsset de prueba: entrega los bytes en trozos de 1 KB (como un stream).
export async function* fakeStream(u8) {
  for (let i = 0; i < u8.length; i += 1024) yield u8.subarray(i, i + 1024);
}
export async function readFakeAsset(asset) {
  const u8 = FAKE_BYTES[asset.file.pathname];
  if (!u8) throw new Error('ya no está en el almacén');
  return fakeStream(u8);
}
