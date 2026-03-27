import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Variants } from "framer-motion";

import {
  ArrowRight,
  Github,
  PlayCircle,
  Sparkles,
  MapPin,
  Radar,
  Calendar,
  ShieldCheck,
  Zap,
  Cpu,
  Check,
} from "lucide-react";

import logo from "./assets/boilerpark-logo.png";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.6, ease: [0.21, 1, 0.21, 1] },
  }),
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function Pill({ children }: { children: ReactNode }) {  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur">
      {children}
    </span>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  desc?: string;
}

function SectionHeading({ eyebrow, title, desc }: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? (
        <div className="mb-3 flex items-center justify-center gap-2 text-xs text-white/70">
          <span className="h-px w-10 bg-white/10" />
          <span className="tracking-wider uppercase">{eyebrow}</span>
          <span className="h-px w-10 bg-white/10" />
        </div>
      ) : null}
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      {desc ? (
        <p className="mt-3 text-pretty text-sm leading-6 text-white/70 sm:text-base">
          {desc}
        </p>
      ) : null}
    </div>
  );
}

interface GlowCardProps {
  className?: string;
  children: ReactNode;
}

function GlowCard({ className, children }: GlowCardProps) {  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:opacity-0 before:transition-opacity before:duration-500",
        "before:bg-[radial-gradient(650px_circle_at_var(--mx,50%)_var(--my,50%),rgba(255,214,10,0.18),transparent_40%)]",
        "hover:before:opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}

function useCardGlow() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${mx}%`);
      el.style.setProperty("--my", `${my}%`);
    };

    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  return ref;
}

function Background() {
  // pointer-following spotlight
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 80, damping: 18, mass: 0.25 });
  const sy = useSpring(y, { stiffness: 80, damping: 18, mass: 0.25 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  const spotlight = useTransform([sx, sy], ([px, py]) => {
    return `radial-gradient(700px circle at ${px}px ${py}px, rgba(255, 214, 10, 0.12), transparent 45%)`;
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070708]" />
      <div className="absolute inset-0 opacity-80 [background:radial-gradient(1200px_circle_at_20%_10%,rgba(255,214,10,0.10),transparent_55%),radial-gradient(1000px_circle_at_80%_35%,rgba(120,119,198,0.10),transparent_55%),radial-gradient(900px_circle_at_40%_80%,rgba(34,211,238,0.08),transparent_55%)]" />
      <motion.div className="absolute inset-0" style={{ backgroundImage: spotlight }} />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_72%)] [background:linear-gradient(to_bottom,transparent,rgba(0,0,0,0.75))]" />
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-white/60">{label}</div>
    </div>
  );
}

interface FeatureProps {
  icon: LucideIcon;
  title: string;
  desc: string;
}

function Feature({ icon: Icon, title, desc }: FeatureProps) {

  const ref = useCardGlow();
  return (
    <div ref={ref}>
      <GlowCard className="h-full">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
            <Icon className="h-5 w-5 text-[#ffd60a]" />
          </div>
          <div>
            <div className="font-medium text-white">{title}</div>
            <div className="mt-1 text-sm leading-6 text-white/70">{desc}</div>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}

function FakeScreenshot({ title }: { title: string }) {  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <div className="ml-2 text-xs text-white/60">{title}</div>
      </div>
      <div className="p-5">
        <div className="grid gap-3">
          <div className="h-7 w-44 rounded-lg bg-white/[0.06]" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-20 rounded-xl bg-white/[0.05]" />
            <div className="h-20 rounded-xl bg-white/[0.05]" />
            <div className="h-20 rounded-xl bg-white/[0.05]" />
          </div>
          <div className="h-32 rounded-2xl bg-[radial-gradient(600px_circle_at_30%_20%,rgba(255,214,10,0.20),transparent_45%),radial-gradient(600px_circle_at_70%_80%,rgba(34,211,238,0.18),transparent_45%)]" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 rounded-xl bg-white/[0.05]" />
            <div className="h-12 rounded-xl bg-white/[0.05]" />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100 [background:radial-gradient(800px_circle_at_50%_0%,rgba(255,214,10,0.12),transparent_55%)]" />
    </div>
  );
}

interface FAQItemProps {
  q: string;
  a: string;
}

function FAQItem({ q, a }: FAQItemProps) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left"
      type="button"
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition hover:bg-white/[0.05]">
        <div className="flex items-center justify-between gap-4">
          <div className="font-medium text-white">{q}</div>
          <div className="text-white/70">{open ? "−" : "+"}</div>
        </div>
        {open ? <div className="mt-3 text-sm leading-6 text-white/70">{a}</div> : null}
      </div>
    </button>
  );
}

export default function App() {
  const nav = useMemo(
    () => [
      { label: "Overview", href: "#overview" },
      { label: "Highlights", href: "#highlights" },
      { label: "How it works", href: "#how" },
      { label: "FAQ", href: "#faq" },
    ],
    []
  );

  return (
    <div className="relative min-h-screen text-white">
      <Background />

      {/* Top Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="BoilerPark logo"
              className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.03] p-1"
              draggable={false}
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold">BoilerPark</div>
              <div className="text-[11px] text-white/60">Real time parking intelligence</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 sm:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-white/70 transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#"
              className="hidden rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.06] sm:inline-flex"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </a>
            <a
              href="#cta"
              className="inline-flex items-center justify-center rounded-xl bg-[#ffd60a] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-95"
            >
              Request demo <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative">
        <section id="overview" className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid items-center gap-10 lg:grid-cols-2"
          >
            <div>
              <motion.div variants={fadeUp} custom={0} className="flex flex-wrap gap-2">
                <Pill>
                  <Sparkles className="h-3.5 w-3.5 text-[#ffd60a]" />
                  Vite + React landing
                </Pill>
                <Pill>
                  <Zap className="h-3.5 w-3.5 text-[#ffd60a]" />
                  Smooth UI animations
                </Pill>
                <Pill>
                  <ShieldCheck className="h-3.5 w-3.5 text-[#ffd60a]" />
                  Polished, responsive layout
                </Pill>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                custom={1}
                className="mt-6 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl"
              >
                Parking decisions in seconds, not stress.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="mt-4 text-pretty text-base leading-7 text-white/70"
              >
                BoilerPark is a modern campus parking experience concept. It turns noisy signals into
                clear availability, so commuters can pick the best garage fast. This page is a UI
                showcase with clean visuals, motion, and structure.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#cta"
                  className="inline-flex items-center justify-center rounded-xl bg-[#ffd60a] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-95"
                >
                  Get a demo <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
                >
                  <PlayCircle className="mr-2 h-4 w-4 text-[#ffd60a]" />
                  Watch preview
                </a>
              </motion.div>

              <motion.div
                variants={fadeUp}
                custom={4}
                className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
              >
                <Stat label="Update cadence" value="~5s" />
                <Stat label="Coverage" value="Multi garage" />
                <Stat label="Latency goal" value="< 1s" />
                <Stat label="Design focus" value="Clarity" />
              </motion.div>
            </div>

            <motion.div variants={fadeUp} custom={2} className="relative">
              <div className="absolute -inset-6 -z-10 opacity-60 blur-2xl [background:radial-gradient(700px_circle_at_30%_30%,rgba(255,214,10,0.22),transparent_55%)]" />

              <div className="grid gap-4">
                <FakeScreenshot title="Garage overview" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FakeScreenshot title="Live status" />
                  <FakeScreenshot title="Calendar aware hints" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Highlights */}
        <section id="highlights" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6 sm:mt-24">
          <SectionHeading
            eyebrow="Highlights"
            title="A landing page that feels like a real product"
            desc="High-contrast layout, glass surfaces, hover glow, scroll reveals, and a background spotlight that tracks the pointer."
          />

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={container}
            className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Feature
                icon={Radar}
                title="Real time clarity"
                desc="Present availability as a simple confidence driven signal with minimal cognitive load."
              />
            </motion.div>
            <motion.div variants={fadeUp} custom={1}>
              <Feature
                icon={MapPin}
                title="Decision first design"
                desc="Prioritize the next best action: where to go, when to leave, and what to expect."
              />
            </motion.div>
            <motion.div variants={fadeUp} custom={2}>
              <Feature
                icon={Calendar}
                title="Schedule aware"
                desc="Surface context from the user’s day so parking becomes a background detail."
              />
            </motion.div>
            <motion.div variants={fadeUp} custom={3}>
              <Feature
                icon={Cpu}
                title="System mindset"
                desc="A coherent story from sensing to ingestion to UI, even if the page is only a mock."
              />
            </motion.div>
            <motion.div variants={fadeUp} custom={4}>
              <Feature
                icon={Zap}
                title="Motion with restraint"
                desc="Animations guide attention, not distract. Everything stays snappy and readable."
              />
            </motion.div>
            <motion.div variants={fadeUp} custom={5}>
              <Feature
                icon={ShieldCheck}
                title="Accessible contrast"
                desc="Large type, strong hierarchy, and clear focus states for keyboard and screen readers."
              />
            </motion.div>
          </motion.div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6 sm:mt-24">
          <SectionHeading
            eyebrow="How it works"
            title="From signal to parking decision"
            desc="Generic architecture narrative, written to sound plausible without committing to specifics."
          />

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={container}
            className="mt-10 grid gap-4 lg:grid-cols-3"
          >
            {[
              {
                step: "01",
                title: "Sense",
                desc: "Cameras or sensors emit raw signals. We convert them into occupancy features and confidence.",
              },
              {
                step: "02",
                title: "Process",
                desc: "A backend pipeline aggregates updates, smooths noise, and publishes a live status feed.",
              },
              {
                step: "03",
                title: "Deliver",
                desc: "The app renders a clean decision layer: best garage, expected availability, and timing.",
              },
            ].map((s, i) => (
              <motion.div key={s.step} variants={fadeUp} custom={i}>
                <StepCard {...s} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CTA */}
        <section id="cta" className="mx-auto mt-16 max-w-6xl px-4 pb-16 sm:px-6 sm:mt-24 sm:pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur sm:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(900px_circle_at_20%_20%,rgba(255,214,10,0.20),transparent_55%),radial-gradient(800px_circle_at_80%_60%,rgba(34,211,238,0.14),transparent_55%)]" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
                  <Check className="h-3.5 w-3.5 text-[#ffd60a]" />
                  Ready for your real copy and screenshots
                </div>
                <h3 className="mt-4 text-balance text-3xl font-semibold text-white">
                  Want this page tailored to the actual BoilerPark features?
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  Send tagline, feature bullets, and 2 to 5 screenshots. I will swap the placeholders,
                  refine the layout, and tune animations around your real content.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href="#"
                  className="inline-flex items-center justify-center rounded-xl bg-[#ffd60a] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-95"
                >
                  Share assets <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <a
                  href="#faq"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
                >
                  See FAQ
                </a>
                <div className="mt-2 text-center text-xs text-white/55">
                  Replace placeholder links with real URLs when ready.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <SectionHeading
            eyebrow="FAQ"
            title="Common questions"
            desc="This is placeholder copy. Replace with your project’s real constraints and goals."
          />

          <div className="mx-auto mt-10 grid max-w-3xl gap-3">
            <FAQItem
              q="Is this production ready?"
              a="The layout and component structure are production friendly, but the content is placeholder. Swap in real copy, images, and links."
            />
            <FAQItem
              q="Can you make it match Purdue branding?"
              a="Yes. Keep the gold and black, or provide a palette. If you have a Figma file, I can mirror spacing and typography."
            />
            <FAQItem
              q="Can you add more animation?"
              a="Yes, but keep it purposeful. Good options are scroll reveals, subtle parallax, and micro-interactions on cards and buttons."
            />
            <FAQItem
              q="What should I send next to customize it?"
              a="Tagline, 5 feature bullets, 3-step how it works, and 2 to 5 screenshots. If you have a logo SVG, even better."
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-black/30">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="BoilerPark"
                className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.03] p-1"
                draggable={false}
              />
              <div>
                <div className="text-sm font-semibold">BoilerPark</div>
                <div className="text-xs text-white/60">UI landing page mock</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
              <a className="transition hover:text-white" href="#overview">
                Back to top
              </a>
              <span className="text-white/30">•</span>
              <a className="transition hover:text-white" href="#">
                Contact
              </a>
              <span className="text-white/30">•</span>
              <a className="transition hover:text-white" href="#">
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

interface StepCardProps {
  step: string;
  title: string;
  desc: string;
}

function StepCard({ step, title, desc }: StepCardProps) {
  const ref = useCardGlow();
  return (
    <div ref={ref}>
      <GlowCard className="h-full">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-white/60">STEP {step}</div>
            <div className="mt-2 text-lg font-semibold text-white">{title}</div>
            <div className="mt-2 text-sm leading-6 text-white/70">{desc}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-[#ffd60a]">
            {step}
          </div>
        </div>
      </GlowCard>
    </div>
  );
}