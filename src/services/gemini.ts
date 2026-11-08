import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { DuelVideoPayload } from '../types/duel';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Etapa 1: Curadoria Baseada em Dados Reais (Google Search Grounding) + Roteiro JSON
 * Pesquisa preços reais no Brasil (Amazon BR e Mercado Livre) e monta o duelo técnico.
 */
export async function curateAndGenerateDuel(
  duelNumber: number,
  categoryHint?: string
): Promise<DuelVideoPayload> {
  const duelCode = `#${String(duelNumber).padStart(3, '0')}`;
  const triggerKeyword = `DUELO${String(duelNumber).padStart(2, '0')}`;

  const prompt = `
Você é o engenheiro-chefe e estrategista de conversão do canal "Critério Tech" (zenostech.com.br/criteriotech).
Sua missão é criar o Duelo Técnico ${duelCode} com foco em ALTA CONVERSÃO de afiliados no Brasil (Amazon Brasil e Mercado Livre).

${categoryHint ? `Categoria solicitada: ${categoryHint}` : 'Escolha uma categoria de tecnologia com altíssima procura hoje no Brasil (ex: Fones Bluetooth ANC, Mouses Gamer Sem Fio, Teclados Mecânicos, Monitores Gamer, Smartwatches ou Notebooks).'}

REGRAS OBRIGATÓRIAS:
1. Use a busca do Google para verificar produtos REAIS em estoque no Brasil e seus preços médios reais em Reais (R$).
2. Estruture o duelo entre:
   - TECHNICAL_WINNER: O modelo referência absoluta de qualidade/performance na categoria.
   - RATIONAL_CHOICE: O modelo campeão de custo-benefício que entrega 85% a 95% da experiência custando significativamente menos.
3. SIMETRIA DE TÓPICOS (CRÍTICO PARA O SITE):
   - O array "highlights" de AMBOS os produtos DEVE ter exatamente 3 itens e usar EXATAMENTE os mesmos "label" na mesma ordem nos dois produtos (ex: ["Sensor", "Bateria / Modo", "Peso Físico"]).
   - O campo "tagline" deve ter entre 90 e 120 caracteres para ocupar exatamente 2 linhas no layout Clean Pro.
4. ROTEIRO COMPLETO DE 60 A 68 SEGUNDOS (IDEAL PARA MONETIZAÇÃO E RETENÇÃO EM REELS / TIKTOK / SHORTS):
   - O roteiro total deve ter entre 150 e 175 palavras (duração falada de ~62 a 68 segundos), com ritmo natural, claro e persuasivo.
   - Cenas:
     1. "hook" (0 a 10s): Contextualiza a dúvida de compra e o choque de preço entre os dois modelos.
     2. "winner" (10 a 24s): Aprofunda nos diferenciais de engenharia, bateria e garantia do Vencedor Técnico.
     3. "rational" (24 a 38s): Mostra como a Escolha Racional entrega quase a mesma performance custando muito menos.
     4. "benchmarks" (38 a 53s): Explica com honestidade onde está a diferença real na bancada (pontos fortes e concessões sinceras).
     5. "verdict" (53 a 65s): Veredito claro para os dois perfis de bolso + chamada para comentar "${triggerKeyword}".

5. TEXTO DA LEGENDA vs TEXTO FALADO (OBRIGATÓRIO EM CADA CENA):
   - "narrationText": texto da legenda com a grafia correta (ex: "sensor PAW3395", "R$ 889", "49g").
   - "spokenText": o MESMO conteúdo, palavra por palavra, mas com todo número, preço, sigla e código de modelo escrito por extenso
     do jeito que um brasileiro fala (ex: "sensor PAW três três nove cinco", "oitocentos e oitenta e nove reais", "quarenta e nove gramas",
     "X três Pro", "DUELO quarenta e dois"). Nunca deixe dígitos no spokenText.

6. FINAIS ESPECÍFICOS POR REDE ("platformEndings"):
   - Na cena 5 ("verdict"), escreva APENAS o veredito técnico comparativo (sem chamada de link externo, para servir ao corte do Mercado Livre Clips / Shopee Video).
   - Preencha o objeto "platformEndings" com os 2 finais de chamada para ação:
     * "instagram": chamada focada em comentar "${triggerKeyword}" para receber os links no Direct.
     * "tiktokShorts": chamada focada em acessar o link no perfil buscando pelo Duelo ${duelCode} + pergunta rápida para gerar comentários.

Retorne APENAS um JSON válido seguindo exatamente a interface DuelVideoPayload.
`;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_TEXT_MODEL || 'gemini-3.8-flash',
    contents: prompt,
    config: {
      // Google Search Grounding ativado para dados factuais de ficha técnica e preço
      tools: [{ googleSearch: {} }],
      temperature: 0.4,
    },
  });

  const rawText = response.text || '';
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('O Gemini não retornou um JSON válido na curadoria.');
  }

  const parsed: DuelVideoPayload = JSON.parse(jsonMatch[0]);
  parsed.duelCode = duelCode;
  parsed.commentTriggerKeyword = triggerKeyword;
  parsed.showcaseUrl = 'zenostech.com.br/criteriotech';
  parsed.fps = 60;
  parsed.width = 1080;
  parsed.height = 1920;

  return parsed;
}

