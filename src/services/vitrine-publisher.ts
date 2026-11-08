import { DuelVideoPayload } from '../types/duel';

export function withAmazonPartnerTag(rawUrl: string): string {
  const tag = process.env.AMAZON_PARTNER_TAG || 'criteriotech-20';
  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes('amazon.com')) {
      u.searchParams.set('tag', tag);
      return u.toString();
    }
  } catch {}
  return rawUrl;
}

export function withMercadoLivreAffiliate(rawUrl: string): string {
  const mattTool = process.env.MERCADOLIVRE_MATT_TOOL;
  const mattWord = process.env.MERCADOLIVRE_MATT_WORD || 'criteriotech';
  if (!mattTool) return rawUrl;
  try {
    const u = new URL(rawUrl);
    if (u.hostname.includes('mercadolivre.com')) {
      u.searchParams.set('matt_tool', mattTool);
      u.searchParams.set('matt_word', mattWord);
      return u.toString();
    }
  } catch {}
  return rawUrl;
}

/**
 * Etapa 4A: Atualiza automaticamente a Vitrine Oficial (zenostech.com.br/criteriotech)
 * via GitHub REST API (sem precisar clonar o repositório no container do Cloud Run).
 */
export async function publishDuelToGitHubPages(payload: DuelVideoPayload): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'oliveiira-renan-21/criterio-tech';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const filePath = 'duels.json';

  // Garante tags de afiliado aplicadas antes de salvar na vitrine
  payload.technicalWinner.affiliateLinks.amazonUrl = withAmazonPartnerTag(
    payload.technicalWinner.affiliateLinks.amazonUrl
  );
  payload.rationalChoice.affiliateLinks.amazonUrl = withAmazonPartnerTag(
    payload.rationalChoice.affiliateLinks.amazonUrl
  );
  payload.technicalWinner.affiliateLinks.mercadoLivreUrl = withMercadoLivreAffiliate(
    payload.technicalWinner.affiliateLinks.mercadoLivreUrl
  );
  payload.rationalChoice.affiliateLinks.mercadoLivreUrl = withMercadoLivreAffiliate(
    payload.rationalChoice.affiliateLinks.mercadoLivreUrl
  );

  if (!token || !repo) {
    console.warn('[Vitrine] GITHUB_TOKEN ou GITHUB_REPO não configurados. Pulando push remoto.');
    return `https://${payload.showcaseUrl}/?duel=${payload.duelCode.replace('#', '')}`;
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'CriterioTech-Engine',
  };

  let existingDuels: any[] = [];
  let currentSha: string | undefined;

  const getRes = await fetch(`${apiUrl}?ref=${branch}`, { headers });
  if (getRes.ok) {
    const fileData: any = await getRes.json();
    currentSha = fileData.sha;
    const decoded = Buffer.from(fileData.content, 'base64').toString('utf-8');
    existingDuels = JSON.parse(decoded);
  }

  const filtered = existingDuels.filter((d) => d.duelCode !== payload.duelCode);
  const updatedList = [payload, ...filtered];

  const updatedBase64 = Buffer.from(JSON.stringify(updatedList, null, 2), 'utf-8').toString(
    'base64'
  );

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `feat(vitrine): publica duelo ${payload.duelCode} (${payload.technicalWinner.shortName} vs ${payload.rationalChoice.shortName})`,
      content: updatedBase64,
      sha: currentSha,
      branch,
    }),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`Falha ao publicar na vitrine GitHub Pages: ${errText}`);
  }

  return `https://${payload.showcaseUrl}/?duel=${payload.duelCode.replace('#', '')}`;
}

/**
 * Etapa 4B: Gera o Payload Oficial do Carrossel Nativo do Instagram Direct (Meta Graph API)
 */
export function buildInstagramDmCarouselPayload(payload: DuelVideoPayload) {
  const savings = payload.technicalWinner.priceBRL - payload.rationalChoice.priceBRL;

  return {
    triggerKeyword: payload.commentTriggerKeyword,
    welcomeText: `Fala! 👋 Separei os 2 produtos do Duelo ${payload.duelCode} com o menor preço verificado hoje:`,
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        image_aspect_ratio: 'horizontal',
        elements: [
          {
            title: `🏆 ${payload.technicalWinner.name} — R$ ${payload.technicalWinner.priceBRL}`,
            subtitle: `${payload.technicalWinner.highlights.map((h) => h.value).join(' • ')}`,
            image_url:
              payload.technicalWinner.imageUrl ||
              `https://oliveiira-renan-21.github.io/criterio-tech/assets/winner-1.png`,
            buttons: [
              {
                type: 'web_url',
                url: withAmazonPartnerTag(payload.technicalWinner.affiliateLinks.amazonUrl),
                title: '🛒 Ver na Amazon',
              },
              {
                type: 'web_url',
                url: withMercadoLivreAffiliate(payload.technicalWinner.affiliateLinks.mercadoLivreUrl),
                title: '⚡ Mercado Livre',
              },
              {
                type: 'web_url',
                url: `https://www.zenostech.com.br/criteriotech?duel=${payload.duelCode.replace('#', '')}`,
                title: '🌐 Comparativo no Site',
              },
            ],
          },
          {
            title: `⚡ ${payload.rationalChoice.name} — R$ ${payload.rationalChoice.priceBRL}`,
            subtitle: `Economize R$ ${savings}! ${payload.rationalChoice.highlights.map((h) => h.value).join(' • ')}`,
            image_url:
              payload.rationalChoice.imageUrl ||
              `https://oliveiira-renan-21.github.io/criterio-tech/assets/rational-1.png`,
            buttons: [
              {
                type: 'web_url',
                url: withAmazonPartnerTag(payload.rationalChoice.affiliateLinks.amazonUrl),
                title: '🛒 Ver na Amazon',
              },
              {
                type: 'web_url',
                url: withMercadoLivreAffiliate(payload.rationalChoice.affiliateLinks.mercadoLivreUrl),
                title: '⚡ ML Frete Full',
              },
              {
                type: 'web_url',
                url: `https://www.zenostech.com.br/criteriotech?duel=${payload.duelCode.replace('#', '')}`,
                title: '🌐 Comparativo no Site',
              },
            ],
          },
        ],
      },
    },
  };
}

