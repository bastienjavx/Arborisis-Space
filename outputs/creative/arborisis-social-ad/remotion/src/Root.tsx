import "./index.css";
import { Composition, Still } from "remotion";
import { ArborisisAd, ArborisisPoster } from "./Composition";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Arborisis-Vertical-15s"
      component={ArborisisAd}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="Arborisis-Square-15s"
      component={ArborisisAd}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1080}
    />
    <Still
      id="Arborisis-Poster-Vertical"
      component={ArborisisPoster}
      width={1080}
      height={1350}
    />
    <Still
      id="Arborisis-Poster-Story"
      component={ArborisisPoster}
      width={1080}
      height={1920}
    />
    <Still
      id="Arborisis-Poster-Square"
      component={ArborisisPoster}
      width={1080}
      height={1080}
    />
  </>
);
