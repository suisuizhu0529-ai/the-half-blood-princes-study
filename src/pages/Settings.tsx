import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Volume2, VolumeX, BookOpen, Eye, Music } from "lucide-react";
import Flourish from "@/components/decor/Flourish";
import LLMSettingsPanel from "@/components/settings/LLMSettingsPanel";
import { useEntered } from "@/hooks/useEntered";
import { useSettings } from "@/hooks/useSettings";

/* ------------------------------------------------------------------ */
/*  Toggle Switch (custom, no native checkbox)                        */
/* ------------------------------------------------------------------ */

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

function ToggleSwitch({ checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1">
        <label className="font-ui text-sm tracking-wide text-ink/80">{label}</label>
        {description && (
          <p className="mt-0.5 font-serif text-xs italic text-ink/50">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={
          "relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 " +
          (checked
            ? "bg-gradient-to-r from-gold to-ember shadow-gold-glow"
            : "bg-ink/20 shadow-inner")
        }
      >
        <span
          className={
            "inline-block h-6 w-6 transform rounded-full bg-parchment shadow-md transition-transform duration-300 " +
            (checked ? "translate-x-6" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Range Slider (custom styled)                                      */
/* ------------------------------------------------------------------ */

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  description?: string;
  onChange: (value: number) => void;
}

function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  description,
  onChange,
}: RangeSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="py-3">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <span className="font-ui text-sm tracking-wide text-ink/80">{label}</span>
          {description && (
            <p className="mt-0.5 font-serif text-xs italic text-ink/50">{description}</p>
          )}
        </div>
        <span className="font-ui text-xs tracking-wider text-gold-soft">
          {value.toFixed(step < 1 ? 1 : 0)}{unit}
        </span>
      </div>
      <div className="relative h-2 w-full">
        {/* Track background */}
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-ink/15" />
        {/* Track fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold to-ember"
          style={{ width: `${percentage}%` }}
        />
        {/* Thumb wrapper */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-y-0 left-0 right-0 z-10 w-full cursor-pointer appearance-none bg-transparent opacity-0"
          style={{ WebkitAppearance: "none" }}
        />
        {/* Visible thumb */}
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-gold bg-parchment shadow-md transition-[left] duration-150"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Card                                                      */
/* ------------------------------------------------------------------ */

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  titleZh: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, titleZh, children }: SectionCardProps) {
  return (
    <div className="rounded-sm border border-gold/40 bg-parchment-paper p-6 shadow-parchment-deep sm:p-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-gold-soft/70">{icon}</span>
        <div>
          <h2 className="font-display text-base tracking-widest text-ink/80 sm:text-lg">
            {title}
          </h2>
          <p className="font-zh text-[10px] tracking-[0.35em] text-ink/45">
            {titleZh}
          </p>
        </div>
      </div>
      <Flourish className="mb-4 h-2.5 w-44" variant="center" />
      <div className="divide-y divide-gold/20">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Settings Page                                                */
/* ------------------------------------------------------------------ */

export default function Settings() {
  const { entered } = useEntered();
  const { settings, setValue } = useSettings();

  // When voiceEnabled toggles off, dim the sliders
  const voiceActive = settings.voiceEnabled;

  return (
    <section className="container mx-auto min-h-screen px-6 pt-28 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={entered ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mx-auto max-w-xl"
      >
        {/* ---- Page Header ---- */}
        <div className="mb-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={entered ? { opacity: 0.7, scale: 1 } : { opacity: 0, scale: 0.85 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="mx-auto mb-4 w-fit"
          >
            <BookOpen size={22} strokeWidth={1.2} className="text-gold/60" />
          </motion.div>
          <h1 className="font-display text-3xl tracking-widest text-parchment sm:text-4xl">
            Prince&apos;s Settings
          </h1>
          <p className="mt-2 font-zh text-xs tracking-[0.4em] text-parchment/40">
            学 生 的 设 置
          </p>
          <Flourish className="mx-auto mt-5 h-3 w-48" variant="center" />
        </div>

        {/* ---- Section 1: Voice Settings ---- */}
        <div className="mb-6">
          <SectionCard
            icon={
              voiceActive ? (
                <Volume2 size={20} strokeWidth={1.5} />
              ) : (
                <VolumeX size={20} strokeWidth={1.5} />
              )
            }
            title="Voice Settings"
            titleZh="声 音 调 律"
          >
            <ToggleSwitch
              checked={settings.voiceEnabled}
              onChange={(v) => setValue("voiceEnabled", v)}
              label="Enable Voice"
              description={
                voiceActive
                  ? "朗读已开启"
                  : "关闭后将禁用所有语音功能"
              }
            />
            <RangeSlider
              label="Volume"
              value={settings.volume}
              min={0}
              max={100}
              step={1}
              unit="%"
              description="调整朗读音量大小"
              onChange={(v) => setValue("volume", v)}
            />
            <RangeSlider
              label="Speech Speed"
              value={settings.speechSpeed}
              min={0.5}
              max={2.0}
              step={0.1}
              description="语速范围 0.5x – 2.0x"
              onChange={(v) => setValue("speechSpeed", v)}
            />
          </SectionCard>
        </div>

        {/* ---- Section 2: Reading Settings ---- */}
        <div className="mb-6">
          <SectionCard
            icon={<BookOpen size={20} strokeWidth={1.5} />}
            title="Reading Settings"
            titleZh="阅 读 选 项"
          >
            <ToggleSwitch
              checked={settings.autoPlayVocabulary}
              onChange={(v) => setValue("autoPlayVocabulary", v)}
              label="Auto-play Vocabulary"
              description="进入词汇页时自动朗读"
            />
            <ToggleSwitch
              checked={settings.autoPlayQuote}
              onChange={(v) => setValue("autoPlayQuote", v)}
              label="Auto-play Quote"
              description="每日名言自动朗读"
            />
          </SectionCard>
        </div>

        {/* ---- Section 3: Visual Settings ---- */}
        <div className="mb-6">
          <SectionCard
            icon={<Eye size={20} strokeWidth={1.5} />}
            title="Visual Settings"
            titleZh="视 觉 设 置"
          >
            <ToggleSwitch
              checked={settings.reduceAnimation}
              onChange={(v) => setValue("reduceAnimation", v)}
              label="Reduce Animation"
              description="降低界面动画与过渡效果"
            />
          </SectionCard>
        </div>

        {/* ---- Section 4: Ambient Music (Phase 17.1-D) ---- */}
        <div className="mb-6">
          <SectionCard
            icon={<Music size={20} strokeWidth={1.5} />}
            title="Ambient Music"
            titleZh="氛 围 音 乐"
          >
            <ToggleSwitch
              checked={settings.musicEnabled}
              onChange={(v) => setValue("musicEnabled", v)}
              label="Enable Ambient Music"
              description={
                settings.musicEnabled
                  ? "低沉嗡鸣与远方钟声 · Snape 的地窖"
                  : "关闭后将停止所有氛围音乐"
              }
            />
            <RangeSlider
              label="Music Volume"
              value={settings.musicVolume}
              min={0}
              max={100}
              step={1}
              unit="%"
              description="调整氛围音乐音量"
              onChange={(v) => setValue("musicVolume", v)}
            />
          </SectionCard>
        </div>

        {/* ---- Section 5: LLM Settings (Phase 11) ---- */}
        <div className="mb-10">
          <LLMSettingsPanel />
        </div>

        {/* ---- Footer: Return to Study ---- */}
        <div className="pb-12 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-ui text-[11px] uppercase tracking-widest2 text-parchment/40 transition-colors hover:text-parchment"
          >
            <span className="h-px w-6 bg-parchment/30" />
            <ArrowLeft size={13} strokeWidth={1.6} />
            <span>Return to Study</span>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
