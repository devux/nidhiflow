import { Brand } from "../../../shared/components/Brand";

import "./onboarding.css";

export function SplashScreen() {
  return (
    <main aria-busy="true" className="splash-screen">
      <div className="splash-screen__content">
        <span aria-hidden="true" className="splash-screen__glow" />
        <Brand />
        <div aria-live="polite" className="splash-screen__status" role="status">
          <span aria-hidden="true" className="splash-screen__loader" />
          <span>Preparing your finances</span>
        </div>
      </div>
    </main>
  );
}
