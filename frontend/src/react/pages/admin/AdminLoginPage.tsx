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
import {
  TurnstileWidget,
  type TurnstileWidgetRef,
} from "@/components/shared/TurnstileWidget";
import { apiFetch } from "@/lib/api";
import { Analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { AdminLoginHeroPanel } from "@/components/admin/auth/AdminLoginHeroPanel";

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

  const turnstileSiteKey =
    (typeof window !== "undefined" &&
      (window as { __ENV__?: { PUBLIC_TURNSTILE_SITE_KEY?: string } }).__ENV__
        ?.PUBLIC_TURNSTILE_SITE_KEY) ||
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ||
    "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

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
      {/* KIRI: Modular Brand Atmosphere Panel */}
      <AdminLoginHeroPanel />

      {/* KANAN: Clean Form Panel */}
      <div className="relative flex w-full flex-col justify-center bg-gradient-to-br from-slate-50 via-gray-50/70 to-emerald-50/30 px-6 py-12 lg:w-1/2 sm:px-12 lg:px-16 xl:px-24">
        <div className="absolute top-10 right-10 size-72 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 size-72 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />

        <div className="relative mx-auto w-full max-w-[480px]">
          {/* Top Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-all py-2 px-3.5 rounded-xl hover:bg-white hover:shadow-xs border border-transparent hover:border-slate-200/60 cursor-pointer group"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              Kembali ke Beranda
            </Link>

            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Akses Internal
            </span>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl bg-white p-8 sm:p-11 shadow-2xl shadow-slate-200/60 border border-slate-200/90 backdrop-blur-md">
            {/* Mobile Header Logo */}
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex items-center gap-1.5 rounded-2xl bg-emerald-50 p-2 border border-emerald-100">
                <Image
                  src="/kemenag.svg"
                  alt="Logo Kemenag"
                  width={28}
                  height={28}
                  priority
                  className="object-contain"
                />
                <Image
                  src="/arus.webp"
                  alt="Logo SI-ARUS"
                  width={30}
                  height={30}
                  priority
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  SI-ARUS Kemenag
                </h3>
                <p className="text-[11px] font-medium text-slate-500">
                  Kabupaten Barito Utara
                </p>
              </div>
            </div>

            {/* Header */}
            <div className="mb-7">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Masuk Administrator
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium leading-relaxed">
                Gunakan akun resmi pengelola untuk membuka dashboard kendali survei.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Field: Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Email Resmi
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@kemenag.go.id"
                    autoComplete="email"
                    disabled={loading || Boolean(lockoutTime)}
                    className="pl-11 h-12 sm:h-13 rounded-2xl border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-900 shadow-2xs focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-600 transition-all placeholder:text-slate-400"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs font-semibold text-rose-500 pl-1 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Field: Password */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Kata Sandi
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    disabled={loading || Boolean(lockoutTime)}
                    className="pl-11 pr-11 h-12 sm:h-13 rounded-2xl border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-900 shadow-2xs focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500/25 focus-visible:border-emerald-600 transition-all placeholder:text-slate-400"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
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
                  <p className="text-xs font-semibold text-rose-500 pl-1 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Turnstile Widget */}
              {turnstileSiteKey && (
                <div className="w-full pt-1 pb-1">
                  <TurnstileWidget
                    ref={turnstileRef}
                    siteKey={turnstileSiteKey}
                    className="w-full flex justify-center"
                    onSuccess={(token: string) => setTurnstileToken(token)}
                    onError={() =>
                      console.warn("[Turnstile] Local fallback active")
                    }
                  />
                </div>
              )}

              {/* Lockout notice */}
              {failedAttempts > 0 && failedAttempts < 5 && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 border border-amber-200/80">
                  <ShieldAlert className="size-4.5 text-amber-600 shrink-0" />
                  <span>
                    Percobaan gagal: {failedAttempts} dari 5 kesempatan sebelum
                    terkunci sementara.
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 sm:h-13 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm sm:text-base font-extrabold text-white hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/35 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:hover:scale-100 cursor-pointer"
                  disabled={
                    loading ||
                    Boolean(lockoutTime) ||
                    (Boolean(turnstileSiteKey) && !turnstileToken)
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-5 animate-spin mr-2" />
                      Memverifikasi Sesi...
                    </>
                  ) : lockoutTime ? (
                    `Terkunci Sementara`
                  ) : (
                    <>
                      <LogIn className="size-4.5 mr-2" />
                      Masuk ke Dashboard
                    </>
                  )}
                </Button>
              </div>

              {/* Security Footnote */}
              <p className="text-center text-[11px] text-slate-400 font-medium pt-2">
                🔒 Sesi Terenkripsi 256-bit • Akses Terbatas Hanya Untuk Admin.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
