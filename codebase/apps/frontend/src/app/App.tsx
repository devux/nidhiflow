import { environment } from "../config/environment";
import "../styles/globals.css";

export function App() {
  return (
    <main className="foundation">
      <section aria-labelledby="foundation-title" className="foundation__card">
        <p className="foundation__eyebrow">Project foundation</p>
        <h1 id="foundation-title">NidhiFlow is ready to grow.</h1>
        <p>The frontend is running with strict TypeScript and validated configuration.</p>
        <p className="foundation__status">
          API endpoint: <code>{environment.NIDHIFLOW_API_BASE_URL}</code>
        </p>
      </section>
    </main>
  );
}
