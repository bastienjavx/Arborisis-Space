import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";

const C = {
  ink: "#06100b",
  cream: "#eff3d2",
  green: "#9bd17b",
  lime: "#cfe89b",
  violet: "#9e7bd3",
  gold: "#c9a35f",
};

const fade = (frame: number, duration: number) =>
  interpolate(frame, [0, 12, duration - 12, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Noise = () => (
  <AbsoluteFill
    style={{
      opacity: 0.16,
      backgroundImage:
        "radial-gradient(circle at 20% 25%, rgba(155,209,123,.18) 0 1px, transparent 2px), radial-gradient(circle at 80% 65%, rgba(158,123,211,.15) 0 1px, transparent 2px)",
      backgroundSize: "41px 41px, 57px 57px",
    }}
  />
);

const LivingPlanet = ({ dark = 0.35 }: { dark?: number }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], [1.08, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.55, 1),
  });
  return (
    <AbsoluteFill>
      <Img
        src={staticFile("assets/hero.webp")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(6,16,11,${dark}) 0%, rgba(6,16,11,.2) 42%, rgba(6,16,11,.94) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const Brand = ({ small = false }: { small?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: small ? 14 : 22 }}>
    <Img
      src={staticFile("assets/icon.png")}
      style={{ width: small ? 46 : 88, height: small ? 46 : 88 }}
    />
    <div
      style={{
        fontFamily: "Georgia, serif",
        fontSize: small ? 34 : 66,
        color: C.cream,
        letterSpacing: -2,
      }}
    >
      Arborisis
    </div>
  </div>
);

const Hook = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const enter = interpolate(frame, [4, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <AbsoluteFill style={{ opacity: fade(frame, durationInFrames) }}>
      <LivingPlanet />
      <Noise />
      <div
        style={{ position: "absolute", top: width > 1080 ? 80 : 105, left: 68 }}
      >
        <Brand small />
      </div>
      <div
        style={{
          position: "absolute",
          left: 68,
          right: 68,
          bottom: 230,
          transform: `translateY(${(1 - enter) * 60}px)`,
          opacity: enter,
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: C.green,
            textTransform: "uppercase",
            letterSpacing: 6,
            fontWeight: 700,
          }}
        >
          Stratégie spatiale organique
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: "Georgia, serif",
            fontSize: width > 1080 ? 96 : 102,
            lineHeight: 0.98,
            color: C.cream,
          }}
        >
          Une galaxie ne se{" "}
          <span style={{ fontStyle: "italic", color: C.lime }}>conquiert</span>{" "}
          pas.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Cultivate = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const grow = interpolate(frame, [0, 28], [0.72, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <AbsoluteFill
      style={{ backgroundColor: C.ink, opacity: fade(frame, durationInFrames) }}
    >
      <LivingPlanet dark={0.62} />
      <Noise />
      <div
        style={{
          position: "absolute",
          inset: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ transform: `scale(${grow})`, opacity: grow }}>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 74,
              color: C.cream,
            }}
          >
            Elle se
          </div>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: 156,
              lineHeight: 0.95,
              color: C.green,
              textShadow: "0 0 50px rgba(155,209,123,.28)",
            }}
          >
            cultive.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FeatureCard = ({
  src,
  kicker,
  title,
  accent,
  delay,
}: {
  src: string;
  kicker: string;
  title: string;
  accent: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <div
      style={{
        height: 345,
        border: "1px solid rgba(207,232,155,.23)",
        borderRadius: 28,
        overflow: "hidden",
        background: "rgba(6,16,11,.84)",
        transform: `translateY(${(1 - p) * 65}px)`,
        opacity: p,
        boxShadow: "0 25px 90px rgba(0,0,0,.38)",
      }}
    >
      <Img
        src={staticFile(`assets/${src}`)}
        style={{ width: "100%", height: 210, objectFit: "cover" }}
      />
      <div style={{ padding: "20px 26px" }}>
        <div
          style={{
            fontSize: 18,
            color: accent,
            textTransform: "uppercase",
            letterSpacing: 5,
            fontWeight: 700,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 46,
            color: C.cream,
            marginTop: 5,
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
};

const Pillars = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 70% 10%, #15291b, #06100b 55%)",
        opacity: fade(frame, durationInFrames),
      }}
    >
      <Noise />
      <div style={{ padding: "105px 62px 70px" }}>
        <div
          style={{
            fontSize: 27,
            textTransform: "uppercase",
            letterSpacing: 6,
            color: C.green,
            fontWeight: 700,
          }}
        >
          Faites grandir votre civilisation
        </div>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 78,
            lineHeight: 1.02,
            color: C.cream,
            marginTop: 22,
            marginBottom: 52,
          }}
        >
          Bâtissez. Évoluez.
          <br />
          <span style={{ fontStyle: "italic", color: C.lime }}>
            Étendez vos racines.
          </span>
        </div>
        <div style={{ display: "grid", gap: 25 }}>
          <FeatureCard
            src="real-empire.png"
            kicker="Développer"
            title="Empire"
            accent={C.green}
            delay={3}
          />
          <FeatureCard
            src="real-structures.png"
            kicker="Bâtir"
            title="Structures"
            accent={C.violet}
            delay={12}
          />
          <FeatureCard
            src="real-pve.png"
            kicker="Affronter"
            title="Anomalies PvE"
            accent={C.gold}
            delay={21}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Gameplay = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const images = ["real-empire.png", "real-structures.png", "real-pve.png"];
  const selected = Math.min(images.length - 1, Math.floor(frame / 35));
  const local = frame % 35;
  const slide = interpolate(local, [0, 10], [70, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill
      style={{ backgroundColor: C.ink, opacity: fade(frame, durationInFrames) }}
    >
      <Noise />
      <div style={{ position: "absolute", top: 110, left: 62, right: 62 }}>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 74,
            lineHeight: 1.04,
            color: C.cream,
          }}
        >
          Votre empire vit.
          <br />
          <span style={{ fontStyle: "italic", color: C.green }}>
            Même entre vos sessions.
          </span>
        </div>
        <div
          style={{
            fontSize: 25,
            color: "rgba(239,243,210,.62)",
            marginTop: 28,
          }}
        >
          Gestion · recherche · alliances · PvE · PvP
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 500,
          left: 62,
          right: 62,
          height: width > 1080 ? 900 : 760,
          borderRadius: 34,
          overflow: "hidden",
          border: "2px solid rgba(207,232,155,.28)",
          boxShadow: "0 35px 100px rgba(0,0,0,.58)",
          transform: `translateX(${slide}px)`,
        }}
      >
        <Img
          src={staticFile(`assets/${images[selected]}`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 125,
          left: 62,
          right: 62,
          display: "flex",
          gap: 14,
        }}
      >
        {images.map((_, i) => (
          <div
            key={i}
            style={{
              height: 6,
              flex: 1,
              borderRadius: 8,
              background: i === selected ? C.green : "rgba(239,243,210,.16)",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const CTA = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 24], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.ink,
        opacity: interpolate(frame, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <LivingPlanet dark={0.7} />
      <Noise />
      <div
        style={{
          position: "absolute",
          inset: 64,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          transform: `scale(${enter})`,
        }}
      >
        <Brand />
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 86,
            lineHeight: 1.04,
            color: C.cream,
            marginTop: 70,
          }}
        >
          Faites germer
          <br />
          votre{" "}
          <span style={{ fontStyle: "italic", color: C.green }}>empire.</span>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "rgba(239,243,210,.72)",
            marginTop: 38,
          }}
        >
          Gratuit · Sur navigateur · Sans téléchargement
        </div>
        <div
          style={{
            marginTop: 64,
            padding: "28px 52px",
            borderRadius: 18,
            background: C.green,
            color: C.ink,
            fontSize: 34,
            fontWeight: 800,
            boxShadow: "0 0 50px rgba(155,209,123,.26)",
          }}
        >
          JOUER MAINTENANT
        </div>
        <div
          style={{
            fontSize: 31,
            color: C.cream,
            marginTop: 34,
            letterSpacing: 2,
          }}
        >
          arborisis.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ArborisisAd = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{ backgroundColor: C.ink, fontFamily: "Arial, sans-serif" }}
    >
      <Audio src={staticFile("assets/arborisis-ambient.m4a")} volume={0.9} />
      <Sequence durationInFrames={2.5 * fps} premountFor={fps}>
        <Hook />
      </Sequence>
      <Sequence from={2.3 * fps} durationInFrames={2.7 * fps} premountFor={fps}>
        <Cultivate />
      </Sequence>
      <Sequence from={4.8 * fps} durationInFrames={3.7 * fps} premountFor={fps}>
        <Pillars />
      </Sequence>
      <Sequence from={8.3 * fps} durationInFrames={3.9 * fps} premountFor={fps}>
        <Gameplay />
      </Sequence>
      <Sequence from={12 * fps} durationInFrames={3 * fps} premountFor={fps}>
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};

