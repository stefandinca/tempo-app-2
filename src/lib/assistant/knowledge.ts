// Curated app-guidance knowledge base for the assistant, split by language.
// Injected into the (cacheable) system prompt so the assistant can answer "how do
// I use TempoApp" questions grounded in real workflows. Only the language of the
// current conversation is sent — sending both would ~double the cached prefix.
// Keep factual and current.

const EN = `
# TempoApp — how it works (reference for the assistant)

**Roles.** Superadmin/Admin: full access incl. billing, analytics, team, settings. Coordinator: clients, scheduling, evaluations, intervention plans, analytics (no billing/team/settings). Therapist: own sessions, assigned clients, scoring, evaluations, voice/video. Parent: read-only portal for their own child (separate login with an access code).

**Navigation.** Desktop: left sidebar. Mobile: bottom tab bar + a "More" drawer. Cmd/Ctrl+K opens the command palette for quick navigation and actions (new event, new client, send message).

**Dashboard.** Today's sessions, KPIs (active clients, attendance, sessions, revenue), recent activity feed, quick attendance buttons.

**Calendar & sessions.** Views: Month, Week, Day, Agenda. Create a session with the 4-step wizard (team → clients → programs/notes → confirm); supports recurring events. Open a session to mark attendance (Present/Absent/Excused), score programs (minus / zero / prompted / plus; long-press a counter to decrement), add notes, record voice feedback or session videos, and share them with the parent.

**Clients.** Add/edit a client (name, birth date, diagnosis, level, assigned therapists). The client profile has tabs: Overview, Evaluations, VB-MAPP, Programs, Intervention Plan, Homework, Documents, Billing. Generate a parent access code from the client to let the parent log in.

**Evaluations.** Five instruments: ABLLS-R, VB-MAPP, Portage, CARS, Carolina. Open the client's Evaluations tab (or the VB-MAPP tab), start a new evaluation, score each category/milestone, Save as draft and resume later, then Complete. From a completed evaluation you can view the summary, generate a PDF report, and (when 2+ completed evaluations of the same type exist) press "Compare" to compare any two side by side. VB-MAPP milestones are scored 0 / ½ / 1 and have task-analysis "supporting skills" you can check off.

**Programs & intervention plans.** Define therapy programs per client; track success rate and trend across sessions. Coordinators build intervention plans with objectives (Not started → In progress → Achieved).

**Homework.** Therapists/coordinators assign homework with a frequency; parents mark items complete and add notes from the portal.

**Billing (Admin).** Invoices, team payouts, and expenses by month. Generate a client's monthly invoice from attendance; sync to SmartBill for legal e-invoicing.

**Team (Admin).** Invite members by email, set role and salary, track utilization.

**Messaging & notifications.** Real-time chat threads between staff and with parents; bell icon shows unread alerts; per-user notification preferences in Settings.

**Settings.** Profile, appearance (light/dark/system), language (EN/RO), billing config, account limits, notification preferences.

**Parent portal.** Login with the access code (no account). Shows: home (next session, latest summary, billing), schedule, progress (programs, evaluations), homework, messages, documents, billing, child profile. Parents can listen to shared voice feedback and watch shared session videos.
`.trim();

const RO = `
# TempoApp — cum funcționează (referință pentru asistent)

**Roluri.** Superadmin/Admin: acces complet, inclusiv facturare, analize, echipă, setări. Coordonator: clienți, programare, evaluări, planuri de intervenție, analize (fără facturare/echipă/setări). Terapeut: propriile sesiuni, clienții alocați, scorare, evaluări, feedback vocal/video. Părinte: portal read-only pentru propriul copil (autentificare separată cu cod de acces).

**Navigare.** Desktop: bară laterală. Mobil: bară de jos + sertar „Mai mult”. Cmd/Ctrl+K deschide paleta de comenzi pentru navigare și acțiuni rapide (eveniment nou, client nou, mesaj).

**Tablou de bord.** Sesiunile de azi, indicatori (clienți activi, prezență, sesiuni, venit), flux de activitate, butoane rapide de prezență.

**Calendar și sesiuni.** Vizualizări: Lună, Săptămână, Zi, Agendă. Creezi o sesiune cu asistentul în 4 pași (echipă → clienți → programe/note → confirmare); sunt acceptate sesiuni recurente. Deschizi o sesiune pentru a marca prezența (Prezent/Absent/Motivat), a scora programele (minus / zero / promptat / plus; apăsare lungă pentru a decrementa), a adăuga note, a înregistra feedback vocal sau videoclipuri și a le partaja cu părintele.

**Clienți.** Adaugi/editezi un client (nume, dată naștere, diagnostic, nivel, terapeuți alocați). Profilul are file: Prezentare, Evaluări, VB-MAPP, Programe, Plan de intervenție, Teme, Documente, Facturare. Generezi un cod de acces pentru ca părintele să se conecteze.

**Evaluări.** Cinci instrumente: ABLLS-R, VB-MAPP, Portage, CARS, Carolina. Deschizi fila Evaluări (sau VB-MAPP), începi o evaluare, scorezi fiecare categorie/jalon, Salvezi ca ciornă și reiei mai târziu, apoi Finalizezi. Dintr-o evaluare finalizată poți vedea sumarul, genera un raport PDF și (când există 2+ evaluări finalizate de același tip) apeși „Compară” pentru a compara două dintre ele. Jaloanele VB-MAPP se scorează 0 / ½ / 1 și au „abilități de sprijin” bifabile.

**Programe și planuri de intervenție.** Definești programe per client; urmărești rata de succes și tendința. Coordonatorii creează planuri cu obiective (Neînceput → În progres → Atins).

**Teme.** Terapeuții/coordonatorii alocă teme cu o frecvență; părinții le bifează și adaugă note din portal.

**Facturare (Admin).** Facturi, plăți echipă și cheltuieli lunare. Generezi factura lunară a unui client din prezență; sincronizezi cu SmartBill pentru e-Factura.

**Echipă (Admin).** Inviți membri pe email, setezi rolul și salariul, urmărești gradul de ocupare.

**Mesaje și notificări.** Conversații în timp real între personal și cu părinții; clopoțelul arată alertele necitite; preferințe de notificare în Setări.

**Setări.** Profil, aspect (luminos/întunecat/sistem), limbă (EN/RO), configurare facturare, limite cont, preferințe notificări.

**Portal părinte.** Autentificare cu codul de acces. Afișează: acasă (următoarea sesiune, ultimul sumar, facturare), program, progres, teme, mesaje, documente, facturare, profil copil. Părinții pot asculta feedback vocal și viziona videoclipuri partajate.
`.trim();

/** Only the conversation's language is injected, to keep the cached prefix small. */
export function appKnowledge(lang: "en" | "ro"): string {
  return lang === "ro" ? RO : EN;
}