/**
 * Etapa 2: Locução Única Consistente (Single-Shot Audio no Gemini)
 * Evita mudança de timbre/entonação gerando o roteiro inteiro em uma única chamada de voz
 * e recalcula os tempos de cada cena proporcionalmente às palavras faladas.
 */
export interface MultiPlatformNarrationResult {
  audioFilePath: string; // Master WAV
  instagramWavPath: string;
  tiktokShortsWavPath: string;
  mlShopeeWavPath: string;
  updatedPayload: DuelVideoPayload;
}

export async function generateSingleShotNarration(
  payload: DuelVideoPayload,
  outputDir: string
): Promise<MultiPlatformNarrationResult> {
  fs.mkdirSync(outputDir, { recursive: true });

  // Junta as 5 cenas em um único bloco de texto puro (sem instruções de prompt no meio para o modelo TTS não ler instruções em voz alta!)
  // Grava o Corpo Base + Final Instagram + Final TikTok/Shorts em UMA ÚNICA CHAMADA de voz!
  // Isso garante 100% o mesmo timbre/entonação nos 3 vídeos (Instagram, TikTok/Shorts e ML/Shopee).
  const baseSpoken = payload.scenes
    .map((s) => (s.spokenText || s.narrationText).trim())
    .join('\n\n');

  const igEndingSpoken =
    payload.platformEndings?.instagram.spokenText ||
    `Comente ${payload.commentTriggerKeyword} aqui embaixo que eu te envio os links com o menor preço no Direct!`;

  const tkEndingSpoken =
    payload.platformEndings?.tiktokShorts.spokenText ||
    `Os links com o menor preço estão no link do perfil, é só buscar pelo Duelo ${payload.duelCode}! E comenta aqui: qual dos dois você escolheria?`;

  const fullScript = `${baseSpoken}\n\n${igEndingSpoken}\n\n${tkEndingSpoken}`;

  const voiceName = process.env.GEMINI_VOICE_NAME || 'Orus';

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_AUDIO_MODEL || 'gemini-3.8-flash-tts',
    contents: fullScript,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
      },
    },
  });

  const inlinePart = response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData && p.inlineData.data
  );

  if (!inlinePart?.inlineData?.data) {
    throw new Error('A API do Gemini não retornou os bytes de áudio.');
  }

  const audioBuffer = Buffer.from(inlinePart.inlineData.data, 'base64');
  const fileName = `duelo-${payload.duelCode.replace('#', '')}.wav`;
  const audioFilePath = path.join(outputDir, fileName);

  // Se vier em PCM linear 24kHz 16-bit mono, adiciona o cabeçalho RIFF WAV
  const finalWavBuffer = isRiffWav(audioBuffer)
    ? audioBuffer
    : wrapPcmInWavHeader(audioBuffer, 24000, 1, 16);

  fs.writeFileSync(audioFilePath, finalWavBuffer);

  // Calcula a duração real exata do arquivo WAV (em segundos)
  const totalDurationSec = getWavDurationSeconds(finalWavBuffer);

  // Detecta as pausas acústicas reais na onda PCM 24kHz do arquivo WAV para sincronia milimétrica
  const {
    instagramWavPath,
    tiktokShortsWavPath,
    mlShopeeWavPath,
    baseDurationSec,
  } = sliceMultiPlatformWavsFromMaster(finalWavBuffer, outputDir, payload.duelCode);

  const updatedScenes = alignScenesByAcousticSilences(
    finalWavBuffer,
    payload.scenes,
    baseDurationSec
  );

  return {
    audioFilePath,
    instagramWavPath,
    tiktokShortsWavPath,
    mlShopeeWavPath,
    updatedPayload: {
      ...payload,
      audioUrl: instagramWavPath,
      scenes: updatedScenes,
    },
  };
}

