import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2?bundle";

const SUPABASE_URL = "https://hvhidlyigfznmwmlubof.supabase.co";
const SUPABASE_KEY = "sb_publishable_cnbdFJbtEwR5r1Ujgv_bzQ_v44o7ofU";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const base = document.querySelector("base")?.href || new URL("./", location.href).href;
const normalizePhone = (value) => {
  let p = String(value || "").replace(/[^0-9+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("+243")) return p;
  if (p.startsWith("243")) return "+" + p;
  if (p.startsWith("0")) return "+243" + p.slice(1);
  return p;
};

const style = document.createElement("style");
style.textContent = `
#btl-auth{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:radial-gradient(circle at 20% 10%,#3d3474 0,transparent 35%),radial-gradient(circle at 90% 90%,#783d58 0,transparent 35%),#161925;color:#f8f5ef;font-family:Inter,system-ui,sans-serif}
.btl-auth-card{width:min(430px,calc(100vw - 32px));padding:34px;border:1px solid rgba(255,255,255,.14);border-radius:28px;background:rgba(25,27,40,.78);backdrop-filter:blur(24px);box-shadow:0 30px 100px rgba(0,0,0,.45)}
.btl-auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:30px}.btl-auth-brand img{width:48px;height:48px}.btl-auth-brand strong{font-size:28px}.btl-auth-brand strong span{color:#a99bf8}.btl-auth-card h1{font-size:32px;line-height:1.05;margin:0 0 8px}.btl-auth-card p{color:#a9adbd;margin:0 0 24px}.btl-auth-field{display:grid;gap:7px;margin:14px 0}.btl-auth-field label{font-size:12px;color:#b9bcc9}.btl-auth-field input{box-sizing:border-box;width:100%;padding:13px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.12);background:#202332;color:#fff;outline:none}.btl-auth-field input:focus{border-color:#a99bf8;box-shadow:0 0 0 3px rgba(169,155,248,.12)}.btl-auth-submit{width:100%;margin-top:10px;padding:13px 16px;border:0;border-radius:13px;background:#a99bf8;color:#171925;font-weight:800;cursor:pointer}.btl-auth-error{min-height:20px;color:#ff9c9c;font-size:13px;margin-top:12px}.btl-auth-foot{margin-top:18px;font-size:11px;color:#777b8d}
body.btl-scene .sidebar,body.btl-scene .topbar,body.btl-scene .mobile-nav{display:none!important}body.btl-scene .main-content{margin-left:0!important;width:100%!important}body.btl-scene .workspace{min-height:100vh!important;padding:32px!important}#btl-scene-exit{position:fixed;top:18px;right:18px;z-index:9990;border:1px solid rgba(255,255,255,.16);background:rgba(22,25,37,.84);color:#fff;border-radius:12px;padding:10px 14px;cursor:pointer;backdrop-filter:blur(14px)}#btl-session-user{position:fixed;left:18px;bottom:18px;z-index:9990;padding:9px 12px;border-radius:12px;background:rgba(22,25,37,.82);color:#fff;font-size:12px;backdrop-filter:blur(14px)}
`;
document.head.appendChild(style);

const authRoot = document.createElement("div");
authRoot.id = "btl-auth";
document.body.appendChild(authRoot);

const renderLogin = (error = "") => {
  authRoot.innerHTML = `
    <form class="btl-auth-card" id="btl-login-form">
      <div class="btl-auth-brand"><img src="./btl-play-icon.svg" alt=""><div><strong>BTL<span>Play</span></strong><div style="font-size:11px;color:#8d91a2">Conference control room</div></div></div>
      <h1>Bienvenue.</h1>
      <p>Connectez-vous avec votre numéro de téléphone professionnel.</p>
      <div class="btl-auth-field"><label>Numéro de téléphone</label><input id="btl-phone" inputmode="tel" autocomplete="username" placeholder="+243..." required></div>
      <div class="btl-auth-field"><label>Mot de passe</label><input id="btl-password" type="password" autocomplete="current-password" placeholder="••••••••" required></div>
      <button class="btl-auth-submit" type="submit">Ouvrir BTL Play</button>
      <div class="btl-auth-error">${error}</div>
      <div class="btl-auth-foot">Accès réservé aux organisateurs autorisés.</div>
    </form>`;
  document.getElementById("btl-login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn=e.currentTarget.querySelector("button");
    btn.disabled=true; btn.textContent="Connexion…";
    const phone=normalizePhone(document.getElementById("btl-phone").value);
    const password=document.getElementById("btl-password").value;
    const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
    if(error || !data.user){ btn.disabled=false; btn.textContent="Ouvrir BTL Play"; renderLogin("Numéro ou mot de passe incorrect."); return; }
    const { data: roster, error: rosterError } = await supabase.from("organizer_roster").select("full_name,phone,source_role,status").eq("phone", phone).maybeSingle();
    if(rosterError || !roster || roster.status !== "active"){ await supabase.auth.signOut(); btn.disabled=false; btn.textContent="Ouvrir BTL Play"; renderLogin("Ce compte n’est pas autorisé à accéder à BTL Play."); return; }
    startApp({ fullName: roster.full_name, phone: roster.phone, canSimulate: roster.source_role === "super_admin" });
  });
};

const loadBundle = () => {
  if(document.getElementById("btl-app-bundle")) return;
  history.replaceState({}, "", base + "organisateur");
  const script=document.createElement("script");
  script.type="module"; script.src="./assets/index-Deubvme9.js"; script.id="btl-app-bundle";
  document.body.appendChild(script);
};

const startApp = (user) => {
  authRoot.remove();
  loadBundle();
  setTimeout(() => {
    const switcher=document.querySelector(".role-switcher");
    if(switcher && !user.canSimulate) switcher.style.display="none";
    const profile=document.querySelector(".profile-mini strong");
    if(profile) profile.textContent=user.fullName;
    const mini=document.querySelector(".profile-mini small");
    if(mini) mini.textContent="Organisateur";
    const sceneButton=document.createElement("button");
    sceneButton.id="btl-scene-exit";
    sceneButton.textContent="⛶ Mode scène";
    sceneButton.onclick=()=>toggleScene();
    document.body.appendChild(sceneButton);
    const badge=document.createElement("div");
    badge.id="btl-session-user";
    badge.textContent=user.fullName + " · Organisateur";
    document.body.appendChild(badge);
    if(user.canSimulate) {
      const sim=document.querySelector(".role-switcher");
      if(sim) sim.title="Simulation réservée aux superadmins";
    }
    document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") document.body.classList.remove("btl-scene"); });
    const observer=new MutationObserver(()=>{const s=document.querySelector(".role-switcher"); if(s&&!user.canSimulate)s.style.display="none";});
    observer.observe(document.body,{childList:true,subtree:true});
  },900);
};

const toggleScene=()=> {
  const active=document.body.classList.toggle("btl-scene");
  const b=document.getElementById("btl-scene-exit");
  if(b) b.textContent=active ? "✕ Quitter le mode scène" : "⛶ Mode scène";
};

supabase.auth.getSession().then(async ({data})=>{
  if(!data.session) { renderLogin(); return; }
  const phone=normalizePhone(data.session.user.phone || "");
  const {data: roster}=await supabase.from("organizer_roster").select("full_name,phone,source_role,status").eq("phone",phone).maybeSingle();
  if(!roster || roster.status!=="active"){ await supabase.auth.signOut(); renderLogin("Session non autorisée."); return; }
  startApp({fullName:roster.full_name,phone:roster.phone,canSimulate:roster.source_role==="super_admin"});
});