export const ArborisisPoster = () => (
  <AbsoluteFill
    style={{ backgroundColor: C.ink, fontFamily: "Arial, sans-serif" }}
  >
    <LivingPlanet dark={0.58} />
    <Noise />
    <div style={{ position: "absolute", top: 70, left: 62 }}>
      <Brand small />
    </div>
    <div style={{ position: "absolute", left: 62, right: 62, bottom: 92 }}>
      <div
        style={{
          fontSize: 24,
          color: C.green,
          textTransform: "uppercase",
          letterSpacing: 5,
          fontWeight: 700,
        }}
      >
        Stratégie spatiale organique
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 82,
          lineHeight: 1.02,
          color: C.cream,
          marginTop: 20,
        }}
      >
        Une galaxie ne se conquiert pas.
        <br />
        <span style={{ fontStyle: "italic", color: C.green }}>
          Elle se cultive.
        </span>
      </div>
      <div
        style={{ fontSize: 24, color: "rgba(239,243,210,.72)", marginTop: 34 }}
      >
        Gratuit · Sur navigateur · Sans téléchargement
      </div>
      <div
        style={{
          display: "inline-block",
          marginTop: 34,
          padding: "20px 34px",
          borderRadius: 14,
          background: C.green,
          color: C.ink,
          fontSize: 26,
          fontWeight: 800,
        }}
      >
        JOUER SUR ARBORISIS.COM
      </div>
    </div>
  </AbsoluteFill>
);
