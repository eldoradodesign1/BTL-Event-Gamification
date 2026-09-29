import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  Copy,
  Crown,
  Dices,
  Gamepad2,
  Gift,
  LayoutDashboard,
  Menu,
  MessageCircleQuestion,
  Mic2,
  MonitorPlay,
  Pause,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  event,
  initialQuestions,
  moduleMeta,
  participants,
  quizQuestions,
  roleMeta,
  speakers,
  type ModuleKey,
  type Participant,
  type QAQuestion,
  type Role,
} from "./data/demo";

type Toast = { message: string; tone: "success" | "info" } | null;

type NavItem = { key: ModuleKey; label: string; icon: LucideIcon };

const roleOrder: Role[] = ["participant", "organizer", "speaker"];
const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function roleFromPath(pathname: string): Role {
  if (pathname.includes("/organisateur")) return "organizer";
  if (pathname.includes("/intervenant")) return "speaker";
  return "participant";
}

function Avatar({ initials, color, size = "medium" }: { initials: string; color: string; size?: "small" | "medium" | "large" }) {
  return <span className={`avatar avatar-${color} avatar-${size}`}>{initials}</span>;
}

function StatusPill({ children, tone = "neutral", dot = false }: { children: React.ReactNode; tone?: "live" | "success" | "warning" | "neutral" | "coral"; dot?: boolean }) {
  return <span className={`status-pill status-${tone}`}>{dot && <span className="status-dot" />}{children}</span>;
}

