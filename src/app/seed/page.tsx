"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react";

// --- DUMMY DATA ---

const TEAM_MEMBERS = [
  { id: "tm1", name: 'Dr. Maria Garcia', initials: 'MG', role: 'Senior ABA Therapist', color: '#4A90E2', sessions: 32, clients: 12, email: "maria@tempo.com" },
  { id: "tm2", name: 'Dr. Andrei Ionescu', initials: 'AI', role: 'Coordinator', color: '#10B981', sessions: 28, clients: 8, email: "andrei@tempo.com" },
  { id: "tm3", name: 'Dr. Elena Popescu', initials: 'EP', role: 'Speech Therapist', color: '#8B5CF6', sessions: 24, clients: 10, email: "elena@tempo.com" },
  { id: "tm4", name: 'Dr. Pavel Stefan', initials: 'PS', role: 'Occupational Therapist', color: '#F59E0B', sessions: 20, clients: 6, email: "pavel@tempo.com" },
];

// Client data migrated from legacy SQL database
const CLIENTS = [
  { id: "adelina2511", name: "Adelina Maria Laura Letu", phone: "0770706421", birthDate: "2019-11-25", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0, programIds: ["prog_1", "prog_2", "prog_3"] },
  { id: "ahmadi2006", name: "Ahmadi Adrin", phone: "0757083554", birthDate: "2021-06-20", medicalInfo: "", isArchived: false, progress: 0, programIds: ["prog_4", "prog_5"] },
  { id: "alex6130", name: "Mocanu Alexandru Matei", phone: "0723262003", birthDate: "2016-04-05", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0, programIds: ["prog_6", "prog_7", "prog_8"] },
  { id: "amalia8204", name: "Amalia Vespan", phone: "0721114504", birthDate: null, medicalInfo: "astm bronsic", isArchived: false, progress: 0, programIds: ["prog_9", "prog_10"] },
  { id: "ana2107", name: "Ana Maria Zamfir", phone: "0721055890", birthDate: "2019-07-21", medicalInfo: "Mentat (5mil), Pantoten (5ml), D3, Omega3", isArchived: false, progress: 0, programIds: ["prog_11", "prog_12"] },
  { id: "aurora2306", name: "Aurora Sophia Alexe", phone: "0726206763", birthDate: "2022-06-23", medicalInfo: "Alergie la fructe de mare", isArchived: false, progress: 0 },
  { id: "bicheru1507", name: "Bicheru Ana Caroline", phone: "0722240323", birthDate: "2021-07-15", medicalInfo: "hiperactivitate bronsica fara tratament", isArchived: false, progress: 0 },
  { id: "bulea0709", name: "Bulea Iacob Mihai", phone: "0734774615", birthDate: "2021-09-07", medicalInfo: "", isArchived: false, progress: 0 },
  { id: "cezar1802", name: "Cezar Casian Dinca", parentEmail: "stefan.dinca07@gmail.com", phone: "0746 060 987", birthDate: "2021-02-18", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0, programIds: ["prog_1", "prog_5", "prog_9"] },
  { id: "clara2109", name: "Clara Medeea Postolache", phone: "0747559027", birthDate: "2022-09-21", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "colin1110", name: "Colin Andrei Dragan", phone: "0727065668", birthDate: "2018-10-11", medicalInfo: "Anafranil", isArchived: false, progress: 0 },
  { id: "david0609", name: "David Samuel Meri", phone: "0728083702", birthDate: "2015-09-06", medicalInfo: "", isArchived: false, progress: 0 },
  { id: "david0610", name: "David Marian Burticel", phone: "0760397349", birthDate: "2018-10-06", medicalInfo: "Rispolept, Depakin", isArchived: false, progress: 0 },
  { id: "denis1298", name: "Denis Georgian Mehangief", phone: "0729877489", birthDate: "2020-04-06", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "dima6571", name: "Dima Tudor", phone: "0720087456", birthDate: null, medicalInfo: "", isArchived: false, progress: 0 },
  { id: "dolgu6015", name: "Dolgu Alex", phone: "0743937770", birthDate: null, medicalInfo: "", isArchived: false, progress: 0 },
  { id: "dominic0307", name: "Dominic Mihail Georgescu", phone: "0733995530", birthDate: "2019-07-03", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "eduard3108", name: "Eduard Buja", phone: "0751214154", birthDate: "2020-08-31", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "efremia1701", name: "Efremia Niculescu", phone: "0723952601", birthDate: "2021-01-17", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "eliza9375", name: "Eliza Alexandra Dragan", phone: "", birthDate: "2016-02-28", medicalInfo: "Concerta", isArchived: false, progress: 0 },
  { id: "emilia1207", name: "Emilia Ioana Ipate", phone: "0723525709", birthDate: "2022-07-12", medicalInfo: "Alergie lapte de vaca si derivate (posibil)", isArchived: false, progress: 0 },
  { id: "eric0404", name: "Eric Buja", phone: "0751214154", birthDate: "2022-04-04", medicalInfo: "hemiperaza stanga ventriculomegalie sechele post AVC, paralizie cerebrala spastica unilaterla", isArchived: false, progress: 0 },
  { id: "eric7712", name: "Ionita Erick Andrei", phone: "0762151857", birthDate: "2013-01-29", medicalInfo: "Bitinex, Neurovert", isArchived: false, progress: 0 },
  { id: "evelin2211", name: "Evelin Ioana Matache", phone: "0723194433", birthDate: "2018-11-22", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "fabi3219", name: "Braileanu Fabian Gabriel", phone: "0770809855", birthDate: "2020-04-15", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "gabriela0307", name: "Gabriela Cristiana Maria Cozma", phone: "0760325144", birthDate: "2021-07-03", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "ionita1509", name: "Ionita Matei Andrei", phone: "0768092119", birthDate: "2020-09-15", medicalInfo: "", isArchived: false, progress: 0 },
  { id: "ionita1904", name: "Ionita Marc Alexandru", phone: "0768092119", birthDate: "2022-04-19", medicalInfo: "omega 3, vitamene complex B, Pediakid", isArchived: false, progress: 0 },
  { id: "irina4275", name: "Suteu Iana Florentina Irina", phone: "", birthDate: "2000-06-06", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "joy4567", name: "Copaci Elisabeth Joy", phone: "0732731994", birthDate: null, medicalInfo: "Alergii la rosii, ananas, prune. Intoleranta la gluten si histamina.", isArchived: false, progress: 0 },
  { id: "maher1110", name: "Maher Kadour", phone: "0753101004", birthDate: "2020-10-11", medicalInfo: "", isArchived: false, progress: 0 },
  { id: "maia2903", name: "Maia Berghian", phone: "0744855763", birthDate: "2023-03-29", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "maria1210", name: "Maria Ecaterina Lucaci", phone: "0723259396", birthDate: "2021-10-12", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "matei2709", name: "Matei Serban Curelea", phone: "0744357422", birthDate: "2019-09-27", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "mathias1501", name: "Mathias Alexandru Staicu", phone: "0786072385", birthDate: "2020-01-15", medicalInfo: "Vigantol", isArchived: false, progress: 0 },
  { id: "medeea1611", name: "Medeea Ana Gabrielea Anghel", phone: "0729844350", birthDate: "2021-11-16", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "mirela1357", name: "Tone Maria Isabela", phone: "0765437340", birthDate: null, medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "mirela1906", name: "Mirela Teodora Minu Popa", phone: "0735317255", birthDate: "2016-06-19", medicalInfo: "Bitinex, Rispolet", isArchived: false, progress: 0 },
  { id: "nectaria0401", name: "Nectaria Stefania Rusu", phone: "0729939702", birthDate: "2022-01-04", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "nichita9876", name: "Nichita Sebastian Mihalte", phone: "0728875686", birthDate: null, medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "pavel1510", name: "Pavel Ilan Croitoru", phone: "0747873025", birthDate: "2021-10-15", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "petru2012", name: "Petru Eric Croitoru", phone: "0747873025", birthDate: "2019-12-20", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "rami1110", name: "Rami Kadour", phone: "0753101004", birthDate: "2020-10-11", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "rares3005", name: "Rares Alexandru Ghita", phone: "0732521650", birthDate: "2018-05-30", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "robert1812", name: "Robert Mark Oliver Timofte", phone: "0731794971", birthDate: "2014-12-18", medicalInfo: "ambrozie", isArchived: false, progress: 0 },
  { id: "savu1234", name: "Savu Rafael", phone: "0729644222", birthDate: null, medicalInfo: "", isArchived: false, progress: 0 },
  { id: "selin7002", name: "Selin Cosman", phone: "0761041864", birthDate: null, medicalInfo: "Tonotil, ulei de peste, omega 3, Cestone", isArchived: false, progress: 0 },
  { id: "stefan1274", name: "Stefan Matache", phone: "0723194433", birthDate: null, medicalInfo: "", isArchived: false, progress: 0 },
  { id: "stefan6428", name: "Stefan Negru", phone: "0767899093", birthDate: "2019-04-06", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "suditu1912", name: "Suditu Eric Cristian", phone: "", birthDate: "2022-12-19", medicalInfo: "", isArchived: false, progress: 0 },
  { id: "teri8813", name: "Ionescu Ecaterina", phone: "0724521559", birthDate: null, medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "tom0903", name: "Tom Andrei Potecaru", phone: "0761752718", birthDate: "2022-03-09", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "toma0910", name: "Toma Ioan Budulus", phone: "0730570097", birthDate: "2018-10-09", medicalInfo: "", isArchived: false, progress: 0 },
  { id: "toni1505", name: "Toni (Antonie-Ioan) Dumitru", phone: "", birthDate: "2020-05-15", medicalInfo: "Rispolept", isArchived: false, progress: 0 },
  { id: "tudor0107", name: "Tudor Condruc", phone: "0766763958", birthDate: "2020-07-01", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "valentin1611", name: "Valentin Alexandru Rimbu", phone: "0766104342", birthDate: "2021-11-16", medicalInfo: "Alergie la nuca de cocos!", isArchived: false, progress: 0 },
  { id: "vic1589", name: "Victor Vulcan", phone: "0740824698", birthDate: null, medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "victor0405", name: "Victor Ioan Brinzea", phone: "0722349489", birthDate: "2019-05-04", medicalInfo: "fara alergii, fara medicatie", isArchived: false, progress: 0 },
  { id: "zian2206", name: "Zian Matei Vlad", phone: "0736243611", birthDate: "2021-06-22", medicalInfo: "Alergie la vancomicina, tratament neuro", isArchived: false, progress: 0, programIds: ["prog_1", "prog_5", "prog_9"] },
  { 
    id: "test-child-id", 
    name: "Alex Test Child", 
    parentEmail: "parent@test.com", 
    parentName: "Alexandru Parent",
    phone: "0700000000", 
    birthDate: "2020-01-01", 
    medicalInfo: "No allergies. Test user.", 
    isArchived: false, 
    progress: 68, 
    programIds: ["prog_1", "prog_2", "prog_3"],
    clientCode: "DEMO123" 
  },
];

