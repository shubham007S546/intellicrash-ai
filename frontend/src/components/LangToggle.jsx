import { useState } from "react";

export default function LangToggle() {
  const [lang, setLang] = useState(localStorage.getItem("ic_lang") || "en");

  const toggle = () => {
    const next = lang === "en" ? "hi" : "en";
    setLang(next);
    localStorage.setItem("ic_lang", next);
    window.location.reload();
  };

  return (
    <button
      onClick={toggle}
      style={{
        border: "1px solid #e3eaf5",
        borderRadius: 20,
        padding: "5px 12px",
        fontSize: 12,
        fontWeight: 700,
        color: "#1a73e8",
        background: "#e8f0fe",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {lang === "en" ? "हिंदी" : "English"}
    </button>
  );
}
