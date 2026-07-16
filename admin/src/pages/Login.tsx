import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Globe, ShieldCheck, BarChart3 } from "lucide-react";
import axios from "../lib/axios";
import { useAuth } from "../lib/auth";
import { t } from "../lib/i18n";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { data } = await axios.post<{ accessToken: string }>("/auth/login", { email, password });
      login(data.accessToken);
      navigate("/app");
    } catch (e: any) {
      setErr(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #00C89622 0%, #0A0A0F 55%)" }}>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary grid place-items-center text-[#062]"><Dumbbell size={22} /></div>
          <span className="text-2xl font-extrabold text-primary">Nafas</span>
          <span className="text-sub text-sm">{t("shell.admin")}</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight mb-4">{t("login.heroTitle")}</h1>
          <p className="text-sub max-w-md mb-8">{t("login.heroSub")}</p>
          <div className="space-y-3 text-sm text-sub">
            <div className="flex items-center gap-3"><Globe size={18} className="text-primary" /> {t("login.feat1")}</div>
            <div className="flex items-center gap-3"><BarChart3 size={18} className="text-primary" /> {t("login.feat2")}</div>
            <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-primary" /> {t("login.feat3")}</div>
          </div>
        </div>
        <p className="text-muted text-xs relative">{t("login.footer")}</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-3xl font-extrabold text-primary">Nafas</span><span className="text-sub">{t("shell.admin")}</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">{t("login.welcome")}</h2>
          <p className="text-sub text-sm mb-8">{t("login.sub")}</p>

          <label className="block text-xs text-sub mb-1.5">{t("login.email")}</label>
          <input className="input mb-4" type="email" placeholder="admin@nafas.app" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          <label className="block text-xs text-sub mb-1.5">{t("login.password")}</label>
          <input className="input mb-5" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />

          {err && <p className="text-accent text-sm mb-4">{err}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
