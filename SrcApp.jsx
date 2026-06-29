import { useState, useEffect, useRef } from "react";
import {
  Plus, X, BookOpen, PenSquare, Trash2, Clock, ChevronRight, Check,
  AlertCircle, Loader2, Lock, Flame, Sparkles, Target, ArrowRight, Zap
} from "lucide-react";
import { supabase } from "./supabaseClient";

const SUBJECTS = [
  { id: "physics", label: "Physics", color: "#5EEAD4", glow: "rgba(94,234,212,0.18)" },
  { id: "chemistry", label: "Chemistry", color: "#F87171", glow: "rgba(248,113,113,0.18)" },
  { id: "maths", label: "Maths", color: "#A78BFA", glow: "rgba(167,139,250,0.18)" },
];

const subjectMeta = (id) => SUBJECTS.find((s) => s.id === id) || SUBJECTS[0];

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getLocalUnlocked() {
  try {
    return JSON.parse(localStorage.getItem("crack:unlocked") || "[]");
  } catch {
    return [];
  }
}
function setLocalUnlocked(arr) {
  try {
    localStorage.setItem("crack:unlocked", JSON.stringify(arr));
  } catch {}
}

export default function App() {
  const [view, setView] = useState("notes");
  const [activeSubject, setActiveSubject] = useState("physics");
  const [notes, setNotes] = useState([]);
  const [tests, setTests] = useState([]);
  const [unlocked, setUnlocked] = useState(getLocalUnlocked());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTest, setActiveTest] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError("");
    const [notesRes, testsRes] = await Promise.all([
      supabase.from("notes").select("*").order("created_at", { ascending: false }),
      supabase.from("tests").select("*").order("created_at", { ascending: false }),
    ]);
    if (notesRes.error || testsRes.error) {
      setError("Couldn't reach the database. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly.");
    } else {
      setNotes(notesRes.data.map(fromRowNote));
      setTests(testsRes.data.map(fromRowTest));
    }
    setLoading(false);
  }

  function fromRowNote(row) {
    return { id: row.id, subject: row.subject, title: row.title, chapter: row.chapter, body: row.body, createdAt: row.created_at };
  }
  function fromRowTest(row) {
    return { id: row.id, subject: row.subject, title: row.title, duration: row.duration, questions: row.questions, createdAt: row.created_at };
  }

  async function addNote(note) {
    const { error: err } = await supabase.from("notes").insert({
      id: note.id, subject: note.subject, title: note.title, chapter: note.chapter, body: note.body, created_at: note.createdAt,
    });
    if (err) { setError("Couldn't save the concept. Try again."); return; }
    setNotes((prev) => [note, ...prev]);
  }

  async function deleteNote(id) {
    const { error: err } = await supabase.from("notes").delete().eq("id", id);
    if (err) { setError("Couldn't delete that. Try again."); return; }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function addTest(test) {
    const { error: err } = await supabase.from("tests").insert({
      id: test.id, subject: test.subject, title: test.title, duration: test.duration, questions: test.questions, created_at: test.createdAt,
    });
    if (err) { setError("Couldn't save the drill. Try again."); return; }
    setTests((prev) => [test, ...prev]);
  }

  async function deleteTest(id) {
    const { error: err } = await supabase.from("tests").delete().eq("id", id);
    if (err) { setError("Couldn't delete that. Try again."); return; }
    setTests((prev) => prev.filter((t) => t.id !== id));
  }

  function unlockNote(id) {
    setUnlocked((u) => {
      if (u.includes(id)) return u;
      const next = [...u, id];
      setLocalUnlocked(next);
      return next;
    });
  }

  const subjectNotes = notes.filter((n) => n.subject === activeSubject);
  const crackedCount = subjectNotes.filter((n) => unlocked.includes(n.id)).length;

  return (
    <div style={{ background: "#0B1120", minHeight: "100vh", fontFamily: "'Source Serif 4', serif", color: "#ECEEF5" }}>
      <GlobalStyles />
      <AmbientGlow subject={activeSubject} />
      <Header />
      <SubjectTabs active={activeSubject} onChange={setActiveSubject} />

      <main className="wrap">
        {error && (
          <div className="errbar">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError("")}>dismiss</button>
          </div>
        )}

        {view !== "take" && (
          <ProgressBanner subject={activeSubject} total={subjectNotes.length} cracked={crackedCount} />
        )}

        <ModeToggle view={view} onChange={setView} />

        {loading ? (
          <div className="loading">
            <Loader2 className="spin" size={22} />
            <span>Waking up the archive…</span>
          </div>
        ) : view === "notes" ? (
          <NotesView
            subject={activeSubject}
            notes={subjectNotes}
            unlocked={unlocked}
            onUnlock={unlockNote}
            onAdd={addNote}
            onDelete={deleteNote}
          />
        ) : view === "tests" ? (
          <TestsView
            subject={activeSubject}
            tests={tests.filter((t) => t.subject === activeSubject)}
            onCreate={addTest}
            onDelete={deleteTest}
            onStart={(t) => { setActiveTest(t); setView("take"); }}
          />
        ) : (
          <TakeTestView test={activeTest} onExit={() => setView("tests")} />
        )}
      </main>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&family=JetBrains+Mono:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      .wrap { max-width: 880px; margin: 0 auto; padding: 24px 20px 90px; position: relative; z-index: 1; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 var(--glow-c); } 50% { box-shadow: 0 0 0 8px transparent; } }
      @keyframes flip-reveal { from { transform: rotateX(-8deg) translateY(6px); opacity: 0; } to { transform: rotateX(0) translateY(0); opacity: 1; } }
      @keyframes rise-in { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
      .loading { display:flex; align-items:center; gap:10px; justify-content:center; padding:70px 0; color:#8B93AC; font-size:14px; font-family:'Space Grotesk',sans-serif; }
      .errbar { display:flex; align-items:center; gap:8px; background:rgba(248,113,113,0.12); border:1px solid #F87171; color:#F87171; padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:16px; font-family:'Space Grotesk',sans-serif; }
      .errbar button { margin-left:auto; background:none; border:none; color:#F87171; text-decoration:underline; cursor:pointer; font-size:12px; }
      button:focus-visible, input:focus-visible, textarea:focus-visible, [tabindex]:focus-visible { outline: 2px solid #FFB020; outline-offset: 2px; }
      ::selection { background: #FFB020; color:#0B1120; }
      input::placeholder, textarea::placeholder { color: #5A6280; }
      @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } }
    `}</style>
  );
}

function AmbientGlow({ subject }) {
  const meta = subjectMeta(subject);
  return (
    <div
      aria-hidden
      style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 800px 500px at 50% -10%, ${meta.glow}, transparent 70%)`,
        transition: "background 0.6s ease",
      }}
    />
  );
}

function Header() {
  return (
    <header style={{ borderBottom: "1px solid #1B2540", padding: "26px 20px 20px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Zap size={16} style={{ color: "#FFB020" }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, letterSpacing: "0.12em", color: "#FFB020", textTransform: "uppercase", fontWeight: 600 }}>
              for the 0.1%-ile chasers
            </span>
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 30, margin: 0, letterSpacing: "-0.02em", color: "#ECEEF5" }}>
            The Crack
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#8B93AC", fontFamily: "'Space Grotesk', sans-serif" }}>
            Notes you crack open, not skim. Shared with every aspirant here.
          </p>
        </div>
      </div>
    </header>
  );
}

function SubjectTabs({ active, onChange }) {
  return (
    <div style={{ display: "flex", maxWidth: 880, margin: "0 auto", padding: "14px 20px 0", gap: 6, position: "relative", zIndex: 1 }}>
      {SUBJECTS.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            style={{
              flex: 1,
              padding: "11px 8px",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              border: isActive ? `1px solid ${s.color}` : "1px solid #1B2540",
              background: isActive ? "rgba(255,255,255,0.03)" : "transparent",
              color: isActive ? s.color : "#8B93AC",
              cursor: "pointer",
              borderRadius: 10,
              transition: "all 0.2s ease",
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function ProgressBanner({ subject, total, cracked }) {
  const meta = subjectMeta(subject);
  const pct = total > 0 ? Math.round((cracked / total) * 100) : 0;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, marginTop: 22, marginBottom: 4,
      padding: "12px 16px", borderRadius: 12, background: "#131B2E", border: "1px solid #1B2540",
    }}>
      <Flame size={18} style={{ color: meta.color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12.5, color: "#ECEEF5", marginBottom: 5 }}>
          {total === 0 ? "No concepts logged yet" : `${cracked} of ${total} concepts cracked`}
        </div>
        <div style={{ height: 5, borderRadius: 4, background: "#0B1120", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 4, transition: "width 0.5s ease" }} />
        </div>
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: meta.color, flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

function ModeToggle({ view, onChange }) {
  if (view === "take") return null;
  return (
    <div style={{ display: "flex", gap: 8, margin: "18px 0 22px" }}>
      {[{ id: "notes", label: "Notes", icon: BookOpen }, { id: "tests", label: "Practice tests", icon: PenSquare }].map((m) => {
        const Icon = m.icon;
        const isActive = view === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20,
              border: isActive ? "1px solid #FFB020" : "1px solid #1B2540",
              background: isActive ? "rgba(255,176,32,0.1)" : "transparent",
              color: isActive ? "#FFB020" : "#8B93AC",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <Icon size={14} /> {m.label}
          </button>
        );
      })}
    </div>
  );
}

function NotesView({ subject, notes, unlocked, onUnlock, onAdd, onDelete }) {
  const [open, setOpen] = useState(false);
  const meta = subjectMeta(subject);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, margin: 0, color: "#ECEEF5", fontWeight: 600 }}>
          {meta.label} <span style={{ color: "#5A6280", fontWeight: 500 }}>· {notes.length} concept{notes.length !== 1 ? "s" : ""}</span>
        </h2>
        <button onClick={() => setOpen(true)} style={primaryBtn(meta.color)}>
          <Plus size={15} /> Add a concept
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          title="This shelf is empty"
          body={`Be the one who plants the first ${meta.label.toLowerCase()} concept here. Frame it as a question — that's what gets cracked open first.`}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {notes.map((n, i) => (
            <ConceptCard
              key={n.id}
              note={n}
              color={meta.color}
              isUnlocked={unlocked.includes(n.id)}
              onUnlock={() => onUnlock(n.id)}
              onDelete={() => onDelete(n.id)}
              delay={i}
            />
          ))}
        </div>
      )}

      {open && (
        <NoteEditor subject={subject} color={meta.color} onClose={() => setOpen(false)} onSave={async (note) => { await onAdd(note); setOpen(false); }} />
      )}
    </div>
  );
}

