// /api/canales/instagram — aviso de mensajes de Instagram (Meta). Marcy contesta.
// Toda la lógica en lib/channel-runtime.mjs y lib/channels.mjs.
import { metaWebhook } from '../../lib/channel-runtime.mjs';

export const config = { maxDuration: 60, api: { bodyParser: false } };
export default metaWebhook('instagram');
