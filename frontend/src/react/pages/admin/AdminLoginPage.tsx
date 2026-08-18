import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LogIn,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  ShieldAlert,
  Sparkles,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { TurnstileWidget } from "@/components/shared/TurnstileWidget";
import { apiFetch } from "@/lib/api";
import { Analytics } from "@/lib/analytics";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Format email tidak valid",
    }),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

type LoginForm = z.infer<typeof loginSchema>;

const getCurrentTime = () => Date.now();

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const turnstileSiteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Handle lockout countdown timer
  useEffect(() => {
    if (!lockoutTime) return;
    const timer = setInterval(() => {
      const currentTime = getCurrentTime();
      const remaining = Math.ceil((lockoutTime - currentTime) / 1000);
      if (remaining <= 0) {
        setLockoutTime(null);
        setFailedAttempts(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTime]);

  const onSubmit = async (data: LoginForm) => {
    if (lockoutTime && getCurrentTime() < lockoutTime) {
      const remainingSec = Math.ceil((lockoutTime - getCurrentTime()) / 1000);
      toast.error(
        `Terlalu banyak percobaan gagal. Silakan tunggu ${remainingSec} detik.`
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...data,
        ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      };
      const res = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.access_token) {
        localStorage.setItem("token", res.access_token);
        localStorage.setItem("just_logged_in", "true");
        Analytics.adminLogin("success", data.email);
        toast.success("Login Berhasil!", {
          description: "Membuka Dashboard Administrator...",
        });
        window.location.href = "/admin";
      }
    } catch (err: unknown) {
      Analytics.adminLogin("failed", data.email);
      setFailedAttempts((prev) => {
        const next = prev + 1;
        if (next >= 5) {
          setLockoutTime(getCurrentTime() + 60000);
        }
        return next;
      });
      const message =
        err instanceof Error ? err.message : "Email atau password tidak sesuai";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* ========================================================================= */}
      {/* KIRI: Animated Branding & Atmosphere Panel (Desktop Only)                  */}
      {/* ========================================================================= */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-12 lg:flex border-r border-emerald-800/30">
        {/* Glow Effects & Grid Pattern Background */}
        <div className="absolute -left-28 -top-28 size-[520px] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute -right-28 -bottom-28 size-[520px] rounded-full bg-teal-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#05966910_1px,transparent_1px),linear-gradient(to_bottom,#05966910_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Top Header Brand Identity */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-13 items-center justify-center rounded-2xl bg-white/10 p-2.5 shadow-xl backdrop-blur-md border border-white/20 ring-1 ring-white/10">
              <Image
                src="/arus.webp"
                alt="Logo SI-ARUS"
                width={44}
                height={44}
                priority
                className="object-contain filter drop-shadow"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-wide">
                  SI-ARUS
                </h2>
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                  v2.0
                </span>
              </div>
              <p className="text-xs font-medium text-emerald-200/80 mt-0.5">
                Kemenag Kab. Barito Utara
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-200 backdrop-blur-md border border-white/15">
            <Sparkles className="size-3.5 text-amber-400" />
            Portal Administrator
          </div>
        </div>

        {/* Hero Copy & Visual Highlighting */}
        <div className="relative z-10 my-auto py-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 border border-emerald-500/20 mb-5 backdrop-blur-xs">
              <CheckCircle2 className="size-4 text-emerald-400" />
              Sistem Analisis & Rekapitulasi Survei PTSP
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl leading-[1.18]">
              Pusat Kendali & <br />
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                Analitik Pelayanan
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-emerald-100/75">
              Monitoring indeks kepuasan masyarakat (IPKP & IPAK), rekapitulasi data layanan publik, dan cetak laporan evaluasi berkala secara real-time dan terintegrasi.
            </p>
          </motion.div>
        </div>

        {/* Bottom Highlights */}
        <div className="relative z-10 grid grid-cols-2 gap-3.5 border-t border-white/10 pt-6">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3.5 backdrop-blur-md border border-white/10 shadow-sm">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Akses Terenkripsi</p>
              <p className="text-[10px] font-medium text-emerald-200/70">
                JWT & Argon2id Protocol
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3.5 backdrop-blur-md border border-white/10 shadow-sm">
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Analisis Instan</p>
              <p className="text-[10px] font-medium text-emerald-200/70">
                PermenPAN-RB No. 14/2017
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KANAN: Clean Minimalist Login Form Card                                  */}
      {/* ========================================================================= */}
      <div className="flex w-full flex-col justify-center bg-slate-50 px-6 py-12 lg:w-1/2 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[480px]">
          {/* Top Navigation */}
          <div className="mb-7">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors py-2 px-3.5 rounded-xl hover:bg-slate-200/60 cursor-pointer group"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
              Kembali ke Beranda
            </Link>
          </div>

          {/* Form Card Container */}
          <div className="rounded-3xl bg-white p-8 sm:p-10 shadow-xl shadow-slate-200/60 border border-slate-200/80">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Masuk Administrator
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Field: Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-slate-800"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@kemenag.go.id"
                    autoComplete="email"
                    disabled={loading || Boolean(lockoutTime)}
                    className="pl-11.5 h-12.5 sm:h-13 rounded-2xl border-slate-200 bg-slate-50/60 text-sm sm:text-base shadow-2xs focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 font-medium transition-all"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs sm:text-sm font-medium text-rose-500 pl-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Field: Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold text-slate-800"
                >
                  Kata Sandi
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    disabled={loading || Boolean(lockoutTime)}
                    className="pl-11.5 pr-12 h-12.5 sm:h-13 rounded-2xl border-slate-200 bg-slate-50/60 text-sm sm:text-base shadow-2xs focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 font-medium transition-all"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4.5" />
                    ) : (
                      <Eye className="size-4.5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs sm:text-sm font-medium text-rose-500 pl-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Cloudflare Turnstile Security Widget */}
              {turnstileSiteKey && (
                <div className="flex items-center justify-center min-h-[65px] my-1">
                  <TurnstileWidget
                    siteKey={turnstileSiteKey}
                    onSuccess={(token: string) => setTurnstileToken(token)}
                    onError={() =>
                      console.warn("[Turnstile] Local fallback active")
                    }
                  />
                </div>
              )}

              {failedAttempts > 0 && failedAttempts < 5 && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 p-3 text-xs sm:text-sm font-semibold text-amber-700 border border-amber-200">
                  <ShieldAlert className="size-4.5 text-amber-600 shrink-0" />
                  <span>
                    Percobaan gagal: {failedAttempts} dari 5 kesempatan.
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12.5 sm:h-13 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm sm:text-base font-bold text-white hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-md shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-75 cursor-pointer pt-0.5"
                disabled={loading || Boolean(lockoutTime)}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-5 animate-spin mr-2" />
                    Memverifikasi...
                  </>
                ) : lockoutTime ? (
                  `Terkunci Sementara`
                ) : (
                  <>
                    <LogIn className="size-5 mr-2" />
                    Masuk ke Dashboard
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
