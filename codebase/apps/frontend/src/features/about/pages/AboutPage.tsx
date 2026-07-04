import { Link } from "react-router-dom";

import heroImage from "../../../assets/nidhiflow-about-hero.jpg";
import { Brand } from "../../../shared/components/Brand";
import { Icon, type IconName } from "../../../shared/components/Icon";
import "./about.css";

const capabilities: Array<{
  copy: string;
  icon: IconName;
  title: string;
}> = [
  {
    copy: "See income and spending together, with categories and recent activity that stay easy to scan.",
    icon: "activity",
    title: "Everyday money, organised",
  },
  {
    copy: "Set monthly category limits and understand what is spent, remaining, and worth adjusting.",
    icon: "plan",
    title: "Budgets with a clear pulse",
  },
  {
    copy: "Turn transactions into useful totals, trends, and category breakdowns—without spreadsheet work.",
    icon: "report",
    title: "Reports that tell the story",
  },
  {
    copy: "Create savings goals, add contributions, and follow progress without pressure or artificial urgency.",
    icon: "goal",
    title: "Goals you can grow into",
  },
  {
    copy: "Keep loans, credit cards, and other liabilities visible alongside the rest of your financial picture.",
    icon: "liability",
    title: "Liabilities in view",
  },
  {
    copy: "Invite people you trust, choose their permissions, and manage household finances in one shared space.",
    icon: "user",
    title: "Built to manage money together",
  },
];

const steps = [
  {
    copy: "Create your secure NidhiFlow account with your preferred currency and locale.",
    number: "01",
    title: "Create your account",
  },
  {
    copy: "Add income, expenses, accounts, budgets, goals, and liabilities as you need them.",
    number: "02",
    title: "Build your picture",
  },
  {
    copy: "Use reports and progress views to make your next money decision with more context.",
    number: "03",
    title: "Find your flow",
  },
];

