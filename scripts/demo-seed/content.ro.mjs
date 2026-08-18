/**
 * Romanian content pools for the demo seeder. Every piece of free text the app
 * displays must be Romanian — the demo roster, programmes and services already
 * are, and mixed-language screenshots look broken.
 *
 * Clinical phrasing follows ABA convention as used in Romanian practice
 * (cerere/mand, etichetare/tact, prompt, generalizare, întărire).
 */

/** Session notes for a session the child attended and did well in. */
export const NOTES_GOOD = [
  "Sesiune foarte bună. A colaborat de la început, fără comportamente de opoziție. Am lucrat cererea spontană cu 3 obiecte preferate.",
  "Copilul a fost atent și motivat. Contact vizual susținut în majoritatea încercărilor. Am redus promptul fizic la unul gestual.",
  "Progres vizibil la imitarea motrică. A reprodus 6 din 8 mișcări fără prompt. Recompensa cu joc a funcționat foarte bine.",
  "A cerut singur pauza folosind cuvântul, fără să fie solicitat. Prima dată când apare spontan în ședință.",
  "Sesiune productivă. Am generalizat etichetarea culorilor pe obiecte noi din cameră. Răspunsuri corecte în 8 din 10 încercări.",
  "Foarte cooperant azi. A stat la masă 15 minute fără să se ridice, față de 8 minute săptămâna trecută.",
  "A răspuns bine la instrucțiuni în doi pași. Am început să introduc și instrucțiuni cu obiecte din altă cameră.",
  "Interacțiune bună cu terapeutul. A inițiat de două ori jocul, fără să fie invitat. Am întărit imediat de fiecare dată.",
  "Am lucrat pe intraverbale simple. Completează cântece familiare și răspunde la întrebări despre el.",
  "Sesiune calmă și eficientă. Tranzițiile între activități s-au făcut fără proteste, cu avertisment vizual.",
];

/** Session notes for an attended session that was harder going. */
export const NOTES_MIXED = [
  "Început dificil, a fost agitat primele 10 minute. După pauza senzorială s-a reglat și am reușit să lucrăm restul ședinței.",
  "Nivel de atenție mai scăzut decât de obicei. Mama a menționat că nu a dormit bine. Am scurtat încercările și am crescut frecvența întăririlor.",
  "A refuzat inițial activitatea de masă. Am lucrat prin joc și am reușit să obținem răspunsuri corecte spre final.",
  "Câteva comportamente de opoziție la tranziții. Am folosit avertisment vizual cu timer, care a redus protestele.",
  "Sesiune mai puțin structurată azi — copilul a fost răcit. Am menținut doar programele deja stăpânite, fără obiective noi.",
  "Distras de zgomotul de pe hol. Am mutat activitatea în camera mică și s-a concentrat semnificativ mai bine.",
  "A avut nevoie de mai multe prompturi decât în ședințele anterioare. Revenim săptămâna viitoare la nivelul anterior de suport.",
  "Rezistență la activitatea de scriere. Am alternat cu activități preferate și am obținut 4 încercări corecte.",
];

export const NOTES_ABSENT = [
  "Ședință anulată — copilul este bolnav. Părintele a anunțat dimineața.",
  "Absent, fără anunț prealabil. Am contactat familia pentru reprogramare.",
  "Anulat de familie din motive personale.",
  "Copilul nu s-a prezentat. Am lăsat mesaj părintelui.",
];

export const NOTES_EXCUSED = [
  "Absență anunțată din timp — programare medicală. Reprogramat pentru săptămâna viitoare.",
  "Familia a anunțat cu 24h înainte. Perioadă de vacanță.",
  "Absență motivată — control la medicul specialist.",
  "Anunțat în avans, copilul este în recuperare după viroză.",
];

export const PROGRAM_NOTES = [
  "Răspunsuri corecte constante, pregătit pentru generalizare.",
  "Necesită încă prompt gestual ocazional.",
  "Fluctuant — depinde mult de nivelul de motivație.",
  "Progres bun, am crescut criteriul de la 3 la 5 încercări consecutive.",
  "Stagnare ușoară, revizuim procedura de întărire.",
  "Stăpânit în cabinet, urmează generalizarea acasă.",
];

export const DIAGNOSES = [
  { primaryDiagnosis: "Tulburare de spectru autist", levels: [1, 2, 3] },
  { primaryDiagnosis: "Tulburare de spectru autist asociată cu întârziere de limbaj", levels: [2, 3] },
  { primaryDiagnosis: "Întârziere în dezvoltarea limbajului expresiv", levels: [1, 2] },
  { primaryDiagnosis: "ADHD, formă combinată", levels: [1, 2] },
  { primaryDiagnosis: "Tulburare mixtă a dezvoltării", levels: [2] },
];

export const HOMEWORK = [
  {
    title: "Cereri spontane acasă",
    description:
      "De 3 ori pe zi, așteptați 5 secunde înainte de a oferi obiectul preferat, ca să îi dați ocazia să ceară singur. Notați dacă a cerut prin cuvânt, gest sau imagine.",
  },
  {
    title: "Imitare în oglindă",
    description:
      "5 minute zilnic în fața oglinzii: bateți din palme, ridicați mâinile, deschideți gura. Lăudați orice încercare de imitare.",
  },
  {
    title: "Rutina de seară cu suport vizual",
    description:
      "Folosiți planșa cu imagini pentru pași (pijama, dinți, poveste, somn). Arătați imaginea înainte de fiecare pas.",
  },
  {
    title: "Etichetarea obiectelor din bucătărie",
    description:
      "În timpul mesei, numiți 5 obiecte și cereți-i să le arate. Variați obiectele de la o zi la alta.",
  },
  {
    title: "Joc paralel cu fratele",
    description:
      "10 minute de joc alături, cu aceleași jucării. Nu forțați interacțiunea, doar apropierea fizică.",
  },
  {
    title: "Tranziții cu avertisment",
    description:
      "Anunțați cu 2 minute înainte de orice schimbare de activitate, folosind timer-ul. Notați dacă au apărut proteste.",
  },
  {
    title: "Alegeri între două opțiuni",
    description:
      "De cel puțin 5 ori pe zi oferiți-i o alegere clară (măr sau banană?). Respectați întotdeauna alegerea făcută.",
  },
  {
    title: "Exerciții de suflat",
    description:
      "Baloane de săpun, lumânare, paie în apă — 5 minute zilnic pentru controlul respirației.",
  },
];

