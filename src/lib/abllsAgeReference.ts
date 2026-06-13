// ABLLS-R age-expectation reference. Clinically validated by the BCBA (Corina).
//
// ABLLS-R is criterion-referenced and NOT age-normed. `expectedFromMonths` is a
// conservative clinical HEURISTIC for the typical earliest age at which a section
// is generally targeted/expected — used only to SUGGEST that a younger child's
// un-targeted sections be marked N/A (reversible, clinician-confirmed). It is
// never a developmental norm and never auto-applies. Values err toward earlier
// expectation, so we under-suggest N/A rather than risk hiding a real deficit.

export interface AbllsAgeRef {
  code: string;
  expectedFromMonths: number;
  academic: boolean;
  note: string; // clinician-facing (Romanian)
}

export const ABLLS_AGE_REFERENCE: AbllsAgeRef[] = [
  { code: "A", expectedFromMonths: 18, academic: false, note: "Cooperare și valoarea recompensei — fundament al oricărei intervenții, vizat de la început." },
  { code: "B", expectedFromMonths: 18, academic: false, note: "Performanțe vizuale (potrivire, sortare) — abilitate timpurie de bază." },
  { code: "C", expectedFromMonths: 18, academic: false, note: "Limbaj receptiv — fundamental, se lucrează încă din primele etape." },
  { code: "D", expectedFromMonths: 18, academic: false, note: "Imitație motorie — prerechizit timpuriu pentru învățare." },
  { code: "E", expectedFromMonths: 18, academic: false, note: "Imitație vocală — fundament pentru limbajul expresiv." },
  { code: "F", expectedFromMonths: 18, academic: false, note: "Cererea (mands) — prima formă funcțională de comunicare, vizată devreme." },
  { code: "G", expectedFromMonths: 24, academic: false, note: "Etichetare verbală (tacts) — apare după primele cereri și imitații." },
  { code: "H", expectedFromMonths: 30, academic: false, note: "Intraverbal — limbaj mai complex, de obicei după ce există tacts și limbaj receptiv." },
  { code: "I", expectedFromMonths: 24, academic: false, note: "Vocalizare spontană — emergentă odată cu limbajul expresiv funcțional." },
  { code: "J", expectedFromMonths: 36, academic: false, note: "Sintaxă și gramatică — necesită un repertoriu verbal deja format." },
  { code: "K", expectedFromMonths: 24, academic: false, note: "Joc și loisire — joc funcțional și independent, se dezvoltă progresiv." },
  { code: "L", expectedFromMonths: 24, academic: false, note: "Interacțiune socială — se construiește treptat, cu complexitate crescândă." },
  { code: "M", expectedFromMonths: 36, academic: false, note: "Instrucție de grup — presupune pregătire pentru context de grup/grădiniță." },
  { code: "N", expectedFromMonths: 36, academic: false, note: "Rutina clasei — abilități de pregătire pentru mediul școlar/grădiniță." },
  { code: "P", expectedFromMonths: 24, academic: false, note: "Generalizarea răspunsurilor — se urmărește pe parcurs, pe măsură ce apar abilități." },
  { code: "Q", expectedFromMonths: 60, academic: true, note: "Cititul — abilitate academică de pregătire școlară; de regulă nu e încă așteptată la copiii mici." },
  { code: "R", expectedFromMonths: 60, academic: true, note: "Matematica — abilitate academică; de obicei vizată în jurul vârstei școlare." },
  { code: "S", expectedFromMonths: 60, academic: true, note: "Scrisul — abilitate academică/grafomotorie; nu e încă așteptată la copiii mici." },
  { code: "T", expectedFromMonths: 66, academic: true, note: "Spelling/ortografie (ROMÂNĂ) — abilitate academică avansată, după debutul cititului și scrisului." },
  { code: "U", expectedFromMonths: 30, academic: false, note: "Îmbrăcare — autonomie adaptativă, se dezvoltă progresiv în anii preșcolari." },
  { code: "V", expectedFromMonths: 24, academic: false, note: "Mâncat — abilitate de autonomie de bază, timpurie." },
  { code: "W", expectedFromMonths: 36, academic: false, note: "Îngrijire personală (grooming) — autonomie care se maturizează în timp." },
  { code: "X", expectedFromMonths: 30, academic: false, note: "Toaletă — de regulă vizată în jurul vârstei de 2-3 ani, variabil individual." },
  { code: "Y", expectedFromMonths: 18, academic: false, note: "Motricitate grosieră — abilități motorii de bază, timpurii." },
  { code: "Z", expectedFromMonths: 18, academic: false, note: "Motricitate fină — abilități motorii de bază, timpurii." },
];

const BY_CODE = new Map(ABLLS_AGE_REFERENCE.map((r) => [r.code, r]));

export function getAbllsAgeRef(code: string): AbllsAgeRef | undefined {
  return BY_CODE.get(code);
}

/** True if the section is generally age-expected for the given age. Unknown age
 *  or unknown section → true (never suggest N/A without a basis). */
export function isAbllsSectionAgeExpected(code: string, ageMonths: number | null | undefined): boolean {
  if (ageMonths == null) return true;
  const r = BY_CODE.get(code);
  return r ? ageMonths >= r.expectedFromMonths : true;
}

/** Section codes that are typically NOT yet age-expected for this age. */
export function getNotYetExpectedAbllsSections(ageMonths: number | null | undefined): string[] {
  if (ageMonths == null) return [];
  return ABLLS_AGE_REFERENCE.filter((r) => ageMonths < r.expectedFromMonths).map((r) => r.code);
}