/**
 * Etapa 4C: Endpoint Dinâmico Universal para ManyChat ("External Request")
 * Permite configurar o ManyChat UMA ÚNICA VEZ na vida (gatilho: comentário contém "DUELO").
 * O ManyChat envia o texto do comentário (ex: "DUELO42") para este endpoint, e o servidor
 * devolve automaticamente o Carrossel Nativo com foto, preço e links de afiliado daquele duelo!
 */
export async function buildManyChatDynamicGalleryResponse(commentText: string) {
  const numMatch = commentText.match(/(\d+)/);
  const duelNum = numMatch ? numMatch[1].padStart(3, '0') : '042';
  const targetCode = `#${duelNum}`;

  const res = await fetch('https://oliveiira-renan-21.github.io/criterio-tech/duels.json');
  const duels: any[] = res.ok ? await res.json() : [];
  const duel = duels.find((d) => d.duelCode === targetCode) || duels[0];

  if (!duel) {
    return {
      version: 'v2',
      content: {
        messages: [
          {
            type: 'text',
            text: 'Fala! 👋 Acesse todos os links verificados na nossa Vitrine Oficial: https://www.zenostech.com.br/criteriotech',
          },
        ],
      },
    };
  }

  const w = duel.technicalWinner;
  const r = duel.rationalChoice;
  const savings = w.priceBRL - r.priceBRL;
  const baseAssets = 'https://oliveiira-renan-21.github.io/criterio-tech';

  const resolveImg = (u?: string, fallback?: string) => {
    if (!u) return fallback;
    return u.startsWith('http') ? u : `${baseAssets}/${u.replace(/^\.\//, '')}`;
  };

  const wAmazon = withAmazonPartnerTag(w.amazonUrl || w.affiliateLinks?.amazonUrl || '');
  const wMl = withMercadoLivreAffiliate(w.mercadoLivreUrl || w.affiliateLinks?.mercadoLivreUrl || '');
  const rAmazon = withAmazonPartnerTag(r.amazonUrl || r.affiliateLinks?.amazonUrl || '');
  const rMl = withMercadoLivreAffiliate(r.mercadoLivreUrl || r.affiliateLinks?.mercadoLivreUrl || '');

  return {
    version: 'v2',
    content: {
      type: 'instagram',
      messages: [
        {
          type: 'text',
          text: `Fala! 👋 Separei os 2 produtos do Duelo ${duel.duelCode} com o menor preço verificado hoje. Deslize pro lado ou toque na loja:`,
        },
        {
          type: 'cards',
          image_aspect_ratio: 'square',
          elements: [
            {
              title: `🏆 ${w.name} — R$ ${w.priceBRL}`,
              subtitle: (w.highlights || []).map((h: any) => h.value).join(' • '),
              image_url: resolveImg(w.imageUrl, `${baseAssets}/assets/winner-1.png`),
              buttons: [
                { type: 'url', caption: '🛒 Ver na Amazon', url: wAmazon },
                { type: 'url', caption: '⚡ Mercado Livre', url: wMl },
                {
                  type: 'url',
                  caption: '🌐 Comparativo no Site',
                  url: `https://www.zenostech.com.br/criteriotech`,
                },
              ],
            },
            {
              title: `⚡ ${r.name} — R$ ${r.priceBRL}`,
              subtitle: `Economize R$ ${savings}! ${(r.highlights || []).map((h: any) => h.value).join(' • ')}`,
              image_url: resolveImg(r.imageUrl, `${baseAssets}/assets/rational-1.png`),
              buttons: [
                { type: 'url', caption: '🛒 Ver na Amazon', url: rAmazon },
                { type: 'url', caption: '⚡ ML Frete Full', url: rMl },
                {
                  type: 'url',
                  caption: '🌐 Comparativo no Site',
                  url: `https://www.zenostech.com.br/criteriotech`,
                },
              ],
            },
          ],
        },
      ],
    },
  };
}
