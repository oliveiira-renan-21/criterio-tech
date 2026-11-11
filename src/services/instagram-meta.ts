import { buildInstagramDmCarouselPayload } from './vitrine-publisher';

/**
 * Serviço de Automação Oficial Meta Graph API (100% Gratuito - Substitui o ManyChat)
 * Documentação Oficial da Meta: https://developers.facebook.com/docs/messenger-platform/instagram/
 */

export const META_VERIFY_TOKEN =
  process.env.META_VERIFY_TOKEN || 'criterio_tech_meta_verify_2026';

/**
 * 1. Validação do Webhook pelo Meta for Developers (GET /webhook/instagram)
 */
export function verifyMetaWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null
): string | null {
  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    console.log('[Meta Webhook] Verificação de token bem-sucedida!');
    return challenge;
  }
  return null;
}

/**
 * 2. Processador de Eventos de Comentário e Mensagens (POST /webhook/instagram)
 */
export async function processMetaInstagramWebhook(body: any): Promise<void> {
  const pageAccessToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;

  if (!pageAccessToken) {
    console.warn(
      '[Meta Webhook] INSTAGRAM_PAGE_ACCESS_TOKEN não configurado no .env. Evento ignorado.'
    );
    return;
  }

  if (body.object !== 'instagram' && body.object !== 'page') {
    return;
  }

  for (const entry of body.entry || []) {
    // Caso A: Comentário em Reel / Publicação (changes)
    for (const change of entry.changes || []) {
      if (change.field === 'comments') {
        const comment = change.value;
        const text = (comment.text || '').toUpperCase();

        if (text.includes('DUELO')) {
          await handleCommentTrigger(comment, pageAccessToken);
        }
      }
    }

    // Caso B: Mensagem Direta recebida no Direct (messaging)
    for (const msgEvent of entry.messaging || []) {
      const text = (msgEvent.message?.text || '').toUpperCase();
      if (text.includes('DUELO') && msgEvent.sender?.id) {
        await handleDirectMessageTrigger(msgEvent, pageAccessToken);
      }
    }
  }
}

/**
 * Responde um comentário no Reels enviando o Carrossel Oficial via Direct (Private Reply)
 */
async function handleCommentTrigger(comment: any, token: string) {
  const commentId = comment.id;
  const commentText = comment.text || 'DUELO42';
  const numMatch = commentText.match(/(\d+)/);
  const duelNum = numMatch ? numMatch[1].padStart(3, '0') : '042';
  const targetCode = `#${duelNum}`;

  console.log(`[Meta Webhook] Comentário recebido: "${commentText}" (ID: ${commentId})`);

  // 1. Busca dados do duelo
  const duel = await fetchDuelData(targetCode);
  if (!duel) return;

  const carouselPayload = buildInstagramDmCarouselPayload(duel);

  // 2. Envia mensagem privada no Direct referenciando o comentário (Private Reply Oficial da Meta)
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${token}`;

  // Envia primeiro o texto de boas-vindas
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: { text: carouselPayload.welcomeText },
    }),
  });

  // Envia o Carrossel Nativo com os 2 produtos, fotos e botões
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      message: {
        attachment: carouselPayload.attachment,
      },
    }),
  });

  if (res.ok) {
    console.log(`[Meta Webhook] Carrossel enviado com sucesso no Direct para o comentário ${commentId}!`);
  } else {
    const errText = await res.text();
    console.error(`[Meta Webhook] Erro ao enviar mensagem privada:`, errText);
  }

  // 3. Opcional: Curte o comentário e responde publicamente para dar prova social
  try {
    await fetch(`https://graph.facebook.com/v21.0/${commentId}/replies?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Acabei de te enviar os links com o menor preço verificado no Direct! Dá uma olhada lá 🚀📩',
      }),
    });
  } catch {}
}

/**
 * Responde uma mensagem direta (DM) iniciada pelo usuário
 */
async function handleDirectMessageTrigger(msgEvent: any, token: string) {
  const senderId = msgEvent.sender.id;
  const text = msgEvent.message.text || 'DUELO42';
  const numMatch = text.match(/(\d+)/);
  const duelNum = numMatch ? numMatch[1].padStart(3, '0') : '042';
  const targetCode = `#${duelNum}`;

  const duel = await fetchDuelData(targetCode);
  if (!duel) return;

  const carouselPayload = buildInstagramDmCarouselPayload(duel);
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${token}`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: senderId },
      message: { attachment: carouselPayload.attachment },
    }),
  });
}

async function fetchDuelData(targetCode: string): Promise<any | null> {
  try {
    const res = await fetch('https://oliveiira-renan-21.github.io/criterio-tech/duels.json');
    if (res.ok) {
      const duels: any[] = await res.json();
      return duels.find((d) => d.duelCode === targetCode) || duels[0];
    }
  } catch {}
  return null;
}