// Services/Event Types migrated from legacy SQL database
const SERVICES = [
  { id: "coordination", label: "Coordonare", isBillable: true, basePrice: 250.00, requiresTime: true },
  { id: "day-off", label: "Zi libera", isBillable: false, basePrice: 0.00, requiresTime: false },
  { id: "dezvoltare-personala", label: "Dezvoltare personala", isBillable: true, basePrice: 200.00, requiresTime: true },
  { id: "evaluare", label: "Evaluare", isBillable: true, basePrice: 250.00, requiresTime: true },
  { id: "gestiune-acte", label: "Gestiune acte administrative", isBillable: true, basePrice: 0.00, requiresTime: true },
  { id: "group-therapy", label: "Terapie de grup", isBillable: true, basePrice: 150.00, requiresTime: true },
  { id: "logopedie", label: "Logopedie", isBillable: true, basePrice: 195.00, requiresTime: true },
  { id: "pauza-masa", label: "Pauza de masa", isBillable: false, basePrice: 0.00, requiresTime: false },
  { id: "psihoterapie", label: "Psihoterapie", isBillable: true, basePrice: 250.00, requiresTime: true },
  { id: "sedinta", label: "Sedinta", isBillable: false, basePrice: 200.00, requiresTime: false },
  { id: "therapy", label: "Terapie", isBillable: true, basePrice: 195.00, requiresTime: true },
];

