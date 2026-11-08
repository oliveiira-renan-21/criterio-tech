import { Bot, InlineKeyboard, InputFile } from 'grammy';
import * as path from 'path';
import { DuelVideoPayload } from '../types/duel';
import { curateAndGenerateDuel, generateSingleShotNarration, verifyNarration } from './gemini';
import {
  renderMultiPlatformVideosWithHyperFrames,
} from './hyperframes-renderer';
import {
  buildInstagramDmCarouselPayload,
  publishDuelToGitHubPages,
} from './vitrine-publisher';

// Armazena propostas pendentes em memória / disco temporário (/tmp no Cloud Run)
const pendingDuels = new Map<string, DuelVideoPayload>();

export function createCriterioTelegramBot(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN não configurado.');
  }

  const bot = new Bot(token);

  // Comando manual pelo celular: /novo [categoria opcional]
  bot.command('novo', async (ctx) => {
    const categoryHint = ctx.match?.trim() || undefined;
    await ctx.reply('🔍 Pesquisando ofertas reais e estruturando novo duelo no Gemini...');
    const nextNumber = Math.floor(Date.now() / 1000) % 1000;
    const duel = await curateAndGenerateDuel(nextNumber, categoryHint);
    pendingDuels.set(duel.duelCode, duel);
    await sendProposalMessage(ctx.chat.id, bot, duel);
  });

  // Clique no botão [✅ Aprovar e Renderizar]
  bot.callbackQuery(/^approve:(.+)$/, async (ctx) => {
    const duelCode = ctx.match[1];
    const payload = pendingDuels.get(duelCode);

    if (!payload) {
      await ctx.answerCallbackQuery({
        text: 'Proposta expirada. Envie /novo para gerar uma atualizada.',
        show_alert: true,
      });
      return;
    }

    await ctx.answerCallbackQuery({ text: '🎬 Iniciando produção nos servidores do Google...' });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });

    const statusMsg = await ctx.reply(
      `⚙️ *Produzindo Duelo ${payload.duelCode}*\n1️⃣ Gerando locução única no Gemini HD...`,
      { parse_mode: 'Markdown' }
    );

    try {
      const workDir = path.join('/tmp', `criterio-${duelCode.replace('#', '')}`);

      // Passo 1: Locução única sem variação de voz (já gera os 3 cortes de áudio: Instagram, TikTok/Shorts e ML/Shopee)
      const narration = await generateSingleShotNarration(payload, workDir);
      const { audioFilePath, updatedPayload } = narration;

      // Passo 1b: Confere a pronúncia transcrevendo o áudio gerado
      const qa = await verifyNarration(audioFilePath, updatedPayload);
      if (qa.mismatches.length > 0) {
        await ctx.reply(
          `⚠️ *Possível erro de pronúncia na locução:*\nPalavras não encontradas no áudio: ${qa.mismatches.join(', ')}\n\n_Transcrição:_ ${qa.transcript.slice(0, 900)}`,
          { parse_mode: 'Markdown' }
        );
      }

      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        `⚙️ *Produzindo Duelo ${payload.duelCode}*\n✅ Locução única e auditoria concluídas!\n2️⃣ Renderizando os 3 vídeos 60 FPS (Instagram, TikTok/Shorts e ML/Shopee)...`,
        { parse_mode: 'Markdown' }
      );

      // Passo 2: Renderização dos 3 vídeos 60 FPS no HyperFrames
      const videos = await renderMultiPlatformVideosWithHyperFrames(
        updatedPayload,
        {
          instagramWavPath: narration.instagramWavPath,
          tiktokShortsWavPath: narration.tiktokShortsWavPath,
          mlShopeeWavPath: narration.mlShopeeWavPath,
        },
        workDir
      );

      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        `⚙️ *Produzindo Duelo ${payload.duelCode}*\n✅ 3 vídeos renderizados!\n3️⃣ Atualizando vitrine em zenostech.com.br/criteriotech...`,
        { parse_mode: 'Markdown' }
      );

      // Passo 3: Publica na Vitrine Oficial + Gera JSON do Carrossel DM
      const vitrineUrl = await publishDuelToGitHubPages(updatedPayload);
      const dmCarousel = buildInstagramDmCarouselPayload(updatedPayload);

      // Passo 4: Entrega os 3 vídeos específicos por rede no Telegram
      const savings =
        updatedPayload.technicalWinner.priceBRL - updatedPayload.rationalChoice.priceBRL;

      await ctx.replyWithVideo(new InputFile(videos.instagramMp4Path), {
        caption: [
          `📱 *1/3 — VERSÃO INSTAGRAM & FACEBOOK REELS (${updatedPayload.duelCode})*`,
          `_(Final com chamada para comentar ${updatedPayload.commentTriggerKeyword} e receber no Direct)_`,
          ``,
          `📝 *Legenda Instagram:*`,
          `${updatedPayload.technicalWinner.name} vs ${updatedPayload.rationalChoice.name}: vale pagar mais ou economizar R$ ${savings}? 🔥`,
          `Comente *${updatedPayload.commentTriggerKeyword}* aqui embaixo que eu te envio os links com o menor preço no Direct! 👇🔗`,
          ``,
          `💬 *Gatilho Carrossel DM:* \`${dmCarousel.triggerKeyword}\``,
        ].join('\n'),
        parse_mode: 'Markdown',
      });

      await ctx.replyWithVideo(new InputFile(videos.tiktokShortsMp4Path), {
        caption: [
          `🎵 *2/3 — VERSÃO TIKTOK & YOUTUBE SHORTS (${updatedPayload.duelCode})*`,
          `_(Final com chamada para o Link do Perfil #${updatedPayload.duelCode.replace('#', '')} + pergunta de engajamento)_`,
          ``,
          `📝 *Legenda TikTok / Shorts:*`,
          `${updatedPayload.technicalWinner.name} vs ${updatedPayload.rationalChoice.name}: qual vale mais o seu dinheiro hoje? 🔥`,
          `🔗 Os links com o menor preço estão no *link do perfil* (Busque por *Duelo ${updatedPayload.duelCode}*)!`,
          `👇 Comenta aqui: qual dos dois você escolheria?`,
          ``,
          `🌐 *Vitrine Oficial:* ${vitrineUrl}`,
        ].join('\n'),
        parse_mode: 'Markdown',
      });

      await ctx.replyWithVideo(new InputFile(videos.mlShopeeMp4Path), {
        caption: [
          `🛒 *3/3 — VERSÃO MERCADO LIVRE CLIPS & SHOPEE VIDEO (${updatedPayload.duelCode})*`,
          `_(Corte limpo terminando no Veredito, pronto para anexar a tag de produto na tela)_`,
        ].join('\n'),
        parse_mode: 'Markdown',
      });
    } catch (err: any) {
      await ctx.reply(`❌ Erro durante a produção: ${err.message}`);
    }
  });

  // Clique no botão [🔄 Gerar Outro Duelo]
  bot.callbackQuery(/^regenerate:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery({ text: '🔄 Buscando outro duelo...' });
    const nextNumber = Math.floor(Date.now() / 1000) % 1000;
    const newDuel = await curateAndGenerateDuel(nextNumber);
    pendingDuels.set(newDuel.duelCode, newDuel);
    await sendProposalMessage(ctx.chat!.id, bot, newDuel);
  });

  return bot;
}