export function AboutPage() {
  return (
    <div className="about-page">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="about-header">
        <Link aria-label="NidhiFlow home" className="about-header__brand" to="/">
          <Brand />
        </Link>
        <nav aria-label="About page navigation" className="about-header__nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
        </nav>
        <div className="about-header__actions">
          <Link className="about-link-button about-link-button--quiet" to="/login">
            Log in
          </Link>
          <Link className="about-link-button about-link-button--primary" to="/signup">
            Get started
          </Link>
        </div>
      </header>

      <main id="main-content">
        <section className="about-hero">
          <div className="about-hero__copy">
            <p className="about-kicker">Your money, your flow</p>
            <h1>Money clarity, made simple.</h1>
            <p className="about-hero__lede">
              Track daily finances, plan ahead, and understand the bigger picture—all in one calm,
              connected place.
            </p>
            <div className="about-hero__actions">
              <Link className="about-link-button about-link-button--primary" to="/signup">
                Create your account
                <Icon name="arrow" size={20} />
              </Link>
              <Link className="about-link-button about-link-button--outlined" to="/login">
                I already use NidhiFlow
              </Link>
            </div>
          </div>

          <div className="about-hero__visual">
            <img
              alt="A couple reviewing their household finances together"
              decoding="async"
              fetchPriority="high"
              src={heroImage}
            />
            <div aria-hidden="true" className="about-float-card about-float-card--budget">
              <span className="about-float-card__icon">
                <Icon name="plan" size={22} />
              </span>
              <span>
                <small>Monthly plan</small>
                <strong>Right on track</strong>
              </span>
              <span className="about-mini-progress">
                <i />
              </span>
            </div>
            <div aria-hidden="true" className="about-float-card about-float-card--goal">
              <span className="about-float-card__icon">
                <Icon name="goal" size={22} />
              </span>
              <span>
                <small>Goal progress</small>
                <strong>72%</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="about-intro" id="features">
          <p className="about-kicker">Made for real financial life</p>
          <h2>One place for today’s spending and tomorrow’s plans.</h2>
          <p>
            NidhiFlow brings the essentials together, so your financial picture feels useful instead
            of overwhelming.
          </p>
        </section>

        <section aria-labelledby="overview-title" className="about-story">
          <div className="about-story__visual about-story__visual--mint">
            <div aria-hidden="true" className="about-phone">
              <div className="about-phone__speaker" />
              <div className="about-phone__header">
                <span>Good morning</span>
                <span className="about-phone__avatar">N</span>
              </div>
              <div className="about-phone__balance">
                <small>This month</small>
                <strong>₹48,320</strong>
                <span>Income and expenses in one view</span>
              </div>
              <div className="about-phone__actions">
                <span>
                  <Icon name="income" size={18} /> Income
                </span>
                <span>
                  <Icon name="expense" size={18} /> Expense
                </span>
              </div>
              <div className="about-phone__list">
                <strong>Recent activity</strong>
                <span>
                  <i className="about-dot about-dot--food" />
                  Groceries <b>− ₹1,240</b>
                </span>
                <span>
                  <i className="about-dot about-dot--income" />
                  Freelance <b>+ ₹12,000</b>
                </span>
                <span>
                  <i className="about-dot about-dot--travel" />
                  Transport <b>− ₹680</b>
                </span>
              </div>
            </div>
          </div>
          <div className="about-story__copy">
            <span className="about-story__icon">
              <Icon name="activity" size={28} />
            </span>
            <p className="about-kicker">Stay current</p>
            <h2 id="overview-title">See where your money is going.</h2>
            <p>
              Record income and expenses, keep accounts organised, and review recent activity
              without digging through disconnected tools.
            </p>
            <ul className="about-check-list">
              <li>
                <Icon name="check" size={18} /> Clear income and expense categories
              </li>
              <li>
                <Icon name="check" size={18} /> Searchable transaction history
              </li>
              <li>
                <Icon name="check" size={18} /> Currency-aware totals
              </li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="planning-title" className="about-story about-story--reverse">
          <div className="about-story__visual about-story__visual--blue">
            <div aria-hidden="true" className="about-phone about-phone--reports">
              <div className="about-phone__speaker" />
              <p>Spending report</p>
              <strong>July overview</strong>
              <div className="about-chart">
                <i style={{ height: "48%" }} />
                <i style={{ height: "68%" }} />
                <i style={{ height: "43%" }} />
                <i style={{ height: "86%" }} />
                <i style={{ height: "62%" }} />
                <i style={{ height: "74%" }} />
              </div>
              <div className="about-report-row">
                <span>
                  <i className="about-dot about-dot--food" /> Food
                </span>
                <strong>32%</strong>
              </div>
              <div className="about-report-row">
                <span>
                  <i className="about-dot about-dot--travel" /> Travel
                </span>
                <strong>21%</strong>
              </div>
              <div className="about-report-row">
                <span>
                  <i className="about-dot about-dot--income" /> Home
                </span>
                <strong>18%</strong>
              </div>
            </div>
          </div>
          <div className="about-story__copy">
            <span className="about-story__icon">
              <Icon name="report" size={28} />
            </span>
            <p className="about-kicker">Plan with context</p>
            <h2 id="planning-title">Make every month easier to understand.</h2>
            <p>
              Create category budgets, compare plans with actual spending, and use visual reports to
              spot patterns while they are still useful.
            </p>
            <Link className="about-text-link" to="/signup">
              Start planning
              <Icon name="arrow" size={18} />
            </Link>
          </div>
        </section>

        <section aria-label="NidhiFlow capabilities" className="about-capabilities">
          {capabilities.map((capability) => (
            <article className="about-capability" key={capability.title}>
              <span className="about-capability__icon">
                <Icon name={capability.icon} size={26} />
              </span>
              <h3>{capability.title}</h3>
              <p>{capability.copy}</p>
            </article>
          ))}
        </section>

        <section aria-labelledby="together-title" className="about-together">
          <div className="about-together__copy">
            <p className="about-kicker">Shared Space</p>
            <h2 id="together-title">Household money works better together.</h2>
            <p>
              Invite family or trusted collaborators into one workspace, with clear roles and
              permissions for the information you manage together.
            </p>
            <Link className="about-link-button about-link-button--light" to="/signup">
              Create a shared space
            </Link>
          </div>
          <div aria-hidden="true" className="about-together__art">
            <span className="about-orbit about-orbit--one" />
            <span className="about-orbit about-orbit--two" />
            <span className="about-person about-person--one">A</span>
            <span className="about-person about-person--two">R</span>
            <span className="about-person about-person--three">M</span>
            <div className="about-shared-card">
              <Icon name="user" size={24} />
              <span>
                <small>Shared Space</small>
                <strong>Home finances</strong>
              </span>
              <Icon name="check" size={22} />
            </div>
          </div>
        </section>

        <section className="about-steps" id="how-it-works">
          <div className="about-steps__heading">
            <p className="about-kicker">Getting started</p>
            <h2>From sign-up to useful insight in three simple steps.</h2>
          </div>
          <div className="about-steps__grid">
            {steps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="security-title" className="about-security" id="security">
          <div className="about-security__mark">
            <Icon name="shield" size={48} />
          </div>
          <div>
            <p className="about-kicker">Privacy and security by design</p>
            <h2 id="security-title">Your financial life deserves careful boundaries.</h2>
            <p>
              Account authentication, workspace ownership checks, explicit permissions, and
              validated financial records help keep access controlled and changes accountable.
            </p>
          </div>
          <ul>
            <li>
              <Icon name="lock" size={20} /> Protected account access
            </li>
            <li>
              <Icon name="user" size={20} /> Workspace roles and permissions
            </li>
            <li>
              <Icon name="check" size={20} /> Auditable financial changes
            </li>
          </ul>
        </section>

        <section className="about-final-cta">
          <span className="about-final-cta__leaf" aria-hidden="true">
            <Icon name="sparkles" size={38} />
          </span>
          <p className="about-kicker">Ready when you are</p>
          <h2>Bring your money into focus.</h2>
          <p>Create an account and start building a financial picture that moves with you.</p>
          <div className="about-hero__actions">
            <Link className="about-link-button about-link-button--primary" to="/signup">
              Get started
              <Icon name="arrow" size={20} />
            </Link>
            <Link className="about-link-button about-link-button--outlined" to="/login">
              Log in
            </Link>
          </div>
        </section>
      </main>

      <footer className="about-footer">
        <div>
          <Brand />
          <p>Clearer personal and household finances, one decision at a time.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
          <Link to="/login">Log in</Link>
        </nav>
        <small>© {new Date().getFullYear()} NidhiFlow. Your Money, Your Flow.</small>
      </footer>
    </div>
  );
}
