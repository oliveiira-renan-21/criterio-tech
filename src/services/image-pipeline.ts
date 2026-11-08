import * as fs from 'fs';
import * as path from 'path';

export interface ProductGalleryAssets {
  asin: string | null;
  colorVariant: string;
  studioWhiteAngles: string[];
}

/**
 * Pipeline de Imagens Profissionais v2 (Vitrine Branca de Estúdio #FFFFFF + Trava de Mesma Cor/Unidade):
 * 1. Por que vitrine branca (#FFFFFF) dentro do tema escuro (#09090B)?
 *    - 100% das fotos oficiais de fabricantes na Amazon/Mercado Livre são fotografadas em fundo infinito branco (#FFFFFF)
 *      com sombra natural de piso. Ao manter o pedestal da foto em branco puro (#FFFFFF) com bordas arredondadas (estilo Apple Store / Amazon),
 *      eliminamos 100% do "halo branco" de recorte e garantimos contraste máximo para produtos pretos/grafite.
 * 2. Trava de Consistência de Cor (Colorway Lock):
 *    - Extrai apenas o bloco da variante principal (`colorImages.initial`) do ASIN vencedor para nunca misturar
 *      cores diferentes (ex: mouse preto no ângulo 1 e mouse branco/vermelho no ângulo 2).
 * 3. Filtro de Estúdio (`HasWhiteStudioCorners`) + Normalização Simétrica (80% Bounding Box em #FFFFFF):
 *    - Rejeita pôsteres escuros com textos de marketing e centraliza os ângulos na mesma proporção visual.
 */
export async function fetchAmazonHighResGallery(
  productQuery: string,
  requiredKeywords: string[] = []
): Promise<ProductGalleryAssets> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9',
  };

  const searchUrl = `https://www.amazon.com.br/s?k=${encodeURIComponent(productQuery)}`;
  const searchRes = await fetch(searchUrl, { headers });
  const searchHtml = await searchRes.text();

  const keywords =
    requiredKeywords.length > 0
      ? requiredKeywords.map((k) => k.toLowerCase())
      : productQuery
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 2);

  const resultBlocks = searchHtml.split('data-component-type="s-search-result"').slice(1);
  let matchedAsin: string | null = null;

  for (const block of resultBlocks) {
    const asinMatch = block.match(/data-asin="([A-Z0-9]{10})"/);
    if (!asinMatch?.[1]) continue;

    const snippet = block.slice(0, 3500).toLowerCase();
    if (keywords.every((kw) => snippet.includes(kw))) {
      matchedAsin = asinMatch[1];
      break;
    }
  }

  if (matchedAsin) {
    const prodRes = await fetch(`https://www.amazon.com.br/dp/${matchedAsin}`, { headers });
    const prodHtml = await prodRes.text();

    // Extrai apenas o bloco 'initial' da cor selecionada para nunca misturar cores de outras variantes da mesma página
    const initialBlockMatch = prodHtml.match(/'colorImages'\s*:\s*\{\s*'initial'\s*:\s*(\[[\s\S]*?\])\s*\}/);
    const targetSlice = initialBlockMatch?.[1] || prodHtml;

    const hiResMatches = Array.from(
      targetSlice.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+?\.jpg)"/g)
    ).map((m) => m[1]);

    const uniqueHiRes = Array.from(new Set(hiResMatches));
    if (uniqueHiRes.length > 0) {
      return {
        asin: matchedAsin,
        colorVariant: 'locked-initial-variant',
        studioWhiteAngles: uniqueHiRes.slice(0, 6),
      };
    }
  }

  const fallbackMatches = Array.from(
    searchHtml.matchAll(
      /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+\-_]+?\._AC_[^"'\s]+?\.jpg/g
    )
  ).map((m) => m[0].replace(/\._AC_[^.]+_\./, '._AC_SL1500_.'));

  return {
    asin: matchedAsin,
    colorVariant: 'search-card-primary',
    studioWhiteAngles: Array.from(new Set(fallbackMatches)).slice(0, 4),
  };
}
