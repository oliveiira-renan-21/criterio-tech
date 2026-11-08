export interface ProductSpecItem {
  label: string;
  value: string;
}

export interface ProductFighter {
  id: string;
  role: 'TECHNICAL_WINNER' | 'RATIONAL_CHOICE';
  roleBadge: string;
  name: string;
  shortName: string;
  brand: string;
  priceBRL: number;
  imageUrl: string;
  tagline: string;
  highlights: ProductSpecItem[];
  verdictSummary: string;
  affiliateLinks: {
    amazonUrl: string;
    mercadoLivreUrl: string;
  };
}

export interface SpecBenchmarkRow {
  criterion: string;
  unit?: string;
  winnerScore: number; // 0 to 100
  rationalScore: number; // 0 to 100
  winnerDisplay: string;
  rationalDisplay: string;
  advantage: 'WINNER' | 'RATIONAL' | 'TIE';
}

export interface SceneTiming {
  sceneId: 'hook' | 'winner' | 'rational' | 'benchmarks' | 'verdict';
  startSec: number;
  endSec: number;
  narrationText: string; // Texto da LEGENDA (grafia correta: "PAW3395", "R$ 889")
  spokenText?: string; // Texto enviado à VOZ (por extenso: "PAW três três nove cinco", "oitocentos e oitenta e nove reais")
}

export interface PlatformEndings {
  instagram: {
    narrationText: string; // Ex: "Comente DUELO42 aqui embaixo que eu te envio os links com o menor preço no Direct!"
    spokenText: string; // Ex: "Comente duelo quarenta e dois aqui embaixo que eu te envio os links com o menor preço no Direct!"
  };
  tiktokShorts: {
    narrationText: string; // Ex: "Links com menor preço no link do perfil (Duelo #042)! Comenta aqui: qual dos dois você escolheria?"
    spokenText: string; // Ex: "Os links com o menor preço estão no link do perfil, é só buscar pelo Duelo quarenta e dois! E comenta aqui: qual dos dois você escolheria?"
  };
}

export interface DuelVideoPayload {
  duelCode: string; // Ex: "#042"
  commentTriggerKeyword: string; // Ex: "DUELO42"
  category: string; // Ex: "MOUSES GAMER ULTRALEVES"
  hookQuestion: string;
  showcaseUrl: string; // Ex: "zenostech.com.br/criteriotech"
  fps: number;
  width: number;
  height: number;
  audioUrl?: string;
  backgroundLoopUrl?: string;
  musicTrackUrl?: string;
  technicalWinner: ProductFighter;
  rationalChoice: ProductFighter;
  benchmarks: SpecBenchmarkRow[];
  scenes: SceneTiming[];
  platformEndings?: PlatformEndings;
}