export async function sendProposalMessage(
  chatId: number | string,
  bot: Bot,
  duel: DuelVideoPayload
) {
  pendingDuels.set(duel.duelCode, duel);
  const savings = duel.technicalWinner.priceBRL - duel.rationalChoice.priceBRL;

  const text = [
    `⚡ *PROPOSTA DE DUELO ${duel.duelCode}*`,
    `📂 *Categoria:* ${duel.category}`,
    ``,
    `🏆 *Vencedor Técnico:* ${duel.technicalWinner.name}`,
    `💰 Preço: *R$ ${duel.technicalWinner.priceBRL}*`,
    `• ${duel.technicalWinner.highlights.map((h) => `${h.label}: ${h.value}`).join('\n• ')}`,
    ``,
    `⚡ *Escolha Racional:* ${duel.rationalChoice.name}`,
    `💰 Preço: *R$ ${duel.rationalChoice.priceBRL}* _(Economia de R$ ${savings})_`,
    `• ${duel.rationalChoice.highlights.map((h) => `${h.label}: ${h.value}`).join('\n• ')}`,
    ``,
    `🎙️ *Roteiro (Locução Única Gemini HD):*`,
    ...duel.scenes.map((s, i) => `${i + 1}. _"${s.narrationText}"_`),
    ``,
    `💬 *Gatilho de Comentário (DM):* \`${duel.commentTriggerKeyword}\``,
  ].join('\n');

  const keyboard = new InlineKeyboard()
    .text('✅ Aprovar e Renderizar MP4', `approve:${duel.duelCode}`)
    .row()
    .text('🔄 Gerar Outra Proposta', `regenerate:${duel.duelCode}`);

  await bot.api.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}