export const OBJECTIVES = [
  "Cere spontan 5 obiecte preferate, fără prompt, în 8 din 10 ocazii",
  "Imită 10 mișcări motrice grosiere la cerere, fără prompt fizic",
  "Menține contactul vizual 3 secunde la apelarea numelui, în 9 din 10 încercări",
  "Etichetează 20 de obiecte uzuale din imagini, cu acuratețe de 90%",
  "Urmează instrucțiuni simple în doi pași, în 8 din 10 ocazii",
  "Stă la masă 15 minute în activitate structurată, fără să se ridice",
  "Răspunde la întrebări sociale simple (Cum te cheamă? Câți ani ai?)",
  "Se joacă alături de un alt copil 10 minute, fără comportamente de evitare",
  "Solicită pauză folosind cuvânt sau imagine, în loc de comportament de opoziție",
  "Generalizează cererea de ajutor în 3 medii diferite",
  "Denumește 10 acțiuni din imagini, fără prompt",
  "Se îmbracă independent la nivel de tricou și pantaloni",
];

export const PLAN_NAMES = [
  "Plan de intervenție — comunicare funcțională",
  "Plan de intervenție — autonomie și rutine zilnice",
  "Plan de intervenție — abilități sociale de bază",
  "Plan de intervenție — limbaj receptiv și expresiv",
  "Plan de intervenție — reducerea comportamentelor de opoziție",
];

export const EXPENSES = [
  { title: "Chirie spațiu cabinet", category: "rent", amount: 4500, isRecurring: true },
  { title: "Utilități (curent, apă, gaz)", category: "utilities", amount: 780, isRecurring: true },
  { title: "Internet și telefonie", category: "utilities", amount: 220, isRecurring: true },
  { title: "Contribuții și taxe salariale", category: "taxes", amount: 1800, isRecurring: true },
  { title: "Materiale terapie (jocuri, cartonașe, consumabile)", category: "supplies", amount: 640 },
  { title: "Servicii contabilitate", category: "other", amount: 500, isRecurring: true },
  { title: "Promovare online și materiale tipărite", category: "marketing", amount: 900 },
  { title: "Curățenie și produse de igienă", category: "supplies", amount: 310 },
  { title: "Formare continuă echipă (workshop ABA)", category: "other", amount: 1400 },
  { title: "Asigurare spațiu și echipamente", category: "other", amount: 380 },
];

export const DOCUMENTS = [
  { name: "Raport de evaluare inițială.pdf", category: "report" },
  { name: "Consimțământ informat — prelucrare date.pdf", category: "consent" },
  { name: "Plan de intervenție personalizat.pdf", category: "report" },
  { name: "Scrisoare medicală — neuropsihiatrie infantilă.pdf", category: "medical" },
  { name: "Certificat de încadrare în grad de handicap.pdf", category: "administrative" },
  { name: "Raport de progres semestrial.pdf", category: "report" },
];

/** Short staff <-> parent exchanges. `from` is "staff" or "parent". */
export const CHAT_THREADS = [
  [
    { from: "parent", text: "Bună ziua! Voiam să vă întreb cum a fost ședința de azi." },
    {
      from: "staff",
      text: "Bună ziua! A fost o ședință foarte bună — a cerut singur pauza, fără să îi solicităm. Este prima dată când apare spontan.",
    },
    {
      from: "parent",
      text: "Ce veste bună! Acasă încă ne arată cu degetul, dar o să încercăm și noi cu așteptarea de 5 secunde.",
    },
    {
      from: "staff",
      text: "Exact așa. Dacă în 5 secunde nu cere, promptați cu modelul verbal și întăriți imediat. V-am trimis și tema scrisă.",
    },
  ],
  [
    {
      from: "staff",
      text: "Bună ziua! Vă anunț că am încărcat raportul de progres pentru acest semestru în secțiunea Documente.",
    },
    { from: "parent", text: "Mulțumesc mult! L-am văzut. Aș avea o întrebare despre obiectivul cu tranzițiile." },
    {
      from: "staff",
      text: "Sigur. Îl putem discuta la ședința de consiliere de vineri, ca să avem timp să intrăm în detalii.",
    },
  ],
  [
    { from: "parent", text: "Bună ziua, din păcate mâine nu putem ajunge, are programare la medic." },
    { from: "staff", text: "Am notat, mulțumim că ne-ați anunțat din timp. Reprogramăm pentru joi la aceeași oră?" },
    { from: "parent", text: "Da, joi este perfect. Mulțumim!" },
  ],
];

export const EVENT_TITLE_BY_SERVICE = {
  therapy: "Terapie ABA",
  logopedie: "Logopedie",
  evaluare: "Evaluare",
  "group-therapy": "Terapie de grup",
  "consiliere-parinti": "Consiliere părinți",
  psihoterapie: "Psihoterapie",
  "dezvoltare-personala": "Dezvoltare personală",
  coordination: "Coordonare caz",
};
