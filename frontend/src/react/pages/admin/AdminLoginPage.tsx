import { useState, useEffect, useRef } from "react";
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
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { TurnstileWidget, type TurnstileWidgetRef } from "@/components/shared/TurnstileWidget";
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
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
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
      // Reset Turnstile token & widget so next attempt uses a fresh single-use token
      setTurnstileToken("");
      turnstileRef.current?.reset();

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
      {/* KIRI: Clean & Minimalist Atmosphere Panel (Desktop Only)                  */}
      {/* ========================================================================= */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-12 lg:flex border-r border-emerald-800/30">
        {/* Glow Effects & Grid Pattern Background */}
        <div className="absolute -left-28 -top-28 size-[520px] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute -right-28 -bottom-28 size-[520px] rounded-full bg-teal-500/15 blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#05966910_1px,transparent_1px),linear-gradient(to_bottom,#05966910_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Top Header Brand Identity */}
        <div className="relative z-10 flex items-center gap-3.5">
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

        {/* Hero Copy - Clean & Spacious */}
        <div className="relative z-10 my-auto py-8 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
              Pusat Kendali & <br />
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                Analisis Pelayanan
              </span>
            </h1>
            <p className="text-sm leading-relaxed text-emerald-100/70 font-normal">
              Sistem Informasi Survei Kepuasan Masyarakat (IKM/IPKP & IPAK) Kantor Kementerian Agama Kabupaten Barito Utara.
            </p>
          </motion.div>
        </div>

        {/* Bottom Minimal Copyright */}
        <div className="relative z-10 pt-4 text-xs font-medium text-emerald-300/60">
          © 2026 Kemenag Barito Utara. Hak Cipta Dilindungi.
        </div>
      </div>
      {/* ========================================================================= */}
      {/* KANAN: Clean Minimalist Login Form Card                                  */}
      {/* ========================================================================= */}
      <div className="flex w-full flex-col justify-center bg-slate-50/80 px-6 py-14 lg:w-1/2 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[500px]">
          {/* Top Navigation */}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors py-2 px-3.5 rounded-xl hover:bg-slate-200/60 cursor-pointer group"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              Kembali ke Beranda
            </Link>
          </div>

          {/* Form Card Container */}
          <div className="rounded-3xl bg-white p-8 sm:p-12 shadow-xl shadow-slate-200/70 border border-slate-200/80">
            {/* Header */}
            <div className="mb-8 sm:mb-9">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Masuk Administrator
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
                Gunakan kredensial resmi untuk mengakses panel kontrol.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-7">
              {/* Field: Email */}
              <div className="space-y-2.5">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-slate-800 tracking-wide"
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
                    className="pl-12 h-13 sm:h-13.5 rounded-2xl border-slate-200 bg-slate-50/70 text-sm sm:text-base shadow-2xs focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 font-medium transition-all"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs sm:text-sm font-medium text-rose-500 pl-1 mt-1.5">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Field: Password */}
              <div className="space-y-2.5">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold text-slate-800 tracking-wide"
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
                    className="pl-12 pr-12 h-13 sm:h-13.5 rounded-2xl border-slate-200 bg-slate-50/70 text-sm sm:text-base shadow-2xs focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-600 font-medium transition-all"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4.5" />
                    ) : (
                      <Eye className="size-4.5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs sm:text-sm font-medium text-rose-500 pl-1 mt-1.5">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Cloudflare Turnstile Security Widget (Full Width matching button) */}
              {turnstileSiteKey && (
                <div className="w-full pt-1 pb-1">
                  <TurnstileWidget
                    ref={turnstileRef}
                    siteKey={turnstileSiteKey}
                    className="w-full"
                    onSuccess={(token: string) => setTurnstileToken(token)}
                    onError={() =>
                      console.warn("[Turnstile] Local fallback active")
                    }
                  />
                </div>
              )}

              {failedAttempts > 0 && failedAttempts < 5 && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-xs sm:text-sm font-semibold text-amber-700 border border-amber-200 my-2">
                  <ShieldAlert className="size-4.5 text-amber-600 shrink-0" />
                  <span>
                    Percobaan gagal: {failedAttempts} dari 5 kesempatan.
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 sm:pt-3">
                <Button
                  type="submit"
                  className="w-full h-13 sm:h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm sm:text-base font-bold text-white hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-600/25 active:scale-[0.99] disabled:opacity-75 cursor-pointer pt-0.5"
                  disabled={loading || Boolean(lockoutTime) || (Boolean(turnstileSiteKey) && !turnstileToken)}
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
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
