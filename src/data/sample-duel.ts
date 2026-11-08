import { DuelVideoPayload } from '../types/duel';

export const SAMPLE_DUEL_042: DuelVideoPayload = {
  duelCode: '#042',
  commentTriggerKeyword: 'DUELO42',
  category: 'PERIFÉRICOS // MOUSES SEM FIO',
  hookQuestion: 'Vale pagar R$ 889 no topo de linha ou o rival de R$ 239 entrega 95% da performance?',
  showcaseUrl: 'zenostech.com.br/criteriotech',
  fps: 60,
  width: 1080,
  height: 1920,
  technicalWinner: {
    id: 'g-pro-x-superlight-2',
    role: 'TECHNICAL_WINNER',
    roleBadge: 'VENCEDOR TÉCNICO // SEM CORTES',
    name: 'Logitech G Pro X Superlight 2',
    shortName: 'G Pro X2',
    brand: 'LOGITECH G',
    priceBRL: 889,
    imageUrl: '',
    tagline: 'Referência absoluta em eSports com bateria de 95h e switches ópticos',
    highlights: [
      { label: 'SENSOR ÓPTICO', value: 'HERO 2 • 44.000 DPI' },
      { label: 'POLLING RATE', value: '4.000 Hz Nativo (0.25ms)' },
      { label: 'BATERIA & PESO', value: '95 Horas • 60 Gramas' }
    ],
    verdictSummary: 'Para quem busca máxima confiabilidade, bateria monstruosa e garantia nacional de 2 anos.',
    affiliateLinks: {
      amazonUrl: 'https://www.zenostech.com.br/criteriotech?id=042&store=amazon&item=winner',
      mercadoLivreUrl: 'https://www.zenostech.com.br/criteriotech?id=042&store=ml&item=winner'
    }
  },
  rationalChoice: {
    id: 'attack-shark-x3-pro',
    role: 'RATIONAL_CHOICE',
    roleBadge: 'ESCOLHA RACIONAL // CUSTO-BENEFÍCIO',
    name: 'Attack Shark X3 Pro (PAW3395)',
    shortName: 'Shark X3 Pro',
    brand: 'ATTACK SHARK',
    priceBRL: 239,
    imageUrl: '',
    tagline: 'Sensor topo de linha e apenas 49g custando quase um quarto do preço',
    highlights: [
      { label: 'SENSOR ÓPTICO', value: 'PixArt PAW3395 • 26.000 DPI' },
      { label: 'CONEXÃO TRI-MODE', value: '2.4GHz 4K + Bluetooth + Cabo' },
      { label: 'PESO ULTRALEVE', value: 'Apenas 49 Gramas' }
    ],
    verdictSummary: 'Entrega 92% da precisão competitiva sendo 11g mais leve e economizando R$ 650 no seu bolso.',
    affiliateLinks: {
      amazonUrl: 'https://www.zenostech.com.br/criteriotech?id=042&store=amazon&item=rational',
      mercadoLivreUrl: 'https://www.zenostech.com.br/criteriotech?id=042&store=ml&item=rational'
    }
  },
  benchmarks: [
    {
      criterion: 'PRECISÃO DO SENSOR & TRACKING',
      winnerScore: 100,
      rationalScore: 93,
      winnerDisplay: 'HERO 2 (44K)',
      rationalDisplay: 'PAW3395 (26K)',
      advantage: 'WINNER'
    },
    {
      criterion: 'CONSTRUÇÃO ULTRALEVE (MENOR = MELHOR)',
      winnerScore: 86,
      rationalScore: 98,
      winnerDisplay: '60g',
      rationalDisplay: '49g (-18%)',
      advantage: 'RATIONAL'
    },
    {
      criterion: 'AUTONOMIA DE BATERIA CONTÍNUA',
      winnerScore: 98,
      rationalScore: 72,
      winnerDisplay: '95 Horas',
      rationalDisplay: '65 Horas',
      advantage: 'WINNER'
    },
    {
      criterion: 'ÍNDICE DE EFICIÊNCIA POR REAL GASTO',
      winnerScore: 64,
      rationalScore: 99,
      winnerDisplay: 'R$ 889',
      rationalDisplay: 'R$ 239 (-73%)',
      advantage: 'RATIONAL'
    }
  ],
  scenes: [
    {
      sceneId: 'hook',
      startSec: 0,
      endSec: 11.0,
      narrationText: 'Se você está procurando um mouse sem fio de elite hoje, provavelmente esbarrou nessa dúvida: vale mesmo a pena pagar 889 reais no famoso Logitech G Pro X Superlight 2... ou será que o Attack Shark X3 Pro, que custa apenas 239 reais, já entrega quase tudo o que você precisa?'
    },
    {
      sceneId: 'winner',
      startSec: 11.0,
      endSec: 26.0,
      narrationText: 'Vamos começar pelo Vencedor Técnico: o Logitech G Pro X 2. Ele é simplesmente a referência absoluta no cenário profissional. Traz o sensor exclusivo HERO 2 de 44 mil DPI, switches ópticos híbridos que nunca dão duplo clique, e uma bateria absurda de 95 horas reais com 2 anos de garantia no Brasil.'
    },
    {
      sceneId: 'rational',
      startSec: 26.0,
      endSec: 41.0,
      narrationText: 'Mas aí entra a Escolha Racional do nosso duelo: o Attack Shark X3 Pro. Por um quarto do preço, ele entrega o consagrado sensor topo de linha PixArt PAW 3395, conexão Tri-Mode, e pesa apenas 49 gramas. São 11 gramas mais leve na mão e 650 reais de economia direta no seu bolso.'
    },
    {
      sceneId: 'benchmarks',
      startSec: 41.0,
      endSec: 54.0,
      narrationText: 'Sendo 100% sincero na bancada: para custar tão barato, o Attack Shark tem plástico um pouco mais simples e bateria de 65 horas contra 95 do Logitech. Mas no rastreio dentro do jogo a diferença é mínima e ele dá um banho em custo-benefício.'
    },
    {
      sceneId: 'verdict',
      startSec: 54.0,
      endSec: 65.0,
      narrationText: 'Veredito Critério Tech: quer o melhor do mundo com garantia nacional? Vai de Logitech G Pro X 2. Quer a compra mais inteligente gastando pouco? Attack Shark X3 Pro. Comente DUELO42 aqui embaixo que eu te envio os links com menor preço no Direct!'
    }
  ]
};