const PROGRAMS = [
  { id: "prog_1", title: "Imitare orala", description: "Reproduce miscarile gurii si sunetele produse de terapeut (ex: suflat, deschis gura, pronuntat silabe)." },
  { id: "prog_10", title: "Gesturi si limbaj functional", description: "Copilul foloseste gesturi sau cuvinte pentru a cere, a refuza sau a comunica nevoi („vreau apa”, „gata”)." },
  { id: "prog_11", title: "Imitare verbala", description: "Repeta cuvinte sau propozitii dupa adult („spune mama”, „spune apa”)." },
  { id: "prog_12", title: "Joc si miscare", description: "Activitati care combina jocul cu exercitiile fizice pentru coordonare si socializare." },
  { id: "prog_13", title: "Atentie", description: "Exercitii pentru a creste capacitatea de concentrare pe o sarcina sau pe interlocutor." },
  { id: "prog_2", title: "Stimulare de limbaj", description: "Activitati pentru a creste dorinta si capacitatea copilului de a comunica verbal." },
  { id: "prog_20", title: "test program3", description: "test program descriere" },
  { id: "prog_3", title: "Instructiuni functionale", description: "Urmeaza comenzi simple din viata de zi cu zi („adu mingea”, „pune cana pe masa”)." },
  { id: "prog_4", title: "Imitare motorie cu si fara obiect", description: "Copiaza actiuni ale adultului care implica obiecte (ex: bate toba, împinge o masinuta)." },
  { id: "prog_5", title: "Receptiv obiecte/actiuni/categorii", description: "Copilul învata sa recunoasca si sa indice obiecte atunci când sunt denumite („arata scaunul”)." },
  { id: "prog_6", title: "Motricitate", description: "Exercitii pentru dezvoltarea miscarilor fine si grosiere (ex: apucare, sarituri, tras linii)." },
  { id: "prog_7", title: "Raspuns la nume", description: "Învata sa se întoarca sau sa raspunda cand îsi aude numele." },
  { id: "prog_8", title: "Asteapta", description: "Învata sa astepte pe rând, si amâne o dorinta sau o actiune." },
  { id: "prog_9", title: "Joc social", description: "Exercitii de interactiune si schimb reciproc în joc (ex: „da-mi mingea”, „hai sa construim împreuna”)." },
  { id: "prog_cauzalitatea_emotiilor", title: "Cauzalitatea emotiilor", description: "Cum se simte? De ce e trist/fericit/obosit?" },
  { id: "prog_colorat_desenat", title: "Colorat/Desenat", description: "" },
  { id: "prog_comunicare_si_limbaj", title: "Comunicare si limbaj", description: "" },
  { id: "prog_conversatie", title: "Conversatie", description: "afirmatii mutuale" },
  { id: "prog_da_nu_factual", title: "Da/Nu factual", description: "" },
  { id: "prog_discriminare_comportamente", title: "Discriminare comportamente", description: "" },
  { id: "prog_expresiv_obiecte_actiuni_categorii", title: "Expresiv obiecte/actiuni/categorii", description: "" },
  { id: "prog_lucru_independent", title: "Lucru independent", description: "" },
  { id: "prog_mand", title: "MAND", description: "" },
  { id: "prog_matematica", title: "Matematica", description: "" },
  { id: "prog_potriviri", title: "Potriviri", description: "" },
  { id: "prog_pozitii_spatiale", title: "Pozitii spatiale", description: "" },
  { id: "prog_scris_citit", title: "Scris/citit", description: "" },
  { id: "prog_scris_si_colorat", title: "Scris si colorat", description: "" },
  { id: "prog_secventialitate", title: "Secventialitate", description: "" },
  { id: "prog_sintaxa", title: "Sintaxa", description: "" },
  { id: "prog_tact", title: "TACT", description: "" },
  { id: "prog_temporalitate", title: "Temporalitate", description: "" },
  { id: "prog_teoria_mintii", title: "Teoria Mintii", description: "" },
  { id: "prog_transmitere_de_mesaj", title: "Transmitere de mesaj", description: "" },
  { id: "prog_whq_in_povesti", title: "WHQ in povesti", description: "" },
];

