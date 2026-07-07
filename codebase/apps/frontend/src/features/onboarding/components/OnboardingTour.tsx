import { useEffect, useRef, useState } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import { Brand } from "../../../shared/components/Brand";
import { Icon, type IconName } from "../../../shared/components/Icon";

import "./onboarding.css";

interface TourSlide {
  accent: string;
  description: string;
  features: Array<{ icon: IconName; label: string }>;
  icon: IconName;
  title: string;
}

const slides: TourSlide[] = [
  {
    accent: "Money at a glance",
    description:
      "See income, spending, recent activity, and your monthly picture together—without the spreadsheet feeling.",
    features: [
      { icon: "income", label: "Track income" },
      { icon: "expense", label: "Understand spending" },
      { icon: "report", label: "See clear reports" },
    ],
    icon: "chart",
    title: "Know where your money is going",
  },
  {
    accent: "Plan at your pace",
    description:
      "Build a monthly budget, set meaningful savings goals, and follow progress with simple visual cues.",
    features: [
      { icon: "plan", label: "Monthly budgets" },
      { icon: "goal", label: "Savings goals" },
      { icon: "sparkles", label: "Helpful tips" },
    ],
    icon: "goal",
    title: "Turn plans into steady progress",
  },
  {
    accent: "Better together",
    description:
      "Share one workspace with people you trust, keep collaborative changes visible, and track loans clearly.",
    features: [
      { icon: "user", label: "Shared workspace" },
      { icon: "activity", label: "Member activity" },
      { icon: "liability", label: "Loan progress" },
    ],
    icon: "user",
    title: "Manage shared finances with clarity",
  },
  {
    accent: "You stay in control",
    description:
      "Your financial data stays behind your account. Preferences follow you, and every important action remains yours.",
    features: [
      { icon: "shield", label: "Protected account" },
      { icon: "bell", label: "Useful alerts" },
      { icon: "check", label: "Explicit control" },
    ],
    icon: "shield",
    title: "A calmer, private place for money",
  },
];

export function OnboardingTour() {
  const { finishOnboarding } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const slide = slides[activeIndex] ?? slides[0];
  const isLastSlide = activeIndex === slides.length - 1;

  useEffect(() => {
    headingRef.current?.focus();
  }, [activeIndex]);

  async function finish(status: "completed" | "skipped") {
    setError("");
    setIsSaving(true);

    try {
      await finishOnboarding(status);
    } catch {
      setError("We couldn't save your choice. Check your connection and try again.");
      setIsSaving(false);
    }
  }

  return (
    <main className="onboarding-tour">
      <header className="onboarding-tour__header">
        <Brand />
        <button
          className="onboarding-tour__skip"
          disabled={isSaving}
          onClick={() => void finish("skipped")}
          type="button"
        >
          {isSaving ? "Saving…" : "Skip tour"}
        </button>
      </header>

      <section
        aria-describedby="onboarding-description"
        aria-labelledby="onboarding-title"
        className="onboarding-tour__card"
      >
        <div className={`onboarding-tour__visual onboarding-tour__visual--${activeIndex + 1}`}>
          <span aria-hidden="true" className="onboarding-tour__orb onboarding-tour__orb--one" />
          <span aria-hidden="true" className="onboarding-tour__orb onboarding-tour__orb--two" />
          <span className="onboarding-tour__hero-icon">
            <Icon name={slide.icon} size={48} />
          </span>
          <div className="onboarding-tour__feature-grid">
            {slide.features.map((feature) => (
              <span className="onboarding-tour__feature" key={feature.label}>
                <Icon name={feature.icon} size={20} />
                <span>{feature.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="onboarding-tour__copy">
          <span className="onboarding-tour__eyebrow">{slide.accent}</span>
          <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
            {slide.title}
          </h1>
          <p id="onboarding-description">{slide.description}</p>
        </div>

        <div
          aria-label={`Step ${activeIndex + 1} of ${slides.length}`}
          className="onboarding-tour__progress"
        >
          {slides.map((item, index) => (
            <button
              aria-label={`Go to step ${index + 1}: ${item.accent}`}
              aria-current={index === activeIndex ? "step" : undefined}
              className={index === activeIndex ? "is-active" : ""}
              disabled={isSaving}
              key={item.accent}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>

        {error ? (
          <p className="onboarding-tour__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="onboarding-tour__actions">
          {activeIndex > 0 ? (
            <button
              className="button button--secondary"
              disabled={isSaving}
              onClick={() => setActiveIndex((index) => index - 1)}
              type="button"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            className="button button--primary"
            disabled={isSaving}
            onClick={() =>
              isLastSlide
                ? void finish("completed")
                : setActiveIndex((index) => Math.min(index + 1, slides.length - 1))
            }
            type="button"
          >
            {isSaving ? "Saving…" : isLastSlide ? "Get started" : "Next"}
            {!isSaving ? <Icon name={isLastSlide ? "check" : "arrow"} size={19} /> : null}
          </button>
        </div>
      </section>
    </main>
  );
}
