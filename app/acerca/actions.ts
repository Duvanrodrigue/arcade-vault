"use server";

import { Resend } from "resend";
import {
  validateContact,
  type ContactInput,
  type ContactResult,
} from "@/lib/contact";

export async function sendContact(input: ContactInput): Promise<ContactResult> {
  const data = validateContact(input);
  if (!data) return { ok: false, error: "invalid" };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error(
      "[contact] Faltan variables de entorno: RESEND_API_KEY, CONTACT_TO_EMAIL o CONTACT_FROM_EMAIL.",
    );
    return { ok: false, error: "send_failed" };
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      replyTo: data.email,
      subject: `[Arcade Vault] Nuevo mensaje de ${data.name}`,
      text: `Nombre: ${data.name}\nCorreo: ${data.email}\n\nMensaje:\n${data.message}\n`,
    });
    if (error) {
      console.error("[contact] Resend rechazó el envío:", error.name, error.message);
      return { ok: false, error: "send_failed" };
    }
  } catch (e) {
    console.error("[contact] Fallo al llamar a Resend:", e instanceof Error ? e.message : "desconocido");
    return { ok: false, error: "send_failed" };
  }

  return { ok: true, name: data.name };
}
