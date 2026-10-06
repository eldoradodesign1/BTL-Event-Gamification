import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2?bundle";

const SUPABASE_URL = "https://hvhidlyigfznmwmlubof.supabase.co";
const SUPABASE_KEY = "sb_publishable_cnbdFJbtEwR5r1Ujgv_bzQ_v44o7ofU";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const normalizePhone = (value) => {
  let phone = String(value || "").replace(/[^0-9+]/g, "");
  if (phone.startsWith("00")) phone = "+" + phone.slice(2);
  if (phone.startsWith("+243")) return phone;
  if (phone.startsWith("243")) return "+" + phone;
  if (phone.startsWith("0")) return "+243" + phone.slice(1);
  return phone;
};

const style = document.createElement("style");
style.textContent = `
#btl-auth{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 20% 10%,#3d3474 0,transparent 35%),radial-gradient(circle at 90% 90%,#783d58 0,transparent 35%),#070b18;color:#eaf0ff;font-family:Inter,system-ui,sans-serif}
.btl-auth-card{width:min(430px,calc(100vw - 32px));padding:34px;border:1px solid rgba(255,255,255,.14);border-radius:28px;background:rgba(18,26,56,.82);backdrop-filter:blur(24px);box-shadow:0 30px 100px rgba(0,0,0,.45)}
.btl-auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:30px}.btl-auth-brand img{width:48px;height:48px}.btl-auth-brand strong{font:800 28px/1 Sora,Inter,sans-serif;letter-spacing:-.04em}.btl-auth-brand strong span{color:#9beaf7}.btl-auth-card h1{font:800 32px/1.05 Sora,Inter,sans-serif;margin:0 0 8px}.btl-auth-card p{color:#93a2c6;margin:0 0 24px}.btl-auth-field{display:grid;gap:7px;margin:14px 0}.btl-auth-field label{font-size:12px;color:#b9c5e2}.btl-auth-field input{box-sizing:border-box;width:100%;padding:13px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.12);background:#121a38;color:#fff;outline:none;font:inherit}.btl-auth-field input:focus{border-color:#7c5cff;box-shadow:0 0 0 3px rgba(124,92,255,.16)}.btl-auth-submit{width:100%;margin-top:10px;padding:13px 16px;border:0;border-radius:13px;background:linear-gradient(135deg,#7c5cff,#9c7bff);color:#fff;font-weight:800;cursor:pointer}.btl-auth-submit:disabled{opacity:.55;cursor:wait}.btl-auth-error{min-height:20px;color:#ffb0c0;font-size:13px;margin-top:12px}.btl-auth-foot{margin-top:18px;font-size:11px;color:#5f6c8c}
`;
document.head.appendChild(style);

let authRoot = null;
let currentUser = null;
const isOrganizerRoute = () => location.hash === "#/admin" || location.hash.startsWith("#/admin/");

const removeGate = () => {
  if (authRoot) {
    authRoot.remove();
    authRoot = null;
  }
};

const renderLogin = (error = "") => {
  if (!isOrganizerRoute()) {
    removeGate();
    return;
  }
  if (!authRoot) {
    authRoot = document.createElement("div");
    authRoot.id = "btl-auth";
    document.body.appendChild(authRoot);
  }
  authRoot.innerHTML = `
    <form class="btl-auth-card" id="btl-login-form">
      <div class="btl-auth-brand"><img src="./btl-play-icon.svg" alt=""><div><strong>BTL<span>Live</span></strong><div style="font-size:11px;color:#8d9bc1">Conference control room</div></div></div>
      <h1>Accès organisateur.</h1>
      <p>Connectez-vous avec votre numéro de téléphone professionnel pour piloter l’Event.</p>
      <div class="btl-auth-field"><label>Numéro de téléphone</label><input id="btl-phone" inputmode="tel" autocomplete="username" placeholder="+243…" required></div>
      <div class="btl-auth-field"><label>Mot de passe</label><input id="btl-password" type="password" autocomplete="current-password" placeholder="••••••••" required></div>
      <button class="btl-auth-submit" type="submit">Ouvrir la console</button>
      <div class="btl-auth-error">${error}</div>
      <div class="btl-auth-foot">Les participants, intervenants et l’écran utilisent leurs accès Event dédiés.</div>
    </form>`;
  authRoot.querySelector("#btl-login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    button.textContent = "Connexion…";
    const phone = normalizePhone(authRoot.querySelector("#btl-phone").value);
    const password = authRoot.querySelector("#btl-password").value;
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ phone, password });
    if (loginError || !data.user) {
      button.disabled = false;
      button.textContent = "Ouvrir la console";
      renderLogin("Numéro ou mot de passe incorrect.");
      return;
    }
    const { data: roster, error: rosterError } = await supabase
      .from("organizer_roster")
      .select("full_name,phone,source_role,status")
      .eq("phone", phone)
      .maybeSingle();
    if (rosterError || !roster || roster.status !== "active") {
      await supabase.auth.signOut();
      button.disabled = false;
      button.textContent = "Ouvrir la console";
      renderLogin("Ce compte n’est pas autorisé à accéder à la console.");
      return;
    }
    currentUser = { fullName: roster.full_name, phone: roster.phone, role: roster.source_role };
    window.BTLAccess.user = currentUser;
    removeGate();
  });
};

const validateOrganizerSession = async () => {
  if (!isOrganizerRoute()) {
    removeGate();
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    renderLogin();
    return;
  }
  const phone = normalizePhone(data.session.user.phone || "");
  const { data: roster } = await supabase
    .from("organizer_roster")
    .select("full_name,phone,source_role,status")
    .eq("phone", phone)
    .maybeSingle();
  if (!roster || roster.status !== "active") {
    await supabase.auth.signOut();
    renderLogin("Session organisateur non autorisée.");
    return;
  }
  currentUser = { fullName: roster.full_name, phone: roster.phone, role: roster.source_role };
  window.BTLAccess.user = currentUser;
  removeGate();
};

window.BTLAccess = {
  user: null,
  signOut: async () => {
    await supabase.auth.signOut();
    currentUser = null;
    window.BTLAccess.user = null;
    location.hash = "#/";
    removeGate();
  }
};

window.addEventListener("hashchange", validateOrganizerSession);
supabase.auth.onAuthStateChange(() => validateOrganizerSession());
validateOrganizerSession();
