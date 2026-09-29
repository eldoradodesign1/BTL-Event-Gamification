import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, LogIn, Phone, ShieldCheck, Sparkles } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import App from "./App";
import { supabase } from "./lib/supabase";

type Profile = {
  id: string;
  phone: string;
  full_name: string;
  role: "superadmin";
  ui_role: "organizer";
  can_simulate: boolean;
  is_active: boolean;
  must_change_password: boolean;
};

type AuthState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "signed_in"; user: User; profile: Profile }
  | { status: "error"; message: string };

function normalizePhone(value: string) {
  const raw = value.trim().replace(/[\s().-]/g, "");
  if (raw.startsWith("+243")) return raw;
  if (raw.startsWith("243")) return `+${raw}`;
  if (raw.startsWith("0")) return `+243${raw.slice(1)}`;
  return raw;
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return <div className="auth-shell">
    <div className="auth-glow auth-glow-a" />
    <div className="auth-glow auth-glow-b" />
    <section className="auth-card">
      <div className="auth-brand">
        <img src={`${import.meta.env.BASE_URL}btl-play-mark.svg`} alt="" />
        <div><strong>BTL<span>Play</span></strong><small>Conference control room</small></div>
      </div>
      {children}
    </section>
  </div>;
}

function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      phone: normalizePhone(phone),
      password,
    });
    if (authError || !data.user) {
      setError(authError?.message === "Invalid login credentials" ? "Numéro ou mot de passe incorrect." : (authError?.message ?? "Connexion impossible."));
      setBusy(false);
      return;
    }
    onSignedIn();
  };

  return <AuthShell>
    <div className="auth-kicker"><span><ShieldCheck size={14} /> Accès organisateur</span><i /></div>
    <h1>La salle est prête.<br /><em>Connectez-vous.</em></h1>
    <p className="auth-copy">Utilisez votre numéro de téléphone et votre mot de passe pour accéder au control room BTL Play.</p>
    <form className="auth-form" onSubmit={submit}>
      <label><span><Phone size={15} /> Numéro de téléphone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x xxx xx xx" inputMode="tel" autoComplete="tel" required /></label>
      <label><span><LockKeyhole size={15} /> Mot de passe</span><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" type="password" autoComplete="current-password" required /></label>
      {error && <div className="auth-error">{error}</div>}
      <button className="auth-submit" disabled={busy}>{busy ? "Connexion…" : <><LogIn size={17} /> Entrer dans BTL Play</>}</button>
    </form>
    <div className="auth-note"><Sparkles size={15} /><span>Accès réservé aux équipes organisatrices.</span></div>
  </AuthShell>;
}

function ChangePasswordScreen({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Choisissez au moins 8 caractères.");
    if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }
    const { error: profileError } = await supabase.from("profiles").update({ must_change_password: false }).eq("id", profile.id);
    if (profileError) {
      setError(profileError.message);
      setBusy(false);
      return;
    }
    onDone();
  };

  return <AuthShell>
    <div className="auth-kicker"><span><LockKeyhole size={14} /> Première connexion</span><i /></div>
    <h1>Protégez votre<br /><em>accès organisateur.</em></h1>
    <p className="auth-copy">Définissez maintenant votre mot de passe personnel. Le mot de passe temporaire ne sera plus accepté après cette étape.</p>
    <form className="auth-form" onSubmit={submit}>
      <label><span>Nouveau mot de passe</span><input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" type="password" autoComplete="new-password" required /></label>
      <label><span>Confirmer le mot de passe</span><input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Répétez le mot de passe" type="password" autoComplete="new-password" required /></label>
      {error && <div className="auth-error">{error}</div>}
      <button className="auth-submit" disabled={busy}>{busy ? "Enregistrement…" : "Définir mon mot de passe"}</button>
    </form>
  </AuthShell>;
}

export default function AuthGate() {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const loadProfile = async (user: User | null) => {
    if (!user) {
      setState({ status: "signed_out" });
      return;
    }
    const { data: profile, error } = await supabase.from("profiles").select("id,phone,full_name,role,ui_role,can_simulate,is_active,must_change_password").eq("id", user.id).maybeSingle();
    if (error || !profile) {
      await supabase.auth.signOut();
      setState({ status: "error", message: "Votre compte existe dans Supabase Auth mais n'est pas encore rattaché au roster BTL Play." });
      return;
    }
    if (!profile.is_active) {
      await supabase.auth.signOut();
      setState({ status: "error", message: "Ce compte organisateur est désactivé." });
      return;
    }
    setState({ status: "signed_in", user, profile });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => loadProfile(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (state.status === "loading") return <AuthShell><div className="auth-loading"><div className="auth-spinner" /><span>Initialisation de BTL Play…</span></div></AuthShell>;
  if (state.status === "signed_out") return <LoginScreen onSignedIn={() => supabase.auth.getUser().then(({ data }) => loadProfile(data.user))} />;
  if (state.status === "error") return <AuthShell><div className="auth-kicker"><span><ShieldCheck size={14} /> Accès refusé</span><i /></div><h1>Compte non<br /><em>rattaché.</em></h1><p className="auth-copy">{state.message}</p><button className="auth-submit" onClick={() => setState({ status: "signed_out" })}>Retour à la connexion</button></AuthShell>;
  if (state.profile.must_change_password) return <ChangePasswordScreen profile={state.profile} onDone={() => setState({ status: "signed_in", user: state.user, profile: { ...state.profile, must_change_password: false } })} />;
  return <App currentUser={{ fullName: state.profile.full_name, phone: state.profile.phone, canSimulate: state.profile.can_simulate }} onSignOut={() => void supabase.auth.signOut()} />;
}