// Helper to get today at specific hour
const getTodayAt = (hour: number, minute: number = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const EVENTS = [
  {
    id: "evt1",
    clientId: "c1",
    therapistId: "tm1",
    title: "ABA Session",
    type: "ABA Session",
    status: "completed",
    startTime: getTodayAt(9, 0),
    endTime: getTodayAt(10, 0),
    attendance: "present",
    programScores: { matching: 3, imitation: 2, verbal: 4 },
    notes: "Good focus today."
  },
  {
    id: "evt2",
    clientId: "c2",
    therapistId: "tm1",
    title: "Speech Therapy",
    type: "Speech Therapy",
    status: "in-progress",
    startTime: getTodayAt(10, 30),
    endTime: getTodayAt(11, 30),
    attendance: "present",
    programScores: {},
    notes: ""
  },
  {
    id: "evt3",
    clientId: "c3",
    therapistId: "tm2",
    title: "ABA Session",
    type: "ABA Session",
    status: "upcoming",
    startTime: getTodayAt(13, 0),
    endTime: getTodayAt(14, 0),
    attendance: "unknown",
    programScores: {},
    notes: ""
  },
  {
    id: "evt4",
    clientId: "c4",
    therapistId: "tm3",
    title: "Evaluation",
    type: "Evaluation",
    status: "upcoming",
    startTime: getTodayAt(15, 0),
    endTime: getTodayAt(16, 0),
    attendance: "unknown",
    programScores: {},
    notes: ""
  }
];

export default function SeedPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [log, setLog] = useState<string[]>([]);

  const addToLog = (msg: string) => setLog(prev => [...prev, msg]);

  const handleSeed = async () => {
    setStatus("loading");
    setLog([]);
    addToLog(`Starting database seed... Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

    try {
      const batch = writeBatch(db);

      // 1. Team Members
      addToLog(`Preparing ${TEAM_MEMBERS.length} team members...`);
      TEAM_MEMBERS.forEach(tm => {
        const ref = doc(db, "team_members", tm.id);
        batch.set(ref, tm);
      });

      // 2. Clients
      addToLog(`Preparing ${CLIENTS.length} clients...`);
      CLIENTS.forEach(client => {
        const ref = doc(db, "clients", client.id);
        batch.set(ref, client);
      });

      // 3. Events
      addToLog(`Preparing ${EVENTS.length} events...`);
      EVENTS.forEach(evt => {
        const ref = doc(db, "events", evt.id);
        batch.set(ref, evt);
      });

      // 4. Services (Event Types)
      addToLog(`Preparing ${SERVICES.length} services...`);
      SERVICES.forEach(service => {
        const ref = doc(db, "services", service.id);
        batch.set(ref, service);
      });

      // 5. Programs (Migration from SQL)
      addToLog(`Preparing ${PROGRAMS.length} programs from legacy SQL...`);
      PROGRAMS.forEach(prog => {
        const ref = doc(db, "programs", prog.id);
        batch.set(ref, prog);
      });

      // Commit
      addToLog("Committing batch write to Firestore...");
      await batch.commit();

      addToLog("Success! Database populated.");
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      addToLog(`Error: ${err.message}`);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Database Seeder</h1>
            <p className="text-sm text-neutral-500">Populate Firestore with dummy data</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            This will overwrite existing data in the following collections:
            <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">team_members</code>,
            <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">clients</code>,
            <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">events</code>,
            <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">services</code>,
            <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">programs</code>.
          </p>

          <button
            onClick={handleSeed}
            disabled={status === "loading" || status === "success"}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Seeding...
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Seeding Complete
              </>
            ) : (
              "Run Seed Script"
            )}
          </button>

          {/* Logs */}
          <div className="bg-neutral-100 dark:bg-neutral-950 rounded-lg p-4 font-mono text-xs h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-800">
            {log.length === 0 ? (
              <span className="text-neutral-400 italic">Waiting to start...</span>
            ) : (
              log.map((msg, i) => (
                <div key={i} className="mb-1 text-neutral-700 dark:text-neutral-300">
                  {msg}
                </div>
              ))
            )}
            {status === "error" && (
              <div className="flex items-center gap-2 text-error-600 mt-2 font-bold">
                <AlertCircle className="w-4 h-4" />
                Seeding Failed
              </div>
            )}
          </div>
          
          {status === "success" && (
             <a href="/" className="block text-center text-sm text-primary-600 hover:underline">
               Return to Dashboard
             </a>
          )}
        </div>
      </div>
    </div>
  );
}
