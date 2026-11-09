"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { sendContact } from "@/app/acerca/actions";
import { CONTACT_LIMITS } from "@/lib/contact";

const EMPTY = { name: "", email: "", message: "" };

export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  function triggerShake() {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShake(true);
    shakeTimer.current = setTimeout(() => setShake(false), 400);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      triggerShake();
      return;
    }

    setPending(true);
    setFailed(false);
    try {
      const result = await sendContact(form);
      if (result.ok) {
        setSent(result.name);
      } else {
        setFailed(true);
        triggerShake();
      }
    } catch {
      setFailed(true);
      triggerShake();
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setSent(null);
    setFailed(false);
    setForm(EMPTY);
  }

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      onSubmit={onSubmit}
      noValidate
    >
      <div aria-live="polite">
        {sent === null ? (
          <>
            <div className="field">
              <label htmlFor="contact-name">NOMBRE</label>
              <input
                id="contact-name"
                name="name"
                autoComplete="name"
                maxLength={CONTACT_LIMITS.name}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="px_kai"
              />
            </div>
            <div className="field">
              <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={CONTACT_LIMITS.email}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jugador@vault.gg"
              />
            </div>
            <div className="field">
              <label htmlFor="contact-message">MENSAJE</label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                maxLength={CONTACT_LIMITS.message}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Cuéntanos qué tienes en mente…"
              />
            </div>
            <button
              className="btn xl press"
              type="submit"
              style={{ width: "100%" }}
              disabled={pending}
            >
              {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
            </button>
            {failed && (
              <p className="form-error" role="alert">
                [ERROR] No se pudo enviar. Intenta de nuevo.
              </p>
            )}
          </>
        ) : (
          <div className="terminal-success">
            <div className="term-bar">
              <span className="dot r"></span>
              <span className="dot y"></span>
              <span className="dot g"></span>
              <span className="term-title">VAULT-OS // TERMINAL</span>
            </div>
            <div className="term-body">
              <div className="line">
                <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
              </div>
              <div className="line dim">[OK] Conectando con servidor…</div>
              <div className="line dim">[OK] Validando contenido…</div>
              <div className="line dim">[OK] Transmitiendo paquete…</div>
              <div className="line success">
                &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sent.toUpperCase()}.
                <span className="caret">_</span>
              </div>
              <div style={{ marginTop: 18 }}>
                <button className="btn ghost" type="button" onClick={reset}>
                  ENVIAR OTRO MENSAJE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
