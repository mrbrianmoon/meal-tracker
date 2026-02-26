import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ─── Constants ───────────────────────────────────────────────
const MEAL_SECTIONS = [
  { key: "breakfast", label: "Breakfast", icon: "☀️" },
  { key: "snacks", label: "Snacks", icon: "🍎" },
  { key: "lunch", label: "Lunch", icon: "🥗" },
  { key: "snackSnacks", label: "Snack Snacks", icon: "🍪" },
  { key: "dinner", label: "Dinner", icon: "🍽️" },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDisplay(d) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function emptyMeals() {
  const m = { waterIntake: 0 };
  MEAL_SECTIONS.forEach(s => { m[s.key] = [""]; });
  return m;
}

// ─── Supabase Storage Helpers ────────────────────────────────
async function saveMeals(dateKey, meals) {
  try {
    const { error } = await supabase
      .from("meal_entries")
      .upsert({ date: dateKey, meals }, { onConflict: "date" });
    if (error) throw error;
  } catch (e) {
    console.error("Save failed:", e);
  }
}

async function loadMeals(dateKey) {
  try {
    const { data, error } = await supabase
      .from("meal_entries")
      .select("meals")
      .eq("date", dateKey)
      .single();
    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
    return data ? data.meals : null;
  } catch (e) {
    console.error("Load failed:", e);
    return null;
  }
}

async function getAllSavedDates() {
  try {
    const { data, error } = await supabase
      .from("meal_entries")
      .select("date");
    if (error) throw error;
    return data ? data.map(r => r.date) : [];
  } catch (e) {
    console.error("Load dates failed:", e);
    return [];
  }
}

// ─── Calendar Component ──────────────────────────────────────
function Calendar({ selectedDate, onSelect, onClose, savedDates }) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const today = new Date();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  return (
    <div ref={ref} style={{
      position: "absolute", top: "100%", left: 0, zIndex: 100, marginTop: 8,
      background: "#1a2e1a", border: "1px solid #2d5a2d", borderRadius: 16,
      padding: 16, boxShadow: "0 16px 48px rgba(0,0,0,0.4)", minWidth: 300,
      animation: "fadeIn 0.2s ease"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={prevMonth} style={calNavBtn}>‹</button>
        <span style={{ color: "#b8e6b8", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15 }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} style={calNavBtn}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ color: "#5a8a5a", fontSize: 11, fontFamily: "'DM Sans', sans-serif", padding: "4px 0", fontWeight: 600 }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const cellDate = new Date(viewYear, viewMonth, day);
          const dk = formatDate(cellDate);
          const isSelected = formatDate(selectedDate) === dk;
          const isToday = formatDate(today) === dk;
          const hasMeals = savedDates.includes(dk);
          return (
            <button key={i} onClick={() => { onSelect(cellDate); onClose(); }} style={{
              background: isSelected ? "#4CAF50" : "transparent",
              color: isSelected ? "#fff" : isToday ? "#7ddf7d" : "#c0d8c0",
              border: isToday && !isSelected ? "1px solid #4CAF50" : "1px solid transparent",
              borderRadius: 8, padding: "6px 0", cursor: "pointer", fontSize: 13,
              fontFamily: "'DM Sans', sans-serif", fontWeight: isSelected ? 700 : 400,
              position: "relative", transition: "all 0.15s ease"
            }}>
              {day}
              {hasMeals && !isSelected && (
                <span style={{
                  position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)",
                  width: 4, height: 4, borderRadius: "50%", background: "#4CAF50"
                }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const calNavBtn = {
  background: "rgba(76,175,80,0.15)", border: "none", color: "#7ddf7d",
  width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 18,
  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700
};

// ─── Scrolling Number Picker ─────────────────────────────────
function ScrollNumberPicker({ value, onChange }) {
  const containerRef = useRef(null);
  const touchStartY = useRef(null);
  const accumulated = useRef(0);
  const clamp = (v) => Math.max(0, Math.min(60, v));

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    onChange(clamp(value + delta));
  }, [onChange, value]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; accumulated.current = 0; };
  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    e.preventDefault();
    const diff = touchStartY.current - e.touches[0].clientY;
    accumulated.current = diff;
    const steps = Math.round(accumulated.current / 18);
    if (steps !== 0) {
      onChange(clamp(value + steps));
      touchStartY.current = e.touches[0].clientY;
      accumulated.current = 0;
    }
  };
  const handleTouchEnd = () => { touchStartY.current = null; };

  const prev2 = clamp(value - 2), prev1 = clamp(value - 1);
  const next1 = clamp(value + 1), next2 = clamp(value + 2);

  return (
    <div ref={containerRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        width: 72, height: 130, overflow: "hidden", borderRadius: 14,
        background: "rgba(76,175,80,0.08)", border: "1px solid rgba(76,175,80,0.2)",
        cursor: "ns-resize", userSelect: "none", position: "relative", touchAction: "none"
      }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 34, background: "linear-gradient(to bottom, rgba(20,45,20,0.95), transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 34, background: "linear-gradient(to top, rgba(20,45,20,0.95), transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 4, right: 4, height: 30, borderRadius: 7, background: "rgba(76,175,80,0.2)", border: "1px solid rgba(76,175,80,0.3)", zIndex: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 0 }}>
        <span style={{ fontSize: 12, color: "rgba(140,200,140,0.2)", lineHeight: "26px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{prev2}</span>
        <span style={{ fontSize: 14, color: "rgba(140,200,140,0.35)", lineHeight: "26px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{prev1}</span>
        <span style={{ fontSize: 20, color: "#7ddf7d", lineHeight: "26px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, zIndex: 3 }}>{value}</span>
        <span style={{ fontSize: 14, color: "rgba(140,200,140,0.35)", lineHeight: "26px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{next1}</span>
        <span style={{ fontSize: 12, color: "rgba(140,200,140,0.2)", lineHeight: "26px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{next2}</span>
      </div>
    </div>
  );
}

// ─── Water Intake Section ────────────────────────────────────
function WaterIntakeSection({ values, onChange }) {
  const [pickerValue, setPickerValue] = useState(0);
  const [flash, setFlash] = useState(false);
  const total = typeof values === "number" ? values : (Array.isArray(values) ? values.reduce((s, v) => s + (typeof v === "number" ? v : 0), 0) : 0);

  const handleOk = () => {
    if (pickerValue === 0) return;
    const newTotal = total + pickerValue;
    onChange(newTotal);
    setPickerValue(0);
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(30,60,30,0.7), rgba(20,45,20,0.9))",
      border: "1px solid #2d5a2d", borderRadius: 16, overflow: "hidden",
      backdropFilter: "blur(10px)", transition: "all 0.3s ease"
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "14px 20px",
        borderBottom: "1px solid rgba(76,175,80,0.15)", background: "rgba(76,175,80,0.06)"
      }}>
        <span style={{ fontSize: 20 }}>💧</span>
        <h3 style={{ margin: 0, color: "#8fce8f", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, letterSpacing: "0.5px" }}>Water Intake</h3>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 4, transition: "all 0.3s ease" }}>
          <span style={{
            fontSize: 28, color: flash ? "#a8f0a8" : "#7ddf7d", fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700, transition: "color 0.3s ease, transform 0.3s ease",
            transform: flash ? "scale(1.15)" : "scale(1)", display: "inline-block"
          }}>{total}</span>
          <span style={{ fontSize: 11, color: "#5a8a5a", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>oz total</span>
        </div>
      </div>
      <div style={{ padding: "20px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <ScrollNumberPicker value={pickerValue} onChange={setPickerValue} />
        <button onClick={handleOk} style={{
          width: 72, height: 130, borderRadius: 14,
          background: pickerValue > 0 ? "linear-gradient(135deg, #4CAF50, #388E3C)" : "rgba(76,175,80,0.08)",
          border: pickerValue > 0 ? "1px solid #4CAF50" : "1px solid rgba(76,175,80,0.2)",
          color: pickerValue > 0 ? "#fff" : "#5a8a5a",
          cursor: pickerValue > 0 ? "pointer" : "default",
          fontSize: 16, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
          letterSpacing: "0.5px", transition: "all 0.2s ease",
          boxShadow: pickerValue > 0 ? "0 4px 12px rgba(76,175,80,0.3)" : "none",
          opacity: pickerValue > 0 ? 1 : 0.5,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>OK</button>
      </div>
    </div>
  );
}

// ─── Meal Section Component ──────────────────────────────────
function MealSection({ section, items, onChange, onAdd }) {
  const inputRefs = useRef([]);

  const handleKeyDown = (idx, e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (items[idx].trim() !== "") {
        if (idx === items.length - 1) { onAdd(); setTimeout(() => inputRefs.current[idx + 1]?.focus(), 50); }
        else inputRefs.current[idx + 1]?.focus();
      }
    }
    if (e.key === "Backspace" && items[idx] === "" && items.length > 1 && idx > 0) {
      e.preventDefault();
      const newItems = items.filter((_, i) => i !== idx);
      onChange(newItems);
      setTimeout(() => inputRefs.current[idx - 1]?.focus(), 50);
    }
  };

  const handleChange = (idx, value) => {
    const newItems = [...items];
    newItems[idx] = value;
    if (idx === items.length - 1 && value.trim() !== "") newItems.push("");
    onChange(newItems);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(30,60,30,0.7), rgba(20,45,20,0.9))",
      border: "1px solid #2d5a2d", borderRadius: 16, overflow: "hidden",
      backdropFilter: "blur(10px)", transition: "all 0.3s ease"
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "14px 20px",
        borderBottom: "1px solid rgba(76,175,80,0.15)", background: "rgba(76,175,80,0.06)"
      }}>
        <span style={{ fontSize: 20 }}>{section.icon}</span>
        <h3 style={{ margin: 0, color: "#8fce8f", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, letterSpacing: "0.5px" }}>{section.label}</h3>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#5a8a5a", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
          {items.filter(i => i.trim()).length} item{items.filter(i => i.trim()).length !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ padding: "8px 12px" }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: item.trim() ? "#4CAF50" : "rgba(76,175,80,0.2)", transition: "all 0.2s ease"
            }} />
            <input
              ref={el => inputRefs.current[idx] = el}
              type="text" value={item}
              onChange={e => handleChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              placeholder={idx === 0 ? `Add ${section.label.toLowerCase()} item...` : ""}
              style={{
                width: "100%", background: "transparent", border: "none",
                borderBottom: "1px solid rgba(76,175,80,0.12)",
                color: "#d4eed4", padding: "10px 4px", fontSize: 14,
                fontFamily: "'DM Sans', sans-serif", outline: "none",
                transition: "border-color 0.2s ease"
              }}
              onFocus={e => e.target.style.borderBottomColor = "rgba(76,175,80,0.4)"}
              onBlur={e => e.target.style.borderBottomColor = "rgba(76,175,80,0.12)"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meals, setMeals] = useState(emptyMeals());
  const [calOpen, setCalOpen] = useState(false);
  const [savedDates, setSavedDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const saveTimer = useRef(null);

  const dateKey = formatDate(selectedDate);

  useEffect(() => { getAllSavedDates().then(dates => setSavedDates(dates)); }, []);

  useEffect(() => {
    setLoading(true);
    loadMeals(dateKey).then(data => {
      if (data) {
        const fixed = { ...data };
        if (fixed.waterIntake === undefined || fixed.waterIntake === null) fixed.waterIntake = 0;
        if (Array.isArray(fixed.waterIntake)) fixed.waterIntake = fixed.waterIntake.reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
        MEAL_SECTIONS.forEach(s => {
          if (!fixed[s.key]) fixed[s.key] = [""];
          else if (fixed[s.key][fixed[s.key].length - 1]?.trim() !== "") {
            fixed[s.key] = [...fixed[s.key], ""];
          }
        });
        setMeals(fixed);
      } else {
        setMeals(emptyMeals());
      }
      setLoading(false);
    });
  }, [dateKey]);

  const autoSave = useCallback((mealsData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const hasContent = MEAL_SECTIONS.some(s => mealsData[s.key]?.some(i => i.trim())) || (mealsData.waterIntake > 0);
      if (hasContent) {
        await saveMeals(dateKey, mealsData);
        setSaveStatus("Saved");
        if (!savedDates.includes(dateKey)) setSavedDates(prev => [...prev, dateKey]);
        setTimeout(() => setSaveStatus(""), 2000);
      }
    }, 800);
  }, [dateKey, savedDates]);

  const updateSection = (key, items) => {
    const newMeals = { ...meals, [key]: items };
    setMeals(newMeals);
    autoSave(newMeals);
  };

  const addItem = (key) => {
    const newMeals = { ...meals, [key]: [...meals[key], ""] };
    setMeals(newMeals);
  };

  const changeDay = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d);
  };

  const isToday = formatDate(selectedDate) === formatDate(new Date());

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a1f0a 0%, #0f2b0f 30%, #132e13 60%, #0a1f0a 100%)",
      fontFamily: "'DM Sans', sans-serif", color: "#d4eed4",
      position: "relative", overflow: "hidden"
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        input::placeholder { color: rgba(140,200,140,0.3); }
        *::-webkit-scrollbar { width: 6px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: #2d5a2d; border-radius: 3px; }
      `}</style>

      <div style={{ position: "fixed", top: "-30%", right: "-20%", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(76,175,80,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-20%", left: "-15%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(56,142,60,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <header style={{ padding: "24px 24px 0", textAlign: "center", animation: "fadeIn 0.4s ease" }}>
        <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#7ddf7d", letterSpacing: "1px" }}>
          Meal Tracker
        </h1>
        <span style={{
          display: "inline-block", marginTop: 4, fontSize: 10, color: "#4a7a4a",
          fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase",
          background: "rgba(76,175,80,0.1)", padding: "3px 12px", borderRadius: 20
        }}>Version 1.0</span>
      </header>

      {/* Date nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "20px 24px", flexWrap: "wrap", animation: "fadeIn 0.4s ease 0.1s both" }}>
        <div style={{ position: "relative" }}>
          <button onClick={() => setCalOpen(!calOpen)} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "linear-gradient(135deg, rgba(76,175,80,0.15), rgba(56,142,60,0.1))",
            border: "1px solid #2d5a2d", borderRadius: 50, padding: "10px 20px",
            color: "#b8e6b8", cursor: "pointer", fontSize: 14,
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500, transition: "all 0.2s ease", whiteSpace: "nowrap"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7ddf7d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {formatDisplay(selectedDate)}
            {isToday && <span style={{ fontSize: 9, background: "#4CAF50", color: "#fff", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>TODAY</span>}
          </button>
          {calOpen && <Calendar selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setCalOpen(false)} savedDates={savedDates} />}
        </div>

        <div style={{
          display: "flex", alignItems: "center",
          background: "linear-gradient(135deg, rgba(76,175,80,0.15), rgba(56,142,60,0.1))",
          border: "1px solid #2d5a2d", borderRadius: 50, overflow: "hidden"
        }}>
          <button onClick={() => changeDay(-1)} style={{
            background: "transparent", border: "none", color: "#7ddf7d",
            padding: "10px 16px", cursor: "pointer", fontSize: 16,
            borderRight: "1px solid rgba(76,175,80,0.2)", display: "flex", alignItems: "center"
          }}>◂</button>
          <span style={{ padding: "10px 16px", fontSize: 13, color: "#8fce8f", fontWeight: 500, minWidth: 40, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
            {DAYS_SHORT[selectedDate.getDay()]}
          </span>
          <button onClick={() => changeDay(1)} style={{
            background: "transparent", border: "none", color: "#7ddf7d",
            padding: "10px 16px", cursor: "pointer", fontSize: 16,
            borderLeft: "1px solid rgba(76,175,80,0.2)", display: "flex", alignItems: "center"
          }}>▸</button>
        </div>

        {saveStatus && (
          <span style={{ fontSize: 11, color: "#4CAF50", fontWeight: 600, animation: "fadeIn 0.2s ease", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {saveStatus}
          </span>
        )}
      </div>

      {/* Meal sections */}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 20px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#5a8a5a" }}>
            <div style={{ animation: "pulse 1.5s infinite" }}>Loading...</div>
          </div>
        ) : (
          <>
            <div style={{ animation: "slideUp 0.3s ease 0s both" }}>
              <WaterIntakeSection values={meals.waterIntake || 0} onChange={(val) => updateSection("waterIntake", val)} />
            </div>
            {MEAL_SECTIONS.map((section, idx) => (
              <div key={section.key} style={{ animation: `slideUp 0.3s ease ${(idx + 1) * 0.07}s both` }}>
                <MealSection
                  section={section}
                  items={meals[section.key] || [""]}
                  onChange={(items) => updateSection(section.key, items)}
                  onAdd={() => addItem(section.key)}
                />
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ textAlign: "center", padding: "20px 0 30px", color: "#3a6a3a", fontSize: 11, fontWeight: 500 }}>
        Meals auto-save as you type • Green dots on calendar = logged days
      </div>
    </div>
  );
}