function ToastNotice({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.tone}`} role="status">
      {toast.tone === "success" ? <CheckCircle2 size={17} /> : <Sparkles size={17} />}
      <span>{toast.message}</span>
      <button className="icon-button icon-button-small" onClick={onClose} aria-label="Fermer la notification"><X size={15} /></button>
    </div>
  );
}

function QrMatrix() {
  const cells = [
    "111111100101011111111", "100000101110010000001", "101110100010010111101", "101110111011010111101", "101110101100010111101", "100000100111010000001", "111111101010011111111", "000000001101000000000", "110110110010101101011", "011010011111010010100", "101101100001101110111", "001011011010011001010", "111100100111101100101", "000000001010011001011", "111111101011110101101", "100000101100001001010", "101110101011111110101", "101110100100010011110", "101110111001110110011", "100000101011001010101", "111111101101110101111",
  ];
  return <div className="qr-code" aria-label="QR code de la session">
    <div className="qr-grid">{cells.join("").split("").map((cell, index) => <span key={index} className={cell === "1" ? "qr-on" : "qr-off"} />)}</div>
    <span className="qr-corner qr-corner-a" /><span className="qr-corner qr-corner-b" /><span className="qr-corner qr-corner-c" />
  </div>;
}

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: LucideIcon; tone: "indigo" | "coral" | "mint" | "lilac" }) {
  return <article className={`metric-card metric-${tone}`}>
    <div className="metric-topline"><span>{label}</span><span className="metric-icon"><Icon size={16} /></span></div>
    <strong>{value}</strong>
    <span className="metric-detail">{detail}</span>
  </article>;
}

function ModuleCard({ module, icon: Icon, tone, onClick }: { module: Exclude<ModuleKey, "overview">; icon: LucideIcon; tone: string; onClick: () => void }) {
  const meta = moduleMeta[module];
  return <button className={`module-card module-${tone}`} onClick={onClick}>
    <span className="module-icon"><Icon size={21} /></span>
    <span className="module-copy"><small>{meta.kicker}</small><strong>{meta.label}</strong><span>{meta.description}</span></span>
    <span className="module-arrow"><ArrowRight size={17} /></span>
  </button>;
}

function ProgressRing({ value }: { value: number }) {
  return <div className="progress-ring" style={{ "--progress": `${value * 3.6}deg` } as React.CSSProperties}><span>{value}<small>%</small></span></div>;
}

type AppProps = {
  currentUser: { fullName: string; phone: string; canSimulate: boolean };
  onSignOut: () => void;
};

function App({ currentUser, onSignOut }: AppProps) {
  const [role, setRole] = useState<Role>("organizer");
  const [sceneMode, setSceneMode] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleKey>("overview");
  const [toast, setToast] = useState<Toast>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState(8);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<"correct" | "wrong" | "timeout" | null>(null);
  const [raffleRegistered, setRaffleRegistered] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingNumber, setDrawingNumber] = useState("083");
  const [raffleWinner, setRaffleWinner] = useState<Participant | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("s1");
  const [questions, setQuestions] = useState<QAQuestion[]>(initialQuestions);
  const [speakerFilter, setSpeakerFilter] = useState("s1");
  const drawInterval = useRef<number | null>(null);

  const currentQuestion = quizQuestions[quizIndex];
  const pendingQuestions = questions.filter((question) => question.status === "pending");
  const selectedSpeakerDetails = speakers.find((speaker) => speaker.id === selectedSpeaker) ?? speakers[0];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSceneMode(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRole(roleFromPath(window.location.pathname));
      setActiveModule("overview");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!quizStarted || selectedAnswer !== null || quizFeedback !== null || quizTimeLeft <= 0) return;
    const timer = window.setInterval(() => setQuizTimeLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [quizStarted, selectedAnswer, quizFeedback, quizTimeLeft]);

  useEffect(() => {
    if (quizStarted && quizTimeLeft === 0 && selectedAnswer === null && quizFeedback === null) {
      setQuizFeedback("timeout");
    }
  }, [quizStarted, quizTimeLeft, selectedAnswer, quizFeedback]);

  useEffect(() => () => {
    if (drawInterval.current) window.clearInterval(drawInterval.current);
  }, []);

  const navItems = useMemo<NavItem[]>(() => {
    if (role === "participant") return [
      { key: "overview", label: "Ma session", icon: LayoutDashboard },
      { key: "quiz", label: "Quiz live", icon: Gamepad2 },
      { key: "raffle", label: "Tombola", icon: Ticket },
      { key: "qa", label: "Questions", icon: MessageCircleQuestion },
    ];
    if (role === "speaker") return [
      { key: "overview", label: "Ma scène", icon: LayoutDashboard },
      { key: "qa", label: "Ma file Q/R", icon: MessageCircleQuestion },
    ];
    return [
      { key: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
      { key: "quiz", label: "Piloter le quiz", icon: MonitorPlay },
      { key: "raffle", label: "Lancer la tombola", icon: Dices },
      { key: "qa", label: "Modérer les questions", icon: ShieldCheck },
    ];
  }, [role]);

  const switchRole = (nextRole: Role) => {
    window.history.pushState({}, "", `${appBasePath}${roleMeta[nextRole].path}`);
    setRole(nextRole);
    setActiveModule("overview");
    setToast({ tone: "info", message: `Mode ${roleMeta[nextRole].label.toLowerCase()} activé pour la démo.` });
  };

  const selectModule = (module: ModuleKey) => {
    setActiveModule(module);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setQuizTimeLeft(8);
    setQuizFeedback(null);
    setSelectedAnswer(null);
    setToast({ tone: "info", message: "Le quiz est lancé. À vous de jouer !" });
  };

  const chooseAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null || quizFeedback !== null) return;
    setSelectedAnswer(answerIndex);
    setQuizFeedback(answerIndex === currentQuestion.answer ? "correct" : "wrong");
    setToast({ tone: answerIndex === currentQuestion.answer ? "success" : "info", message: answerIndex === currentQuestion.answer ? `Bonne réponse · +${currentQuestion.points} points` : "Presque ! La prochaine question arrive." });
  };

  const nextQuestion = () => {
    const nextIndex = (quizIndex + 1) % quizQuestions.length;
    setQuizIndex(nextIndex);
    setQuizTimeLeft(8);
    setSelectedAnswer(null);
    setQuizFeedback(null);
  };

  const registerRaffle = () => {
    setRaffleRegistered(true);
    setToast({ tone: "success", message: "Inscription confirmée. Votre numéro est le 083." });
  };

  const drawRaffle = () => {
    if (isDrawing) return;
    setRaffleWinner(null);
    setIsDrawing(true);
    let index = 0;
    drawInterval.current = window.setInterval(() => {
      setDrawingNumber(participants[index % participants.length].ticket);
      index += 1;
    }, 90);
    window.setTimeout(() => {
      if (drawInterval.current) window.clearInterval(drawInterval.current);
      drawInterval.current = null;
      const winner = participants[2];
      setDrawingNumber(winner.ticket);
      setRaffleWinner(winner);
      setIsDrawing(false);
      setToast({ tone: "success", message: `${winner.name} remporte la tombola !` });
    }, 1800);
  };

  const submitQuestion = () => {
    if (!questionText.trim()) {
      setToast({ tone: "info", message: "Écrivez une question avant de l'envoyer." });
      return;
    }
    const newQuestion: QAQuestion = {
      id: `qa-${Date.now()}`,
      text: questionText.trim(),
      speakerId: selectedSpeaker,
      author: "Vous",
      time: "À l'instant",
      status: "pending",
    };
    setQuestions((current) => [newQuestion, ...current]);
    setQuestionText("");
    setToast({ tone: "success", message: `Question envoyée à ${selectedSpeakerDetails.name}.` });
  };

  const moderateQuestion = (id: string, status: "approved" | "rejected") => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, status } : question));
    setToast({ tone: status === "approved" ? "success" : "info", message: status === "approved" ? "Question envoyée à l'intervenant." : "Question retirée de la file." });
  };

  const renderView = () => {
    if (role === "participant") return <ParticipantView activeModule={activeModule} onSelectModule={selectModule} quizStarted={quizStarted} onStartQuiz={startQuiz} currentQuestion={currentQuestion} quizTimeLeft={quizTimeLeft} selectedAnswer={selectedAnswer} quizFeedback={quizFeedback} onChooseAnswer={chooseAnswer} onNextQuestion={nextQuestion} raffleRegistered={raffleRegistered} onRegisterRaffle={registerRaffle} drawingNumber={drawingNumber} raffleWinner={raffleWinner} questionText={questionText} onQuestionTextChange={setQuestionText} selectedSpeaker={selectedSpeaker} onSpeakerChange={setSelectedSpeaker} onSubmitQuestion={submitQuestion} />;
    if (role === "speaker") return <SpeakerView questions={questions} speakerFilter={speakerFilter} onSpeakerChange={setSpeakerFilter} />;
    return <OrganizerView activeModule={activeModule} onSelectModule={selectModule} isQuizLive={quizStarted} onToggleQuiz={() => { setQuizStarted((current) => !current); setToast({ tone: "info", message: quizStarted ? "Quiz mis en pause." : "Quiz live lancé dans la salle." }); }} isDrawing={isDrawing} drawingNumber={drawingNumber} raffleWinner={raffleWinner} onDrawRaffle={drawRaffle} questions={questions} pendingQuestions={pendingQuestions} onModerateQuestion={moderateQuestion} />;
  };

  return <div className={`app-shell role-${role} ${sceneMode ? "scene-mode" : ""}`}>
    <aside className="sidebar">
      <div className="brand-lockup">
        <img src={`${import.meta.env.BASE_URL}btl-play-mark.svg`} alt="" className="brand-mark" />
        <div><strong>BTL<span>Play</span></strong><small>Conference control room</small></div>
      </div>
      <div className="session-mini-card">
        <span className="session-live"><i /> LIVE SESSION</span>
        <strong>{event.shortTitle}</strong>
        <span>{event.venue}</span>
        <div className="session-progress"><span style={{ width: `${event.progress}%` }} /></div>
        <small>{event.progress}% de la session</small>
      </div>
      <nav className="main-nav" aria-label="Navigation principale">
        <span className="nav-label">Workspace</span>
        {navItems.map(({ key, label, icon: Icon }) => <button key={key} className={`nav-item ${activeModule === key ? "nav-active" : ""}`} onClick={() => selectModule(key)}><Icon size={18} /><span>{label}</span>{key === "qa" && role === "organizer" && pendingQuestions.length > 0 && <em>{pendingQuestions.length}</em>}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item"><Settings2 size={18} /><span>Paramètres</span></button>
        <div className="profile-mini"><Avatar initials={currentUser.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase()} color="lilac" size="small" /><span><strong>{currentUser.fullName}</strong><small>Organisateur · Superadmin</small></span><ChevronRight size={15} /></div>
      </div>
    </aside>
    <main className="main-content">
      <header className="topbar">
        <div className="breadcrumbs"><span>BTL Play</span><ChevronRight size={14} /><strong>{roleMeta[role].label}</strong><StatusPill tone="live" dot>En direct</StatusPill></div>
        <div className="top-actions">
          <span className="topbar-event"><Radio size={14} /> Salle Horizon · 284 participants</span>
          <button className="icon-button" aria-label="Notifications"><Bell size={17} /><i /></button>
          {currentUser.canSimulate && <div className="role-switcher"><span>Voir comme</span>{roleOrder.map((item) => <button key={item} onClick={() => switchRole(item)} className={role === item ? "role-selected" : ""}>{roleMeta[item].label}</button>)}</div>}
          <button className={`icon-button scene-trigger ${sceneMode ? "scene-trigger-active" : ""}`} onClick={() => setSceneMode((current) => !current)} aria-label={sceneMode ? "Quitter le mode scène" : "Activer le mode scène"} title={sceneMode ? "Quitter le mode scène" : "Mode scène"}><MonitorPlay size={17} /></button>
          <button className="icon-button" aria-label="Se déconnecter" onClick={onSignOut}><ShieldCheck size={17} /></button>
          <button className="mobile-menu icon-button" aria-label="Ouvrir le menu"><Menu size={19} /></button>
        </div>
      </header>
      <div className="workspace">{renderView()}</div>
    </main>
    <ToastNotice toast={toast} onClose={() => setToast(null)} />
    <div className="mobile-nav">{navItems.slice(0, 4).map(({ key, label, icon: Icon }) => <button key={key} className={activeModule === key ? "mobile-nav-active" : ""} onClick={() => selectModule(key)}><Icon size={18} /><span>{label.replace("Piloter le ", "").replace("Modérer les ", "")}</span></button>)}</div>
  </div>;
}

function WorkspaceHeader({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="workspace-header"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function ParticipantView(props: {
  activeModule: ModuleKey; onSelectModule: (module: ModuleKey) => void; quizStarted: boolean; onStartQuiz: () => void; currentQuestion: typeof quizQuestions[number]; quizTimeLeft: number; selectedAnswer: number | null; quizFeedback: "correct" | "wrong" | "timeout" | null; onChooseAnswer: (index: number) => void; onNextQuestion: () => void; raffleRegistered: boolean; onRegisterRaffle: () => void; drawingNumber: string; raffleWinner: Participant | null; questionText: string; onQuestionTextChange: (value: string) => void; selectedSpeaker: string; onSpeakerChange: (value: string) => void; onSubmitQuestion: () => void;
}) {
  const { activeModule, onSelectModule } = props;
  return <>
    <WorkspaceHeader kicker="Participant · {event.room}" title="Votre moment commence maintenant." description="Jouez, gagnez et prenez la parole pendant la conférence." action={<div className="header-persona"><Avatar initials="AM" color="lilac" /><span><small>Connecté en tant que</small><strong>Aïcha Mbuyi</strong></span><StatusPill tone="success" dot>Participant</StatusPill></div>} />
    {activeModule === "overview" ? <>
      <section className="participant-hero glass-panel">
        <div className="hero-copy"><div className="hero-eyebrow"><span className="pulse-dot" /> EN DIRECT · {event.room.toUpperCase()}</div><h2>Un temps fort.<br /><em>Trois façons de participer.</em></h2><p>La session avance. Faites monter votre score, gardez votre ticket et posez la question qui fera la différence.</p><div className="hero-actions"><button className="button button-light" onClick={() => onSelectModule("quiz")}><Play size={16} fill="currentColor" /> Rejoindre le quiz</button><button className="text-button text-button-light" onClick={() => onSelectModule("qa")}>Voir les questions <ArrowRight size={15} /></button></div></div><div className="hero-visual"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-score-card"><span>Votre énergie</span><strong>+1 240</strong><small>points à gagner</small><div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></div></div><div className="floating-chip chip-top"><Sparkles size={14} /> Live now</div><div className="floating-chip chip-bottom"><Trophy size={14} /> Top 12%</div></div>
      </section>
      <div className="section-heading"><div><span className="eyebrow">À vous de jouer</span><h2>Les activations de la session</h2></div><span className="section-note"><Clock3 size={14} /> Session active depuis 42 min</span></div>
      <section className="module-grid"><ModuleCard module="quiz" tone="indigo" icon={Gamepad2} onClick={() => onSelectModule("quiz")} /><ModuleCard module="raffle" tone="coral" icon={Ticket} onClick={() => onSelectModule("raffle")} /><ModuleCard module="qa" tone="mint" icon={MessageCircleQuestion} onClick={() => onSelectModule("qa")} /></section>
      <section className="lower-grid"><article className="glass-card agenda-card"><div className="card-heading"><div><span className="eyebrow">Programme live</span><h3>Ce qui arrive ensuite</h3></div><button className="icon-button icon-button-small"><ChevronRight size={16} /></button></div><div className="agenda-item agenda-done"><span className="agenda-marker"><Check size={13} /></span><span><strong>Accueil & connexion</strong><small>09:00 · Terminé</small></span><StatusPill tone="success">Terminé</StatusPill></div><div className="agenda-item agenda-current"><span className="agenda-marker"><Radio size={13} /></span><span><strong>Future Forward · keynote</strong><small>10:30 · En direct</small></span><StatusPill tone="live" dot>Live</StatusPill></div><div className="agenda-item"><span className="agenda-marker"><Ticket size={13} /></span><span><strong>Tombola surprise</strong><small>11:15 · Dans 18 min</small></span><ChevronRight size={16} /></div></article><article className="glass-card qr-card"><div><span className="eyebrow">Accès rapide</span><h3>Une question en tête ?</h3><p>Scannez depuis votre téléphone ou ouvrez directement la file Q/R.</p><button className="text-button" onClick={() => onSelectModule("qa")}>Poser ma question <ArrowRight size={15} /></button></div><QrMatrix /></article></section>
    </> : <ParticipantModule {...props} />}
  </>;
}

function ParticipantModule(props: React.ComponentProps<typeof ParticipantView>) {
  const { activeModule } = props;
  if (activeModule === "quiz") return <QuizParticipant {...props} />;
  if (activeModule === "raffle") return <RaffleParticipant {...props} />;
  return <QuestionParticipant {...props} />;
}

function QuizParticipant({ quizStarted, onStartQuiz, currentQuestion, quizTimeLeft, selectedAnswer, quizFeedback, onChooseAnswer, onNextQuestion }: React.ComponentProps<typeof ParticipantView>) {
  return <section className="focus-layout"><div className="focus-main"><div className="focus-title-row"><div><span className="eyebrow">01 · Quiz live</span><h2>Faites chauffer les neurones.</h2><p>Une question, quelques secondes, un maximum de rythme.</p></div><StatusPill tone="live" dot>{quizStarted ? "Question en cours" : "Prêt à jouer"}</StatusPill></div><div className="quiz-stage glass-panel"><div className="quiz-stage-top"><span>Question {quizQuestions.findIndex((question) => question.id === currentQuestion.id) + 1} <small>/ {quizQuestions.length}</small></span><div className="quiz-timer"><span>Temps restant</span><strong className={quizTimeLeft <= 3 ? "timer-danger" : ""}>{String(quizTimeLeft).padStart(2, "0")}<small>s</small></strong></div></div>{!quizStarted ? <div className="quiz-intro"><div className="quiz-icon-large"><Gamepad2 size={30} /></div><h3>Le quiz commence avec vous.</h3><p>Trois questions à choix multiples. Les plus rapides marquent le plus de points.</p><button className="button button-primary" onClick={onStartQuiz}><Play size={16} fill="currentColor" /> Lancer le quiz</button></div> : <div className="quiz-question"><div className="question-meta"><StatusPill tone="neutral">{currentQuestion.category}</StatusPill><span>+{currentQuestion.points} points</span></div><h3>{currentQuestion.text}</h3><div className="answer-grid">{currentQuestion.options.map((option, index) => <button key={option} className={`answer-option ${selectedAnswer === index ? "answer-selected" : ""} ${quizFeedback && index === currentQuestion.answer ? "answer-correct" : ""} ${selectedAnswer === index && quizFeedback === "wrong" ? "answer-wrong" : ""}`} onClick={() => onChooseAnswer(index)}><span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{quizFeedback && index === currentQuestion.answer && <CheckCircle2 size={17} />}</button>)}</div>{quizFeedback && <div className={`quiz-feedback feedback-${quizFeedback}`}><span>{quizFeedback === "correct" ? "Bien joué, c’est la bonne réponse." : quizFeedback === "wrong" ? "Pas cette fois — gardez le rythme." : "Le temps est écoulé — la salle passe à la suite."}</span><button className="button button-small" onClick={onNextQuestion}>Question suivante <ArrowRight size={14} /></button></div>}</div>}</div></div><aside className="focus-side"><div className="glass-card score-card"><span className="eyebrow">Votre score</span><strong>1 240</strong><div className="score-change"><Zap size={14} /> +250 cette session</div><div className="score-rank"><span>Classement actuel</span><b>#18</b></div></div><div className="glass-card tip-card"><Sparkles size={17} /><strong>Astuce BTL</strong><p>La rapidité compte, mais une bonne intuition compte encore plus.</p></div></aside></section>;
}

function RaffleParticipant({ raffleRegistered, onRegisterRaffle, drawingNumber, raffleWinner }: React.ComponentProps<typeof ParticipantView>) {
  return <section className="focus-layout"><div className="focus-main"><div className="focus-title-row"><div><span className="eyebrow">02 · Tombola</span><h2>Le hasard aime les belles surprises.</h2><p>Inscrivez-vous et gardez votre numéro à portée de main.</p></div><StatusPill tone="coral" dot>{raffleWinner ? "Gagnant révélé" : "Tirage à 11:15"}</StatusPill></div><div className="raffle-stage glass-panel"><div className="raffle-copy"><span className="eyebrow">Ticket participant</span>{raffleRegistered ? <><span className="ticket-number">{drawingNumber}</span><strong>Votre numéro est bien enregistré.</strong><p>Restez attentif : le tirage sera projeté sur la scène principale.</p><button className="text-button" onClick={() => navigator.clipboard?.writeText(drawingNumber)}><Copy size={14} /> Copier mon numéro</button></> : <><div className="ticket-placeholder"><Ticket size={24} /><span>---</span></div><strong>Un numéro porte-bonheur vous attend.</strong><p>Un clic suffit pour rejoindre la liste des participants.</p><button className="button button-coral" onClick={onRegisterRaffle}><Ticket size={16} /> M'inscrire à la tombola</button></>}</div><div className="raffle-stage-art"><div className="raffle-ring ring-a" /><div className="raffle-ring ring-b" /><div className="raffle-ticket-visual"><Ticket size={27} /><span>{raffleRegistered ? drawingNumber : "083"}</span><small>BTL · 2026</small></div></div></div></div><aside className="focus-side"><div className="glass-card raffle-info"><span className="eyebrow">Déjà inscrits</span><strong>236</strong><span>participants dans le chapeau</span><div className="avatar-stack">{participants.slice(0, 4).map((participant) => <Avatar key={participant.id} initials={participant.initials} color={participant.color} size="small" />)}<span className="avatar-more">+232</span></div></div>{raffleWinner && <div className="glass-card winner-card"><span className="eyebrow">Gagnant du tirage</span><Avatar initials={raffleWinner.initials} color={raffleWinner.color} size="large" /><strong>{raffleWinner.name}</strong><span>Ticket #{raffleWinner.ticket} · {raffleWinner.city}</span><StatusPill tone="success"><Trophy size={13} /> Félicitations</StatusPill></div>}</aside></section>;
}

function QuestionParticipant({ questionText, onQuestionTextChange, selectedSpeaker, onSpeakerChange, onSubmitQuestion }: React.ComponentProps<typeof ParticipantView>) {
  return <section className="focus-layout"><div className="focus-main"><div className="focus-title-row"><div><span className="eyebrow">03 · Questions / réponses</span><h2>Votre question peut changer la conversation.</h2><p>Choisissez votre intervenant, écrivez simplement, envoyez.</p></div><StatusPill tone="success" dot>File ouverte</StatusPill></div><div className="question-form glass-panel"><div className="form-heading"><span className="form-number">01</span><div><strong>À qui souhaitez-vous parler ?</strong><span>Les intervenants sont renseignés par l’organisateur.</span></div></div><div className="speaker-picker">{speakers.map((speaker) => <button key={speaker.id} className={`speaker-option ${selectedSpeaker === speaker.id ? "speaker-selected" : ""}`} onClick={() => onSpeakerChange(speaker.id)}><Avatar initials={speaker.initials} color={speaker.color} size="small" /><span><strong>{speaker.name}</strong><small>{speaker.role}</small></span>{selectedSpeaker === speaker.id && <Check size={16} />}</button>)}</div><div className="form-heading form-heading-question"><span className="form-number">02</span><div><strong>Votre question</strong><span>Elle sera modérée avant d’apparaître à l’écran.</span></div></div><textarea value={questionText} onChange={(event) => onQuestionTextChange(event.target.value)} placeholder="Ex. Comment imaginez-vous la prochaine étape ?" maxLength={220} /><div className="form-footer"><span>{questionText.length}/220 caractères</span><button className="button button-primary" onClick={onSubmitQuestion}><Send size={15} /> Envoyer la question</button></div></div></div><aside className="focus-side"><div className="glass-card qr-side-card"><QrMatrix /><span className="eyebrow">Scannez pour rejoindre</span><strong>La file Q/R</strong><p>Présentez ce code aux participants qui souhaitent poser leur question depuis leur téléphone.</p><StatusPill tone="neutral"><QrCode size={13} /> btl.play/ask</StatusPill></div><div className="glass-card moderation-note"><ShieldCheck size={17} /><span><strong>Modération active</strong><small>Votre question reste privée tant qu'elle n'est pas validée.</small></span></div></aside></section>;
}

function OrganizerView(props: { activeModule: ModuleKey; onSelectModule: (module: ModuleKey) => void; isQuizLive: boolean; onToggleQuiz: () => void; isDrawing: boolean; drawingNumber: string; raffleWinner: Participant | null; onDrawRaffle: () => void; questions: QAQuestion[]; pendingQuestions: QAQuestion[]; onModerateQuestion: (id: string, status: "approved" | "rejected") => void }) {
  if (props.activeModule === "quiz") return <OrganizerQuiz {...props} />;
  if (props.activeModule === "raffle") return <OrganizerRaffle {...props} />;
  if (props.activeModule === "qa") return <OrganizerQA {...props} />;
  return <>
    <WorkspaceHeader kicker="Organisateur · Control room" title="Gardez le rythme de la salle." description="Pilotez chaque interaction depuis une seule vue." action={<div className="header-status"><StatusPill tone="live" dot>Session en direct</StatusPill><span>Dernière synchro · il y a 12 sec</span></div>} />
    <section className="organizer-hero glass-panel"><div><div className="hero-eyebrow"><span className="pulse-dot" /> ORGANIZER CONTROL ROOM</div><h2>{event.title}<br /><em>La salle est avec vous.</em></h2><p>Les trois activations sont prêtes. Le public attend votre prochain signal.</p><div className="organizer-hero-actions"><button className="button button-light" onClick={() => props.onSelectModule("quiz")}><MonitorPlay size={16} /> Ouvrir le live</button><button className="ghost-light-button"><Users size={15} /> {event.attendees} présents</button></div></div><div className="control-room-visual"><div className="stage-screen"><span><Radio size={13} /> ON AIR</span><strong>10:48</strong><small>Session active</small></div><div className="signal-bars"><i /><i /><i /><i /><i /><i /></div></div></section>
    <section className="metrics-grid"><MetricCard label="Participants actifs" value="284" detail="+24 depuis 10 min" icon={Users} tone="indigo" /><MetricCard label="Quiz en cours" value="68%" detail="1 240 réponses reçues" icon={BarChart3} tone="mint" /><MetricCard label="Questions à modérer" value={String(props.pendingQuestions.length).padStart(2, "0")} detail="3 nouvelles depuis 10:42" icon={MessageCircleQuestion} tone="coral" /><MetricCard label="Tombola" value="236" detail="inscrits · tirage à 11:15" icon={Ticket} tone="lilac" /></section>
    <div className="section-heading section-heading-spaced"><div><span className="eyebrow">Console de session</span><h2>Vos prochains gestes</h2></div><button className="text-button">Voir le programme <ArrowRight size={15} /></button></div>
    <section className="organizer-grid"><div className="glass-card live-console"><div className="card-heading"><div><span className="eyebrow">Scène principale</span><h3>Le signal actuel</h3></div><StatusPill tone="live" dot>En direct</StatusPill></div><div className="console-now"><div className="console-icon"><MonitorPlay size={22} /></div><div><span>Maintenant</span><strong>Keynote · Future Forward</strong><small>Nadia Ilunga · Stratégie & impact</small></div><span className="console-time">10:48</span></div><div className="console-track"><span style={{ width: "62%" }} /></div><div className="console-footer"><span><Clock3 size={14} /> Encore 17 min</span><button className="text-button" onClick={() => props.onSelectModule("quiz")}>Préparer le quiz <ArrowRight size={14} /></button></div></div><div className="glass-card run-of-show"><div className="card-heading"><div><span className="eyebrow">Run of show</span><h3>Le fil de la matinée</h3></div><button className="icon-button icon-button-small"><MoreDots /></button></div><div className="show-line"><span className="show-time">10:30</span><span className="show-dot show-live" /><span><strong>Keynote · Future Forward</strong><small>En direct maintenant</small></span></div><div className="show-line"><span className="show-time">11:15</span><span className="show-dot show-next" /><span><strong>Tombola surprise</strong><small>Préparation requise</small></span></div><div className="show-line"><span className="show-time">11:30</span><span className="show-dot" /><span><strong>Quiz de clôture</strong><small>3 questions · 5 min</small></span></div></div></section>
    <section className="quick-actions"><button onClick={() => props.onSelectModule("quiz")}><span className="quick-action-icon quick-indigo"><MonitorPlay size={18} /></span><span><strong>Piloter le quiz</strong><small>Préparer la prochaine question</small></span><ArrowRight size={16} /></button><button onClick={() => props.onSelectModule("raffle")}><span className="quick-action-icon quick-coral"><Dices size={18} /></span><span><strong>Lancer la tombola</strong><small>236 participants inscrits</small></span><ArrowRight size={16} /></button><button onClick={() => props.onSelectModule("qa")}><span className="quick-action-icon quick-mint"><ShieldCheck size={18} /></span><span><strong>Modérer les questions</strong><small>{props.pendingQuestions.length} questions en attente</small></span><ArrowRight size={16} /></button></section>
  </>;
}

function MoreDots() { return <span className="more-dots"><i /><i /><i /></span>; }

function OrganizerQuiz({ isQuizLive, onToggleQuiz }: React.ComponentProps<typeof OrganizerView>) {
  return <><WorkspaceHeader kicker="Organisateur · Quiz live" title="Faites monter la tension." description="Lancez, rythmez et observez les réponses de la salle." action={<StatusPill tone={isQuizLive ? "live" : "warning"} dot>{isQuizLive ? "Question en direct" : "En attente"}</StatusPill>} /><section className="module-console-layout"><div className="glass-panel quiz-control-stage"><div className="control-stage-top"><span><MonitorPlay size={15} /> Pilotage du quiz</span><span>Question 1 / 3</span></div><div className="control-question"><StatusPill tone="neutral">Culture & impact</StatusPill><h2>Quel est le premier réflexe d’une équipe BTL face à un nouveau terrain ?</h2><div className="control-answer-row"><span><b>A</b> Observer avant d’agir</span><span><b>B</b> Lancer la campagne immédiatement</span><span><b>C</b> Attendre le brief final</span><span><b>D</b> Changer tous les outils</span></div></div><div className="control-stage-footer"><div className="control-timer"><span>Temps de réponse</span><strong>08<small>sec</small></strong></div><div className="control-buttons"><button className={`button ${isQuizLive ? "button-dark" : "button-primary"}`} onClick={onToggleQuiz}>{isQuizLive ? <><Pause size={15} /> Mettre en pause</> : <><Play size={15} fill="currentColor" /> Lancer la question</>}</button><button className="button button-ghost"><RefreshCw size={15} /> Réinitialiser</button></div></div></div><aside className="control-side-stack"><div className="glass-card live-audience-card"><span className="eyebrow">Réponses reçues</span><strong>194 <small>/ 284</small></strong><div className="audience-progress"><span style={{ width: "68%" }} /></div><div className="audience-breakdown"><span><i className="dot-coral" /> A · 58%</span><span><i className="dot-lilac" /> B · 24%</span><span><i className="dot-mint" /> C · 13%</span><span><i className="dot-sand" /> D · 5%</span></div></div><div className="glass-card host-note"><Sparkles size={17} /><div><strong>Conseil de rythme</strong><p>La salle répond vite. Gardez la question ouverte 8 secondes.</p></div></div></aside></section><section className="quiz-command-row"><div><span className="eyebrow">Enchaînement</span><h3>Les questions suivantes</h3></div><div className="upcoming-question"><span>02</span><strong>Qu’est-ce qui crée le plus de mémorisation ?</strong><StatusPill tone="neutral">+300 pts</StatusPill><ChevronRight size={16} /></div><div className="upcoming-question upcoming-muted"><span>03</span><strong>Quelle donnée aide le mieux à améliorer l’expérience ?</strong><StatusPill tone="neutral">+350 pts</StatusPill><ChevronRight size={16} /></div></section></>;
}

function OrganizerRaffle({ isDrawing, drawingNumber, raffleWinner, onDrawRaffle }: React.ComponentProps<typeof OrganizerView>) {
  return <><WorkspaceHeader kicker="Organisateur · Tombola" title="Le moment chance arrive." description="Préparez le tirage, lancez le shuffle et révélez votre gagnant." action={<StatusPill tone={isDrawing ? "coral" : "warning"} dot>{isDrawing ? "Shuffle en cours" : "Prête à lancer"}</StatusPill>} /><section className="raffle-control-layout"><div className={`glass-panel raffle-draw-stage ${isDrawing ? "raffle-drawing" : ""}`}><div className="draw-stage-header"><span><Dices size={16} /> Shuffle live</span><span>236 inscrits</span></div><div className="draw-number-wrap"><div className="draw-orbit orbit-one" /><div className="draw-orbit orbit-two" /><div className="draw-number">{drawingNumber}</div>{raffleWinner && <div className="draw-winner-label"><Trophy size={14} /> Gagnant</div>}</div>{raffleWinner ? <div className="winner-reveal"><Avatar initials={raffleWinner.initials} color={raffleWinner.color} size="large" /><div><span className="eyebrow">Numéro gagnant</span><strong>{raffleWinner.name}</strong><small>Ticket #{raffleWinner.ticket} · {raffleWinner.city}</small></div></div> : <p className="draw-instruction">Le numéro s’arrêtera sur un participant. Sa photo et son nom seront révélés sur la scène.</p>}<button className={`button ${isDrawing ? "button-disabled" : "button-coral"}`} onClick={onDrawRaffle} disabled={isDrawing}>{isDrawing ? <><RefreshCw size={16} className="spin" /> Shuffle en cours…</> : raffleWinner ? <><RefreshCw size={16} /> Relancer un tirage</> : <><Dices size={16} /> Lancer le tirage</>}</button></div><aside className="raffle-control-side"><div className="glass-card raffle-stats"><div className="card-heading"><div><span className="eyebrow">Dans le chapeau</span><h3>236 participants</h3></div><Ticket size={20} /></div><div className="raffle-stat-row"><span>Tickets attribués</span><strong>236 / 284</strong></div><div className="audience-progress"><span style={{ width: "83%" }} /></div><div className="raffle-stat-row"><span>Dernière inscription</span><strong>il y a 24 sec</strong></div><div className="avatar-stack avatar-stack-large">{participants.map((participant) => <Avatar key={participant.id} initials={participant.initials} color={participant.color} size="small" />)}<span className="avatar-more">+231</span></div></div><div className="glass-card raffle-script"><span className="eyebrow">Script animateur</span><p>“Le prochain numéro pourrait être le vôtre. On lance le tirage dans 3… 2… 1…”</p><button className="text-button"><Copy size={14} /> Copier le script</button></div></aside></section></>;
}

function OrganizerQA({ pendingQuestions, onModerateQuestion }: React.ComponentProps<typeof OrganizerView>) {
  return <><WorkspaceHeader kicker="Organisateur · Questions / réponses" title="Faites de la place aux bonnes idées." description="Modérez les questions avant de les envoyer sur la scène." action={<div className="header-status"><StatusPill tone="warning" dot>{pendingQuestions.length} à traiter</StatusPill><button className="button button-small button-ghost"><QrCode size={14} /> Afficher le QR code</button></div>} /><section className="qa-console-layout"><div className="glass-panel moderation-panel"><div className="moderation-toolbar"><div><span className="eyebrow">File de modération</span><h2>Questions entrantes <small>{pendingQuestions.length}</small></h2></div><div className="toolbar-actions"><button className="filter-pill filter-active">En attente <b>{pendingQuestions.length}</b></button><button className="filter-pill">Approuvées <b>06</b></button></div></div><div className="question-list">{pendingQuestions.length === 0 ? <div className="empty-state"><CheckCircle2 size={24} /><strong>La file est à jour.</strong><span>Les prochaines questions apparaîtront ici.</span></div> : pendingQuestions.map((question) => { const speaker = speakers.find((item) => item.id === question.speakerId) ?? speakers[0]; return <article className="moderation-item" key={question.id}><div className="moderation-item-top"><Avatar initials={speaker.initials} color={speaker.color} size="small" /><div><span className="question-target">Pour {speaker.name} · {speaker.role}</span><span className="question-time">{question.time} · {question.author}</span></div><StatusPill tone="warning">À valider</StatusPill></div><p>{question.text}</p><div className="moderation-actions"><button className="button button-small button-approve" onClick={() => onModerateQuestion(question.id, "approved")}><Check size={14} /> Envoyer à la scène</button><button className="button button-small button-ghost" onClick={() => onModerateQuestion(question.id, "rejected")}><X size={14} /> Écarter</button></div></article>; })}</div></div><aside className="qa-side-stack"><div className="glass-card qr-control-card"><QrMatrix /><div><span className="eyebrow">QR code public</span><strong>btl.play/ask</strong><p>Affiché sur les écrans de la salle.</p><button className="text-button"><Copy size={14} /> Copier le lien</button></div></div><div className="glass-card speaker-count-card"><span className="eyebrow">Intervenants actifs</span>{speakers.map((speaker) => <div className="speaker-count-row" key={speaker.id}><Avatar initials={speaker.initials} color={speaker.color} size="small" /><span><strong>{speaker.name}</strong><small>{speaker.role}</small></span><b>{speaker.questionCount}</b></div>)}</div></aside></section></>;
}

function SpeakerView({ questions, speakerFilter, onSpeakerChange }: { questions: QAQuestion[]; speakerFilter: string; onSpeakerChange: (value: string) => void }) {
  const visibleQuestions = questions.filter((question) => question.speakerId === speakerFilter && question.status === "approved");
  const speaker = speakers.find((item) => item.id === speakerFilter) ?? speakers[0];
  return <><WorkspaceHeader kicker="Intervenant · Votre scène" title="Les bonnes questions, au bon moment." description="Préparez vos réponses et faites vivre le dialogue." action={<div className="header-persona"><Avatar initials={speaker.initials} color={speaker.color} /><span><small>Connectée en tant que</small><strong>{speaker.name}</strong></span><StatusPill tone="success" dot>Intervenante</StatusPill></div>} /><section className="speaker-hero glass-panel"><div><div className="hero-eyebrow"><span className="pulse-dot" /> PROCHAINE PRISE DE PAROLE · 11:30</div><h2>Votre scène est prête.<br /><em>Votre voix aussi.</em></h2><p>3 questions sont prêtes pour vous. Parcourez-les avant votre passage sur scène.</p><button className="button button-light"><Mic2 size={16} /> Préparer ma séquence</button></div><div className="speaker-hero-stat"><ProgressRing value={72} /><span>de la session<br />écoulée</span></div></section><div className="speaker-switcher"><span className="eyebrow">Voir les questions de</span>{speakers.map((item) => <button key={item.id} className={speakerFilter === item.id ? "speaker-tab-active" : ""} onClick={() => onSpeakerChange(item.id)}><Avatar initials={item.initials} color={item.color} size="small" />{item.name}</button>)}</div><section className="speaker-content-grid"><div className="glass-panel speaker-questions"><div className="card-heading"><div><span className="eyebrow">File Q/R · modérée</span><h2>{speaker.name}</h2></div><StatusPill tone="success" dot>{visibleQuestions.length} questions prêtes</StatusPill></div>{visibleQuestions.length === 0 ? <div className="empty-state"><MessageCircleQuestion size={25} /><strong>Aucune question publiée pour le moment.</strong><span>Votre équipe de production vous fera signe dès qu’une question est prête.</span></div> : visibleQuestions.map((question, index) => <article className="speaker-question" key={question.id}><div className="speaker-question-number">0{index + 1}</div><div><p>{question.text}</p><span><Clock3 size={13} /> {question.time} · {question.author}</span></div><button className="icon-button icon-button-small"><ChevronRight size={16} /></button></article>)}</div><aside className="speaker-side-stack"><div className="glass-card speaker-next-card"><span className="eyebrow">Votre prochain temps fort</span><strong>Panel · Expérience client</strong><span>11:30 — 12:00 · Scène Horizon</span><div className="speaker-next-progress"><span style={{ width: "42%" }} /></div><small>Dans 42 minutes</small></div><div className="glass-card speaker-note-card"><Sparkles size={17} /><div><strong>Note de production</strong><p>Le public est particulièrement curieux sur la mesure d’impact. Gardez un exemple terrain prêt.</p></div></div></aside></section></>;
}

export default App;