/**
 * Corta o WAV único (Corpo Base + Final Instagram + Final TikTok/Shorts) nas 2 últimas pausas longas
 * gerando os 3 arquivos de áudio com 100% a mesma voz sem segunda chamada de API.
 */
function sliceMultiPlatformWavsFromMaster(
  masterWav: Buffer,
  outputDir: string,
  duelCode: string
): {
  instagramWavPath: string;
  tiktokShortsWavPath: string;
  mlShopeeWavPath: string;
  baseDurationSec: number;
} {
  const slug = duelCode.replace('#', '');
  const sampleRate = masterWav.readUInt32LE(24) || 24000;
  const byteRate = masterWav.readUInt32LE(28) || sampleRate * 2;
  const pcmData = masterWav.subarray(44);
  const totalSec = pcmData.length / byteRate;

  // Encontra as pausas longas (>= 0.35s) nos últimos 20 segundos do áudio mestre
  const windowSamples = Math.floor(sampleRate * 0.05);
  const numWindows = Math.floor(pcmData.length / 2 / windowSamples);
  const pauses: number[] = [];
  let inSil = false;
  let silStart = 0;

  for (let w = 0; w < numWindows; w++) {
    let sumSq = 0;
    const baseIdx = w * windowSamples * 2;
    for (let i = 0; i < windowSamples; i += 4) {
      const s = pcmData.readInt16LE(baseIdx + i * 2);
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / (windowSamples / 4));
    const sec = w * 0.05;
    if (rms < 180) {
      if (!inSil) {
        inSil = true;
        silStart = sec;
      }
    } else if (inSil) {
      if (sec - silStart >= 0.35 && silStart > totalSec * 0.65) {
        pauses.push((silStart + sec) / 2);
      }
      inSil = false;
    }
  }

  // Pontos de corte: fim do Veredito Base (cut1) e fim do Final Instagram / início do Final TikTok (cut2)
  const cut2Sec = pauses.length >= 1 ? pauses[pauses.length - 1] : totalSec * 0.88;
  const cut1Sec = pauses.length >= 2 ? pauses[pauses.length - 2] : totalSec * 0.76;

  const toAlignedByteOffset = (sec: number) => {
    const raw = Math.min(pcmData.length, Math.max(0, Math.floor(sec * byteRate)));
    return raw - (raw % 2); // Alinha em múltiplo de 2 bytes (16-bit mono)
  };

  const cut1Byte = toAlignedByteOffset(cut1Sec);
  const cut2Byte = toAlignedByteOffset(cut2Sec);

  const pcmBase = pcmData.subarray(0, cut1Byte);
  const pcmIgEnding = pcmData.subarray(cut1Byte, cut2Byte);
  const pcmTkEnding = pcmData.subarray(cut2Byte);

  const mlShopeeWavPath = path.join(outputDir, `duelo-${slug}-ml-shopee.wav`);
  const instagramWavPath = path.join(outputDir, `duelo-${slug}-instagram.wav`);
  const tiktokShortsWavPath = path.join(outputDir, `duelo-${slug}-tiktok-shorts.wav`);

  fs.writeFileSync(mlShopeeWavPath, wrapPcmInWavHeader(pcmBase, sampleRate, 1, 16));
  fs.writeFileSync(
    instagramWavPath,
    wrapPcmInWavHeader(Buffer.concat([pcmBase, pcmIgEnding]), sampleRate, 1, 16)
  );
  fs.writeFileSync(
    tiktokShortsWavPath,
    wrapPcmInWavHeader(Buffer.concat([pcmBase, pcmTkEnding]), sampleRate, 1, 16)
  );

  return {
    instagramWavPath,
    tiktokShortsWavPath,
    mlShopeeWavPath,
    baseDurationSec: Number((cut2Byte / byteRate).toFixed(2)),
  };
}

/**
 * Escaneia a onda sonora PCM de 16 bits (janelas de 50ms) para encontrar os intervalos de silêncio
 * reais da fala e travar cada transição de cena exatamente na pausa de respiração do locutor.
 */
