/**
 * What a brand-new clinic starts with.
 *
 * Ported VERBATIM from scripts/bootstrap-tenant.mjs, which was the hand-run
 * version of this step. The values are deliberately not re-typed: a service
 * priced differently here than in the script would give clinics onboarded by
 * the two routes different catalogues, and nobody would notice until an
 * invoice came out wrong.
 *
 * Field names must match what the settings tabs read and write — BillingConfigTab
 * writes legalEntities / invoicing / integrations, LimitsConfigTab writes
 * maxActiveClients / maxActiveTeamMembers, and useSystemSettings reads the single
 * document system_settings/config.
 */

export interface SeedService {
  id: string;
  label: string;
  basePrice: number;
  color: string;
  isBillable: boolean;
  requiresTime: boolean;
}
export const SERVICES: SeedService[] = [
  { id: "therapy", label: "Terapie ABA", basePrice: 195, color: "#4A90E2", isBillable: true, requiresTime: true },
  { id: "logopedie", label: "Logopedie", basePrice: 195, color: "#10B981", isBillable: true, requiresTime: true },
  { id: "evaluare", label: "Evaluare", basePrice: 250, color: "#8B5CF6", isBillable: true, requiresTime: true },
  { id: "group-therapy", label: "Terapie de grup", basePrice: 150, color: "#EC4899", isBillable: true, requiresTime: true },
  { id: "consiliere-parinti", label: "Consiliere părinți", basePrice: 200, color: "#F97316", isBillable: true, requiresTime: true },
  { id: "psihoterapie", label: "Psihoterapie", basePrice: 250, color: "#F59E0B", isBillable: true, requiresTime: true },
  { id: "dezvoltare-personala", label: "Dezvoltare personală", basePrice: 200, color: "#84CC16", isBillable: true, requiresTime: true },
  { id: "coordination", label: "Coordonare", basePrice: 250, color: "#06B6D4", isBillable: true, requiresTime: true },
  { id: "pauza-masa", label: "Pauză de masă", basePrice: 0, color: "#9CA3AF", isBillable: false, requiresTime: false },
  { id: "day-off", label: "Zi liberă", basePrice: 0, color: "#D1D5DB", isBillable: false, requiresTime: false },
];

export const PROGRAMS: [string, string, string][] = [
  ["prog_1", "Imitare orala", "Reproduce miscarile gurii si sunetele produse de terapeut (ex: suflat, deschis gura, pronuntat silabe)."],
  ["prog_2", "Stimulare de limbaj", "Activitati pentru a creste dorinta si capacitatea copilului de a comunica verbal."],
  ["prog_3", "Instructiuni functionale", "Urmeaza comenzi simple din viata de zi cu zi (adu mingea, pune cana pe masa)."],
  ["prog_4", "Imitare motorie cu obiect", "Copiaza actiuni ale adultului care implica obiecte (ex: bate toba, impinge o masinuta)."],
  ["prog_5", "Receptiv obiecte", "Copilul invata sa recunoasca si sa indice obiecte atunci cand sunt denumite."],
  ["prog_6", "Motricitate fina", "Exercitii pentru dezvoltarea miscarilor fine (ex: apucare, tras linii, decupare)."],
  ["prog_7", "Raspuns la nume", "Invata sa se intoarca sau sa raspunda cand isi aude numele."],
  ["prog_8", "Asteapta", "Invata sa astepte pe rand, si sa amane o dorinta sau o actiune."],
  ["prog_9", "Joc social", "Exercitii de interactiune si schimb reciproc in joc (da-mi mingea, hai sa construim impreuna)."],
  ["prog_10", "Gesturi functionale", "Copilul foloseste gesturi sau cuvinte pentru a cere, a refuza sau a comunica nevoi."],
  ["prog_11", "Imitare verbala", "Repeta cuvinte sau propozitii dupa adult (spune mama, spune apa)."],
  ["prog_12", "Joc si miscare", "Activitati care combina jocul cu exercitiile fizice pentru coordonare si socializare."],
  ["prog_13", "Atentie", "Exercitii pentru a creste capacitatea de concentrare pe o sarcina sau pe interlocutor."],
  ["prog_14", "MAND", "Cereri verbale - copilul invata sa ceara ceea ce doreste folosind cuvinte."],
  ["prog_15", "TACT", "Denumire - copilul invata sa numeasca obiecte, actiuni, caracteristici din mediu."],
  ["prog_16", "Potriviri", "Potriveste obiecte identice sau similare dupa forma, culoare sau categorie."],
];

export function configDoc(clinicName: string): Record<string, unknown> {
  return {
    legalEntities: [
      {
        id: "entity_1",
        name: clinicName,
        cui: "",
        regNo: "",
        address: "",
        bank: "",
        iban: "",
        email: "",
        phone: "",
        isDefault: true,
      },
    ],
    defaultEntityId: "entity_1",
    invoicing: {
      seriesPrefix: "TMP",
      currentNumber: 1,
      defaultDueDays: 14,
      vatRate: 0,
      footerNotes: "",
    },
    integrations: {
      smartbill: { user: "", token: "" },
    },
    maxActiveClients: 0,
    maxActiveTeamMembers: 0,
    bootstrappedAt: new Date().toISOString(),
  };
}
