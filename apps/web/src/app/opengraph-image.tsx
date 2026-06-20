import { ImageResponse } from 'next/og';

export const alt = 'Arborisis — Cultivez un empire vivant';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background:
          'radial-gradient(circle at 75% 40%, #2a7748 0%, #153e2a 18%, #08130c 55%, #040906 100%)',
        color: '#f0f8ef',
        display: 'flex',
        height: '100%',
        justifyContent: 'space-between',
        padding: '72px 82px',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
        <div style={{ color: '#91d6a5', display: 'flex', fontSize: 28, letterSpacing: 7 }}>
          STRATÉGIE SPATIALE ORGANIQUE
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: -5,
            lineHeight: 1.02,
            marginTop: 30,
          }}
        >
          Cultivez un empire vivant.
        </div>
        <div style={{ color: '#b9cfbd', display: 'flex', fontSize: 32, marginTop: 38 }}>
          Arborisis · Jeu de stratégie multijoueur sur navigateur
        </div>
      </div>
      <div
        style={{
          background: 'radial-gradient(circle, #8ee8a3 0%, #3a9e60 30%, #102e1d 70%)',
          border: '2px solid rgba(174, 255, 191, 0.35)',
          borderRadius: 999,
          boxShadow: '0 0 90px rgba(87, 213, 118, 0.35)',
          display: 'flex',
          height: 260,
          width: 260,
        }}
      />
    </div>,
    size,
  );
}
