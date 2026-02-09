import { CarolinaDomain } from "@/types/carolina";

export const CAROLINA_PROTOCOL: CarolinaDomain[] = [
  {
    id: "cognitiv",
    title: "Cognitiv",
    sequences: [
      {
        id: "atentie_memorie",
        title: "Atenție și memorie",
        items: [
          { id: "cog_am_1", text: "Privește o persoană care vorbește" },
          { id: "cog_am_2", text: "Reacționează la sunete specifice" },
          { id: "cog_am_3", text: "Găsește un obiect ascuns parțial" },
          { id: "cog_am_4", text: "Găsește un obiect ascuns complet" },
          { id: "cog_am_5", text: "Recunoaște obiecte familiare" }
        ]
      },
      {
        id: "concepte",
        title: "Concepte - Noțiuni generale",
        items: [
          { id: "cog_con_1", text: "Potrivește obiecte identice" },
          { id: "cog_con_2", text: "Potrivește forme simple (cerc, pătrat)" },
          { id: "cog_con_3", text: "Înțelege conceptul de 'mult' vs 'puțin'" }
        ]
      },
      {
        id: "joc_simbolic",
        title: "Joc simbolic",
        items: [
          { id: "cog_js_1", text: "Utilizează obiecte în scop funcțional (ex. perie)" },
          { id: "cog_js_2", text: "Se preface că bea din cană" },
          { id: "cog_js_3", text: "Hrănește o păpușă" }
        ]
      },
      {
        id: "perceptie_vizuala",
        title: "Percepție vizuală",
        items: [
          { id: "cog_pv_1", text: "Construiește un turn din 2 cuburi" },
          { id: "cog_pv_2", text: "Rezolvă un incastru simplu (cerc)" },
          { id: "cog_pv_3", text: "Completează un puzzle din 2 piese" }
        ]
      }
    ]
  },
  {
    id: "comunicare",
    title: "Comunicare",
    sequences: [
      {
        id: "vocabular_expresiv",
        title: "Vocabular expresiv",
        items: [
          { id: "com_ve_1", text: "Emite sunete vocale" },
          { id: "com_ve_2", text: "Spune 'mama' sau 'tata' cu sens" },
          { id: "com_ve_3", text: "Denumește obiecte familiare la cerere" }
        ]
      },
      {
        id: "limbaj_receptiv",
        title: "Limbaj receptiv",
        items: [
          { id: "com_lr_1", text: "Răspunde la nume" },
          { id: "com_lr_2", text: "Execută comenzi simple ('vino', 'dă')" },
          { id: "com_lr_3", text: "Arată părți ale corpului" }
        ]
      }
    ]
  },
  {
    id: "adaptare_sociala",
    title: "Adaptare socială",
    sequences: [
      {
        id: "autoservire",
        title: "Autoservire",
        items: [
          { id: "soc_as_1", text: "Bea din cană ținută de adult" },
          { id: "soc_as_2", text: "Mănâncă cu mâna (biscuiți)" },
          { id: "soc_as_3", text: "Își scoate șosetele" }
        ]
      },
      {
        id: "interpersonal",
        title: "Aptitudini interpersonale",
        items: [
          { id: "soc_int_1", text: "Zâmbește social" },
          { id: "soc_int_2", text: "Participă la jocul cucu-bau" },
          { id: "soc_int_3", text: "Arată afecțiune persoanelor familiare" }
        ]
      }
    ]
  },
  {
    id: "motricitate_fina",
    title: "Motricitate Fină",
    sequences: [
      {
        id: "manipulare",
        title: "Manipulare",
        items: [
          { id: "mf_man_1", text: "Prinde obiecte cu mâna" },
          { id: "mf_man_2", text: "Transferă obiecte dintr-o mână în alta" },
          { id: "mf_man_3", text: "Prinde cu pensa digitală (două degete)" }
        ]
      },
      {
        id: "instrumente",
        title: "Folosirea instrumentelor",
        items: [
          { id: "mf_ins_1", text: "Gâgâlește cu creionul" },
          { id: "mf_ins_2", text: "Imită o linie verticală" },
          { id: "mf_ins_3", text: "Taie hârtia cu foarfeca (haotic)" }
        ]
      }
    ]
  },
  {
    id: "motricitate_grosiera",
    title: "Motricitate Grosieră",
    sequences: [
      {
        id: "locomotie",
        title: "Locomoție",
        items: [
          { id: "mg_loc_1", text: "Merge singur" },
          { id: "mg_loc_2", text: "Aleargă fără să cadă" },
          { id: "mg_loc_3", text: "Urcă scările ținându-se" }
        ]
      },
      {
        id: "echilibru",
        title: "Echilibru și minge",
        items: [
          { id: "mg_ech_1", text: "Stă într-un picior 2 secunde" },
          { id: "mg_ech_2", text: "Aruncă mingea cu mâna" },
          { id: "mg_ech_3", text: "Prinde o minge mare rostogolită" }
        ]
      }
    ]
  }
];
