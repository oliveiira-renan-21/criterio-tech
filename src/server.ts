import * as http from 'http';
import { URL } from 'url';
import { webhookCallback } from 'grammy';
import { curateAndGenerateDuel } from './services/gemini';
import { createCriterioTelegramBot, sendProposalMessage } from './services/telegram-bot';
import { buildManyChatDynamicGalleryResponse } from './services/vitrine-publisher';
import {
  verifyMetaWebhook,
  processMetaInstagramWebhook,
} from './services/instagram-meta';

const PORT = Number(process.env.PORT || 8080);
const bot = createCriterioTelegramBot();
const handleTelegramWebhook = webhookCallback(bot, 'http');

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;

    // 1. Healthcheck do Google Cloud Run
    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          engine: 'CriterioTech-HyperFrames-2.0',
          amazonTag: process.env.AMAZON_PARTNER_TAG || 'criteriotech-20',
        })
      );
      return;
    }

    // 2. Gatilho Diário do Google Cloud Scheduler (Mesmo com seu PC desligado!)
    if (req.method === 'POST' && pathname === '/cron/daily-duel') {
      const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (!adminChatId) {
        res.writeHead(400);
        res.end('TELEGRAM_ADMIN_CHAT_ID ausente.');
        return;
      }

      const duelNum = Math.floor(Date.now() / 86400000) % 1000;
      const duel = await curateAndGenerateDuel(duelNum);
      await sendProposalMessage(adminChatId, bot, duel);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ triggered: true, duelCode: duel.duelCode }));
      return;
    }

    // 3. Webhook do Telegram (Quando você clica em Aprovar pelo celular)
    if (req.method === 'POST' && pathname === '/webhook/telegram') {
      await handleTelegramWebhook(req, res);
      return;
    }

    // 4. Webhook Oficial da Meta (Instagram Direct - 100% Gratuito sem ManyChat!)
    // 4A: Verificação de URL do Meta for Developers (GET)
    if (req.method === 'GET' && pathname === '/webhook/instagram') {
      const mode = parsedUrl.searchParams.get('hub.mode');
      const token = parsedUrl.searchParams.get('hub.verify_token');
      const challenge = parsedUrl.searchParams.get('hub.challenge');

      const verified = verifyMetaWebhook(mode, token, challenge);
      if (verified) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(verified);
      } else {
        res.writeHead(403);
        res.end('Forbidden');
      }
      return;
    }

    // 4B: Recepção de Comentários nos Reels e Mensagens no Direct (POST)
    if (req.method === 'POST' && pathname === '/webhook/instagram') {
      const rawBody = await readRequestBody(req);
      try {
        const json = JSON.parse(rawBody);
        await processMetaInstagramWebhook(json);
      } catch (err) {
        console.error('[Meta Webhook Error]', err);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'EVENT_RECEIVED' }));
      return;
    }

    // 4. Endpoint Dinâmico Universal para ManyChat (Você configura 1 única vez e nunca mais mexe!)
    // Ex: GET ou POST /api/manychat-duel?comment=DUELO42
    if (pathname === '/api/manychat-duel') {
      let commentText = parsedUrl.searchParams.get('comment') || 'DUELO42';
      if (req.method === 'POST') {
        const rawBody = await readRequestBody(req);
        try {
          const json = JSON.parse(rawBody);
          commentText = json.comment || json.last_input_text || commentText;
        } catch {}
      }
      const galleryPayload = await buildManyChatDynamicGalleryResponse(commentText);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(galleryPayload));
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  } catch (err: any) {
    console.error('[Server Error]', err);
    res.writeHead(500);
    res.end(err.message || 'Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Critério Tech Engine rodando na porta ${PORT}`);
});
