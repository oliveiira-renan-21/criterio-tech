import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { DuelVideoPayload } from '../types/duel';

const execFileAsync = promisify(execFile);

export interface MultiPlatformVideoOutputs {
  instagramMp4Path: string;
  tiktokShortsMp4Path: string;
  mlShopeeMp4Path: string;
}

/**
 * Renderiza o vídeo base em 60 FPS no HyperFrames e gera automaticamente os 3 cortes por rede:
 * 1) Instagram/Facebook Reels (com final Direct DM)
 * 2) TikTok / YouTube Shorts (com final Link no Perfil + pergunta de engajamento)
 * 3) Mercado Livre Clips / Shopee Video (corte limpo no fim do Veredito sem link externo)
 */
export async function renderMultiPlatformVideosWithHyperFrames(
  payload: DuelVideoPayload,
  wavs: {
    instagramWavPath: string;
    tiktokShortsWavPath: string;
    mlShopeeWavPath: string;
  },
  outputDir: string
): Promise<MultiPlatformVideoOutputs> {
  const slug = payload.duelCode.replace('#', '');
  const instagramMp4Path = await renderDuelVideoWithHyperFrames(
    payload,
    wavs.instagramWavPath,
    outputDir,
    `duelo-${slug}-instagram.mp4`
  );
  const tiktokShortsMp4Path = await renderDuelVideoWithHyperFrames(
    payload,
    wavs.tiktokShortsWavPath,
    outputDir,
    `duelo-${slug}-tiktok-shorts.mp4`
  );
  const mlShopeeMp4Path = await renderDuelVideoWithHyperFrames(
    payload,
    wavs.mlShopeeWavPath,
    outputDir,
    `duelo-${slug}-ml-shopee.mp4`
  );

  return {
    instagramMp4Path,
    tiktokShortsMp4Path,
    mlShopeeMp4Path,
  };
}

/**
 * Etapa 3: Renderizador HyperFrames (HTML + CSS + GSAP -> MP4 60 FPS)
 * Gera o arquivo de composição HyperFrames injetando o JSON do duelo e renderiza o MP4 final.
 */
export async function renderDuelVideoWithHyperFrames(
  payload: DuelVideoPayload,
  audioFilePath: string,
  outputDir: string,
  customOutputFileName?: string
): Promise<string> {
  fs.mkdirSync(outputDir, { recursive: true });

  const slug = payload.duelCode.replace('#', '');
  const compositionHtmlPath = path.join(outputDir, `composition-${slug}.html`);
  const silentVideoPath = path.join(outputDir, `video-silent-${slug}.mp4`);
  const finalVideoPath = path.join(
    outputDir,
    customOutputFileName || `criterio-tech-duelo-${slug}.mp4`
  );

  const lastScene = payload.scenes[payload.scenes.length - 1];
  const totalDuration = lastScene ? lastScene.endSec : 36;

  // 1. Gera o HTML determinístico do HyperFrames com GSAP Clean Pro
  const htmlContent = buildHyperFramesHtmlDocument(payload, totalDuration);
  fs.writeFileSync(compositionHtmlPath, htmlContent, 'utf-8');

  // 2. Aciona o CLI do HyperFrames para capturar em 60 FPS determinísticos
  await execFileAsync('npx', [
    'hyperframes',
    'render',
    '--input',
    compositionHtmlPath,
    '--output',
    silentVideoPath,
    '--fps',
    '60',
    '--width',
    '1080',
    '--height',
    '1920',
    '--duration',
    String(totalDuration),
  ]);

  // 3. Combina o vídeo 60 FPS com a locução única do Gemini (.wav) via FFmpeg
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    silentVideoPath,
    '-i',
    audioFilePath,
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    finalVideoPath,
  ]);

  return finalVideoPath;
}

/**
 * Constrói o documento HTML + GSAP compatível com heygen-com/hyperframes
 */
export function buildHyperFramesHtmlDocument(
  payload: DuelVideoPayload,
  totalDuration: number
): string {
  const serializedPayload = JSON.stringify(payload);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Critério Tech ${payload.duelCode}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      background: radial-gradient(circle at 50% 18%, #27272a 0%, #09090b 68%);
      color: #ffffff;
    }
    .apple-bento {
      background: linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%);
      backdrop-filter: blur(28px);
      border: 2px solid rgba(255, 255, 255, 0.14);
      border-radius: 44px;
    }
    .apple-pill {
      background: rgba(24, 24, 27, 0.82);
      border: 2px solid rgba(255, 255, 255, 0.14);
    }
  </style>
</head>
<body>
  <div id="hyperframes-root" data-width="1080" data-height="1920" data-fps="60" data-duration="${totalDuration}" class="w-[1080px] h-[1920px] relative flex flex-col justify-between p-12">
    <div class="apple-pill rounded-full px-8 py-4 flex items-center justify-between">
      <span class="text-3xl font-black tracking-tight">CRITÉRIO TECH</span>
      <span class="text-3xl font-black text-emerald-400">Duelo ${payload.duelCode}</span>
    </div>

    <div id="stage" class="flex-1 flex flex-col justify-center my-8"></div>

    <div class="apple-pill rounded-3xl p-7 mb-6">
      <p id="caption" class="text-4xl font-black text-center leading-snug"></p>
    </div>

    <div class="apple-bento p-7 flex items-center justify-between">
      <div>
        <div class="text-2xl text-zinc-400 font-semibold">Vitrine Oficial:</div>
        <div class="text-3xl font-black text-white">${payload.showcaseUrl}</div>
      </div>
      <div class="bg-emerald-400 text-zinc-950 font-black text-3xl px-7 py-4 rounded-2xl">
        COMENTE: ${payload.commentTriggerKeyword}
      </div>
    </div>
  </div>

  <script>
    const payload = ${serializedPayload};
    const stage = document.getElementById('stage');
    const caption = document.getElementById('caption');

    // Função determinística chamada quadro a quadro pelo HyperFrames
    window.renderFrameAtTime = function(sec) {
      const scene = payload.scenes.find(s => sec >= s.startSec && sec < s.endSec) || payload.scenes[payload.scenes.length - 1];
      const progress = Math.min(1, Math.max(0, (sec - scene.startSec) / (scene.endSec - scene.startSec)));
      const words = scene.narrationText.split(' ');
      const activeIdx = Math.floor(progress * words.length);
      const startChunk = Math.floor(activeIdx / 5) * 5;
      const chunk = words.slice(startChunk, startChunk + 5);

      caption.innerHTML = chunk.map((w, i) => {
        const isCurrent = (startChunk + i) === activeIdx;
        return isCurrent
          ? '<span style="background:#ffffff;color:#09090b;padding:4px 14px;border-radius:14px;">' + w + '</span>'
          : '<span>' + w + '</span>';
      }).join(' ');
    };
  </script>
</body>
</html>`;
}