function alignScenesByAcousticSilences(
  wavBuffer: Buffer,
  scenes: DuelVideoPayload['scenes'],
  totalDurationSec: number
): DuelVideoPayload['scenes'] {
  const sampleRate = wavBuffer.readUInt32LE(24) || 24000;
  const windowSamples = Math.floor(sampleRate * 0.05); // 50ms
  const dataOffset = 44;
  const totalSamples = Math.floor((wavBuffer.length - dataOffset) / 2);
  const numWindows = Math.floor(totalSamples / windowSamples);

  const silenceMidpoints: number[] = [];
  let inSilence = false;
  let silenceStartSec = 0;

  for (let w = 0; w < numWindows; w++) {
    let sumSq = 0;
    const baseIdx = dataOffset + w * windowSamples * 2;
    for (let i = 0; i < windowSamples; i += 4) {
      const sample = wavBuffer.readInt16LE(baseIdx + i * 2);
      sumSq += sample * sample;
    }
    const rms = Math.sqrt(sumSq / (windowSamples / 4));
    const sec = Number((w * 0.05).toFixed(2));

    if (rms < 180) {
      if (!inSilence) {
        inSilence = true;
        silenceStartSec = sec;
      }
    } else if (inSilence) {
      const dur = sec - silenceStartSec;
      if (dur >= 0.28 && silenceStartSec > 1.0) {
        silenceMidpoints.push(Number(((silenceStartSec + sec) / 2).toFixed(2)));
      }
      inSilence = false;
    }
  }

  // Associa o final de cada cena à pausa acústica real mais próxima da proporção fonética
  const totalChars = scenes.reduce((acc, s) => acc + s.narrationText.length, 0);
  let cumulativeWeight = 0;
  let cursorSec = 0;

  return scenes.map((scene, index) => {
    cumulativeWeight += scene.narrationText.length / totalChars;
    const idealEndSec = totalDurationSec * cumulativeWeight;

    let snappedEndSec = Number(idealEndSec.toFixed(2));
    if (index === scenes.length - 1) {
      snappedEndSec = totalDurationSec;
    } else if (silenceMidpoints.length > 0) {
      const closestPause = silenceMidpoints.reduce((prev, curr) =>
        Math.abs(curr - idealEndSec) < Math.abs(prev - idealEndSec) ? curr : prev
      );
      if (Math.abs(closestPause - idealEndSec) < 4.5) {
        snappedEndSec = closestPause;
      }
    }

    const startSec = cursorSec;
    cursorSec = snappedEndSec;

    return {
      ...scene,
      startSec,
      endSec: snappedEndSec,
    };
  });
}

function isRiffWav(buf: Buffer): boolean {
  return buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF';
}

function wrapPcmInWavHeader(
  pcmData: Buffer,
  sampleRate: number,
  numChannels: number,
  bitsPerSample: number
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}

function getWavDurationSeconds(wavBuffer: Buffer): number {
  const sampleRate = wavBuffer.readUInt32LE(24) || 24000;
  const byteRate = wavBuffer.readUInt32LE(28) || sampleRate * 2;
  const dataBytes = Math.max(0, wavBuffer.length - 44);
  return Number((dataBytes / byteRate).toFixed(2));
}

/**
 * Controle de qualidade da locução: transcreve o WAV com o Gemini (multimodal) e compara com o texto falado esperado.
 * Detecta pronúncias erradas (ex: "PAW 3W35" em vez de "PAW três três nove cinco") ANTES de renderizar o vídeo.
 * Retorna a transcrição e a lista de palavras divergentes, que o bot mostra no Telegram para aprovação.
 */
export async function verifyNarration(
  audioFilePath: string,
  payload: DuelVideoPayload
): Promise<{ transcript: string; mismatches: string[] }> {
  const audioB64 = fs.readFileSync(audioFilePath).toString('base64');

  const response = await ai.models.generateContent({
    // gemini-3.8-flash travou em testes com áudio longo; 3.5-flash respondeu em ~10s
    model: process.env.GEMINI_QA_MODEL || 'gemini-3.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'audio/wav', data: audioB64 } },
          {
            text:
              'Transcreva este áudio em português exatamente como foi pronunciado, sem corrigir nada. ' +
              'Escreva números por extenso, como foram falados. Se algo soar errado, escreva o som exato. ' +
              'Responda só com a transcrição.',
          },
        ],
      },
    ],
    config: { temperature: 0 },
  });

  const transcript = (response.text || '').trim();

  const normalize = (t: string) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

  const expected = normalize(
    payload.scenes.map((s) => s.spokenText || s.narrationText).join(' ')
  );
  const heard = new Set(normalize(transcript));

  // Palavras esperadas que não aparecem na transcrição (ignora palavras curtas como "o", "de", "e")
  const mismatches = Array.from(new Set(expected.filter((w) => w.length > 2 && !heard.has(w))));

  return { transcript, mismatches };
}
