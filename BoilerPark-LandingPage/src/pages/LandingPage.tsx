import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  MapPinned,
  Radar,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import logo from "../assets/boilerpark-logo.png";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

const featureCards = [
  {
    icon: Radar,
    title: "Live Spot Awareness",
    description:
      "Monitor active availability from Purdue parking lots in one clean dashboard.",
  },
  {
    icon: MapPinned,
    title: "Decision-First Layout",
    description:
      "Design emphasizes the one thing users need first: where space is available right now.",
  },
  {
    icon: CalendarClock,
    title: "Schedule-Aware Parking",
    description:
      "BoilerPark pairs parking data with student routines so commutes stay predictable.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bp-bg)] text-[var(--bp-text)]">
      <div className="bp-mesh pointer-events-none absolute inset-0" />

      <header className="sticky top-0 z-30 border-b border-[var(--bp-border)] bg-[color-mix(in_oklab,var(--bp-bg-elevated)_82%,black_18%)]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="BoilerPark"
              className="h-10 w-10 rounded-xl border border-[var(--bp-border)] bg-[var(--bp-surface)] p-1"
              draggable={false}
            />
            <div>
              <div className="bp-heading text-sm font-semibold">BoilerPark</div>
              <div className="text-xs text-[var(--bp-text-soft)]">Purdue Parking Intelligence</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/forecast"
              className="rounded-xl border border-[var(--bp-border)] bg-[var(--bp-surface)] px-4 py-2 text-sm font-semibold text-[var(--bp-text)] transition hover:border-[var(--bp-accent)] hover:text-[var(--bp-accent)]"
            >
              Forecast
            </Link>
            <Link
              to="/dashboard"
              className="rounded-xl border border-[var(--bp-border)] bg-[var(--bp-surface)] px-4 py-2 text-sm font-semibold text-[var(--bp-text)] transition hover:border-[var(--bp-accent)] hover:text-[var(--bp-accent)]"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--bp-border)] bg-[var(--bp-surface)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--bp-accent)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Web Experience
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="bp-heading mt-6 text-4xl font-semibold leading-[1.05] text-[var(--bp-text)] sm:text-5xl"
            >
              Parking decisions should take seconds, not stress.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-xl text-base leading-7 text-[var(--bp-text-muted)]"
            >
              BoilerPark now includes a functional web dashboard built for speed and clarity.
              Open the dashboard to view current availability counts across Purdue garages and
              lots in real time.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-xl bg-[var(--bp-accent)] px-5 py-3 text-sm font-semibold text-[var(--bp-accent-ink)] transition hover:brightness-105"
              >
                Open Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>

              <a
                href="#highlights"
                className="inline-flex items-center rounded-xl border border-[var(--bp-border)] bg-[var(--bp-surface)] px-5 py-3 text-sm font-semibold text-[var(--bp-text)] transition hover:border-[var(--bp-accent)]"
              >
                See Highlights
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              <div className="bp-stat">
                <div className="bp-heading text-2xl font-semibold">28</div>
                <p className="text-xs text-[var(--bp-text-soft)]">Tracked lots</p>
              </div>
              <div className="bp-stat">
                <div className="bp-heading text-2xl font-semibold">Live</div>
                <p className="text-xs text-[var(--bp-text-soft)]">Availability feed</p>
              </div>
              <div className="bp-stat">
                <div className="bp-heading text-2xl font-semibold">Fast</div>
                <p className="text-xs text-[var(--bp-text-soft)]">Dashboard routing</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="pointer-events-none absolute -inset-6 rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(207,185,145,0.35),transparent_55%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-[var(--bp-border)] bg-[var(--bp-surface)] p-6 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bp-accent)]">
                Dashboard Preview
              </p>
              <h2 className="bp-heading mt-3 text-2xl font-semibold">Current Purdue Availability</h2>
              <div className="mt-6 space-y-3">
                <div className="bp-preview-row">
                  <span>Grant Street Garage</span>
                  <strong>42 spots</strong>
                </div>
                <div className="bp-preview-row">
                  <span>University Street Garage</span>
                  <strong>18 spots</strong>
                </div>
                <div className="bp-preview-row">
                  <span>Lot A</span>
                  <strong>71 spots</strong>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-[var(--bp-border)] bg-[color-mix(in_oklab,var(--bp-accent)_22%,transparent)] px-4 py-3 text-sm text-[var(--bp-text)]">
                Data updates continuously and can also be refreshed manually from the dashboard.
              </div>
            </div>
          </motion.div>
        </section>

        <section id="about" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.div variants={fadeUp} className="mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bp-accent)]">
                About Us
              </p>
              <h3 className="bp-heading mt-3 text-3xl font-semibold">
                Built by Purdue students, for Purdue students
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-7 text-(--bp-text-muted)">
                Anyone who has driven to Purdue knows the frustration — circling lots, guessing
                which garage has space, and arriving late because the current parking system gives
                you no real information. We decided to fix that. BoilerPark started as a class
                project between students who were tired of the guessing game, and grew into a
                full team committed to making every campus commute a little less stressful.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {[
                  { name: "Utkarsh Majithia",    linkedin: "https://www.linkedin.com/in/utkarsh-majithia-a37392195/" },
                  { name: "Neel Vachhani",        linkedin: "https://www.linkedin.com/in/neel-vachhani/" },
                  { name: "Pranay Nandkeolyar",   linkedin: "https://www.linkedin.com/in/pranay-nandkeolyar/" },
                  { name: "Anthony McCrovitz",    linkedin: "https://www.linkedin.com/in/amccrovitz20/" },
                  { name: "Logan Portscheller",   linkedin: "https://www.linkedin.com/in/logan-portscheller/" },
                  { name: "George Samra",         linkedin: "https://www.linkedin.com/in/georgesamra/" },
                  { name: "Roohee Urs",           linkedin: "https://www.linkedin.com/in/roohee-u-2090b9279/" },
                  { name: "Sparsh Sumani",        linkedin: "https://www.linkedin.com/in/sparshsumani/" },
                ].map(({ name, linkedin }) => (
                  <a
                    key={name}
                    href={linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-(--bp-border) bg-(--bp-surface) px-4 py-3 transition hover:border-(--bp-accent) hover:bg-[color-mix(in_oklab,var(--bp-accent)_6%,var(--bp-surface))]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--bp-border) bg-(--bp-bg-elevated) text-xs font-semibold text-(--bp-text-soft)">
                      {name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="text-sm font-medium text-(--bp-text)">{name}</span>
                  </a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section id="highlights" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--bp-accent)">
              Highlights
            </p>
            <h3 className="bp-heading mt-3 text-3xl font-semibold">Designed for quick campus decisions</h3>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid gap-4 md:grid-cols-3"
          >
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  variants={fadeUp}
                  className="rounded-2xl border border-(--bp-border) bg-(--bp-surface) p-5"
                >
                  <div className="inline-flex rounded-xl border border-(--bp-border) bg-(--bp-bg-elevated) p-2 text-(--bp-accent)">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="bp-heading mt-4 text-xl font-semibold">{feature.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-(--bp-text-muted)">
                    {feature.description}
                  </p>
                </motion.article>
              );
            })}
          </motion.div>

          <div className="mt-12 rounded-3xl border border-(--bp-border) bg-(--bp-surface) p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--bp-accent)">
                  Ready Now
                </p>
                <h4 className="bp-heading mt-2 text-2xl font-semibold">Go directly to availability</h4>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-(--bp-accent) px-5 py-3 text-sm font-semibold text-(--bp-accent-ink) transition hover:brightness-105"
              >
                <Zap className="h-4 w-4" />
                Launch Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
