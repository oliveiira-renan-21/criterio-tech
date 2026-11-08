import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { DuelVideoPayload, ProductFighter } from '../types/duel';

export interface CriterioTechVideoProps {
  payload: DuelVideoPayload;
}

const THEME = {
  bgGradient: 'radial-gradient(circle at 50% 25%, #112240 0%, #05070E 70%)',
  glassCard: 'rgba(255, 255, 255, 0.06)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  cyan: '#22D3EE',
  emerald: '#34D399',
  amber: '#FBBF24',
  textMain: '#FFFFFF',
  textMuted: '#94A3B8',
};

export const CriterioTechVideo: React.FC<CriterioTechVideoProps> = ({ payload }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;

  const activeScene =
    payload.scenes.find((s) => currentSec >= s.startSec && currentSec < s.endSec) ||
    payload.scenes[payload.scenes.length - 1];

  const sceneStartFrame = Math.round(activeScene.startSec * fps);
  const localFrame = Math.max(0, frame - sceneStartFrame);
  const sceneDurationSec = Math.max(0.1, activeScene.endSec - activeScene.startSec);
  const sceneProgress = Math.min(1, (currentSec - activeScene.startSec) / sceneDurationSec);

  const entranceSpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, stiffness: 130 },
  });

  // Dynamic 5-word Creator Captions
  const words = activeScene.narrationText.split(' ');
  const activeWordIdx = Math.floor(sceneProgress * words.length);
  const chunkStart = Math.floor(activeWordIdx / 5) * 5;
  const visibleWords = words.slice(chunkStart, chunkStart + 5);

  return (
    <AbsoluteFill
      style={{
        background: THEME.bgGradient,
        color: THEME.textMain,
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Studio Ambient Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: -180,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 760,
          height: 760,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,255,0.35), rgba(124,58,237,0.18), transparent 70%)',
          filter: 'blur(90px)',
        }}
      />

      {payload.audioUrl ? <Audio src={payload.audioUrl} /> : null}

      {/* Top Glass Brand Header */}
      <div
        style={{
          position: 'absolute',
          top: 54,
          left: 48,
          right: 48,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 20,
        }}
      >
        <div
          style={{
            padding: '14px 28px',
            borderRadius: 999,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            border: `1px solid ${THEME.glassBorder}`,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 1.5,
          }}
        >
          ⚡ CRITÉRIO TECH
        </div>
        <div
          style={{
            padding: '14px 28px',
            borderRadius: 999,
            backgroundColor: 'rgba(15, 23, 42, 0.78)',
            border: `1px solid ${THEME.glassBorder}`,
            fontSize: 26,
            fontWeight: 900,
            color: THEME.cyan,
          }}
        >
          Duelo {payload.duelCode}
        </div>
      </div>

      {/* Main Commercial Stage */}
      <AbsoluteFill
        style={{
          top: 180,
          bottom: 350,
          left: 48,
          right: 48,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transform: `scale(${interpolate(entranceSpring, [0, 1], [0.94, 1])})`,
          opacity: entranceSpring,
        }}
      >
        {activeScene.sceneId === 'hook' && <CommercialHookScene payload={payload} />}
        {activeScene.sceneId === 'winner' && (
          <ProductHeroCard
            fighter={payload.technicalWinner}
            accent={THEME.cyan}
            badge="🏆 MELHOR DO MUNDO"
            socialProof="★★★★★ 4.9 (3.100+ vendidos)"
          />
        )}
        {activeScene.sceneId === 'rational' && (
          <ProductHeroCard
            fighter={payload.rationalChoice}
            accent={THEME.emerald}
            badge={`⚡ ECONOMIZE R$ ${payload.technicalWinner.priceBRL - payload.rationalChoice.priceBRL}`}
            socialProof="★★★★★ 4.8 (5.800+ vendidos)"
          />
        )}
        {activeScene.sceneId === 'benchmarks' && (
          <CommercialBenchmarkScene payload={payload} progress={entranceSpring} />
        )}
        {activeScene.sceneId === 'verdict' && <CommercialVerdictScene payload={payload} />}
      </AbsoluteFill>

      {/* Dynamic 5-Word Pop Captions */}
      <div
        style={{
          position: 'absolute',
          bottom: 185,
          left: 48,
          right: 48,
          padding: '22px 32px',
          borderRadius: 32,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: `1px solid ${THEME.glassBorder}`,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        {visibleWords.map((word, idx) => {
          const isCurrent = chunkStart + idx === activeWordIdx;
          return (
            <span
              key={idx}
              style={{
                fontSize: 42,
                fontWeight: 900,
                padding: isCurrent ? '4px 16px' : '4px 4px',
                borderRadius: 16,
                backgroundColor: isCurrent ? THEME.cyan : 'transparent',
                color: isCurrent ? '#05070E' : THEME.textMain,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* High-Conversion Store & Comment Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 48,
          left: 48,
          right: 48,
          height: 108,
          borderRadius: 32,
          backgroundColor: THEME.glassCard,
          border: `1px solid ${THEME.glassBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
        }}
      >
        <div>
          <div style={{ fontSize: 22, color: THEME.textMuted, fontWeight: 700 }}>
            Links com Menor Preço Hoje:
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: THEME.cyan }}>
            {payload.showcaseUrl}
          </div>
        </div>
        <div
          style={{
            backgroundColor: THEME.emerald,
            color: '#05070E',
            padding: '16px 28px',
            borderRadius: 24,
            fontSize: 28,
            fontWeight: 900,
          }}
        >
          💬 {payload.commentTriggerKeyword}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CommercialHookScene: React.FC<{ payload: DuelVideoPayload }> = ({ payload }) => {
  const discountPct = Math.round(
    (1 - payload.rationalChoice.priceBRL / payload.technicalWinner.priceBRL) * 100
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            color: THEME.amber,
            padding: '10px 28px',
            borderRadius: 999,
            fontSize: 26,
            fontWeight: 900,
          }}
        >
          🔥 DUELO DE COMPRA INTELIGENTE
        </span>
        <h2 style={{ fontSize: 52, fontWeight: 900, marginTop: 24, lineHeight: 1.2 }}>
          {payload.hookQuestion}
        </h2>
      </div>

      <div style={{ display: 'flex', gap: 28 }}>
        {[
          { item: payload.technicalWinner, accent: THEME.cyan, tag: 'ELITE PRO' },
          { item: payload.rationalChoice, accent: THEME.emerald, tag: `-${discountPct}% PREÇO` },
        ].map(({ item, accent, tag }) => (
          <div
            key={item.id}
            style={{
              flex: 1,
              backgroundColor: THEME.glassCard,
              border: `2px solid ${accent}`,
              borderRadius: 36,
              padding: 36,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span
                style={{
                  backgroundColor: accent,
                  color: '#05070E',
                  padding: '6px 18px',
                  borderRadius: 12,
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {tag}
              </span>
              <span style={{ color: THEME.amber, fontSize: 26, fontWeight: 900 }}>★ 4.9</span>
            </div>

            {item.imageUrl ? (
              <Img
                src={item.imageUrl}
                style={{ width: '100%', height: 260, objectFit: 'contain', margin: '24px 0' }}
              />
            ) : null}

            <div>
              <div style={{ fontSize: 36, fontWeight: 900 }}>{item.shortName}</div>
              <div style={{ fontSize: 56, fontWeight: 900, color: accent, marginTop: 8 }}>
                R$ {item.priceBRL}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductHeroCard: React.FC<{
  fighter: ProductFighter;
  accent: string;
  badge: string;
  socialProof: string;
}> = ({ fighter, accent, badge, socialProof }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
    <div
      style={{
        backgroundColor: THEME.glassCard,
        border: `2px solid ${accent}`,
        borderRadius: 40,
        padding: 44,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            backgroundColor: accent,
            color: '#05070E',
            padding: '10px 24px',
            borderRadius: 999,
            fontSize: 24,
            fontWeight: 900,
          }}
        >
          {badge}
        </span>
        <span style={{ color: THEME.amber, fontSize: 26, fontWeight: 800 }}>{socialProof}</span>
      </div>

      {fighter.imageUrl ? (
        <Img
          src={fighter.imageUrl}
          style={{ width: '100%', height: 340, objectFit: 'contain', margin: '28px 0' }}
        />
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 48, fontWeight: 900 }}>{fighter.name}</div>
          <div style={{ fontSize: 28, color: THEME.textMuted, marginTop: 8 }}>
            {fighter.tagline}
          </div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 900, color: accent }}>
          R$ {fighter.priceBRL}
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', gap: 20 }}>
      {fighter.highlights.map((spec) => (
        <div
          key={spec.label}
          style={{
            flex: 1,
            backgroundColor: THEME.glassCard,
            border: `1px solid ${THEME.glassBorder}`,
            borderRadius: 28,
            padding: 28,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 22, color: THEME.textMuted, fontWeight: 700 }}>
            {spec.label}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: accent, marginTop: 8 }}>
            {spec.value}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CommercialBenchmarkScene: React.FC<{
  payload: DuelVideoPayload;
  progress: number;
}> = ({ payload, progress }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {payload.benchmarks.map((row) => (
      <div
        key={row.criterion}
        style={{
          backgroundColor: THEME.glassCard,
          border: `1px solid ${THEME.glassBorder}`,
          borderRadius: 28,
          padding: 32,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 28,
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          <span style={{ color: THEME.cyan }}>{row.winnerDisplay}</span>
          <span>{row.criterion}</span>
          <span style={{ color: THEME.emerald }}>{row.rationalDisplay}</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div
            style={{
              flex: 1,
              height: 22,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 999,
              display: 'flex',
              justifyContent: 'flex-end',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${row.winnerScore * progress}%`,
                height: '100%',
                backgroundColor: THEME.cyan,
                borderRadius: 999,
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              height: 22,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${row.rationalScore * progress}%`,
                height: '100%',
                backgroundColor: THEME.emerald,
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const CommercialVerdictScene: React.FC<{ payload: DuelVideoPayload }> = ({ payload }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
    <div
      style={{
        backgroundColor: THEME.glassCard,
        borderLeft: `10px solid ${THEME.cyan}`,
        borderRadius: 32,
        padding: 36,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, color: THEME.cyan }}>
          🏆 QUER O MELHOR SEM OLHAR PREÇO?
        </div>
        <div style={{ fontSize: 42, fontWeight: 900, marginTop: 6 }}>
          {payload.technicalWinner.name}
        </div>
        <div style={{ fontSize: 26, color: THEME.textMuted, marginTop: 6 }}>
          {payload.technicalWinner.verdictSummary}
        </div>
      </div>
      <div style={{ fontSize: 52, fontWeight: 900, color: THEME.cyan }}>
        R$ {payload.technicalWinner.priceBRL}
      </div>
    </div>

    <div
      style={{
        backgroundColor: THEME.glassCard,
        borderLeft: `10px solid ${THEME.emerald}`,
        borderRadius: 32,
        padding: 36,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, color: THEME.emerald }}>
          ⚡ QUER COMPRA INTELIGENTE?
        </div>
        <div style={{ fontSize: 42, fontWeight: 900, marginTop: 6 }}>
          {payload.rationalChoice.name}
        </div>
        <div style={{ fontSize: 26, color: THEME.textMuted, marginTop: 6 }}>
          {payload.rationalChoice.verdictSummary}
        </div>
      </div>
      <div style={{ fontSize: 52, fontWeight: 900, color: THEME.emerald }}>
        R$ {payload.rationalChoice.priceBRL}
      </div>
    </div>

    <div
      style={{
        background: `linear-gradient(90deg, ${THEME.emerald}, ${THEME.cyan})`,
        color: '#05070E',
        borderRadius: 32,
        padding: 36,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 900 }}>
        👇 RECEBA OS LINKS COM MENOR PREÇO NO DIRECT:
      </div>
      <div style={{ fontSize: 44, fontWeight: 900, marginTop: 8 }}>
        COMENTE &ldquo;{payload.commentTriggerKeyword}&rdquo; AQUI EMBAIXO!
      </div>
    </div>
  </div>
);