function ConceptCard({ note, color, isUnlocked, onUnlock, onDelete, delay }) {
  const [revealed, setRevealed] = useState(isUnlocked);
  const [confirmDel, setConfirmDel] = useState(false);

  function handleReveal() {
    setRevealed(true);
    onUnlock();
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${revealed ? "#1B2540" : color + "55"}`,
        background: revealed ? "#131B2E" : "linear-gradient(155deg, #131B2E 0%, #0F1830 100%)",
        overflow: "hidden",
        animation: `rise-in 0.4s ease ${Math.min(delay * 0.05, 0.3)}s both`,
        position: "relative",
      }}
    >
      {!revealed && (
        <div
          aria-hidden
          style={{
            position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%",
            background: color, "--glow-c": color + "80", animation: "pulse-glow 2.2s ease-in-out infinite",
          }}
        />
      )}

      <button
        onClick={revealed ? undefined : handleReveal}
        style={{
          width: "100%", textAlign: "left", background: "none", border: "none", cursor: revealed ? "default" : "pointer",
          padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 12,
        }}
      >
        <span style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          background: revealed ? "transparent" : color + "1A", border: revealed ? "1px solid #1B2540" : `1px solid ${color}55`,
          color: revealed ? "#5A6280" : color, marginTop: 2,
        }}>
          {revealed ? <Check size={14} /> : <Lock size={13} />}
        </span>
        <div style={{ flex: 1 }}>
          {note.chapter && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
              {note.chapter}
            </div>
          )}
          <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, margin: 0, fontWeight: 600, color: "#ECEEF5", lineHeight: 1.4 }}>
            {note.title}
          </h3>
          {!revealed && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 12.5, color: color, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
              Crack it open <ArrowRight size={13} />
            </div>
          )}
        </div>
      </button>

      {revealed && (
        <div style={{ padding: "0 20px 18px 60px", animation: "flip-reveal 0.4s ease both" }}>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", color: "#C7CCDD", fontFamily: "'Source Serif 4', serif" }}>
            {note.body}
          </p>
          <div style={{ marginTop: 12 }}>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)} style={{ ...iconBtn, fontSize: 11.5 }}>
                <Trash2 size={13} /> remove
              </button>
            ) : (
              <span style={{ display: "inline-flex", gap: 10, fontSize: 11.5 }}>
                <button onClick={onDelete} style={{ ...iconBtn, color: "#F87171", fontWeight: 700 }}>Confirm delete</button>
                <button onClick={() => setConfirmDel(false)} style={iconBtn}>Cancel</button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NoteEditor({ subject, color, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [chapter, setChapter] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  async function handleSave() {
    if (!title.trim() || !body.trim() || saving) return;
    setSaving(true);
    await onSave({ id: uid("note"), subject, title: title.trim(), chapter: chapter.trim(), body: body.trim(), createdAt: Date.now() });
    setSaving(false);
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Sparkles size={15} style={{ color: "#FFB020" }} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#FFB020", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
          new concept
        </span>
      </div>
      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, margin: "4px 0 16px", color: "#ECEEF5" }}>
        Frame it as something worth unlocking
      </h3>
      <Field label="Title — phrase it as a question or a hook">
        <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Why does a spinning top refuse to fall?" style={inputStyle} />
      </Field>
      <Field label="Chapter (optional)">
        <input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Rotational Motion" style={inputStyle} />
      </Field>
      <Field label="The explanation — what they get when they crack it open">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the concept, derivation, or trick…" rows={8} style={{ ...inputStyle, resize: "vertical", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.65 }} />
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button onClick={handleSave} disabled={!title.trim() || !body.trim() || saving} style={primaryBtn(color, !title.trim() || !body.trim() || saving)}>
          {saving ? "Saving…" : "Save concept"}
        </button>
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
      </div>
    </Modal>
  );
}

function TestsView({ subject, tests, onCreate, onDelete, onStart }) {
  const [open, setOpen] = useState(false);
  const meta = subjectMeta(subject);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Spac
