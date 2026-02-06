import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import ro from "./locales/ro.json";
import en from "./locales/en.json";

const isObject = (item: any) => (item && typeof item === 'object' && !Array.isArray(item));

/**
 * Deep merges two objects. 
 * target is the base (e.g. JSON file), source is the override (e.g. Firestore)
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

export async function syncTranslationsToFirestore() {
  const locales = { ro, en };

  for (const [lang, translations] of Object.entries(locales)) {
    const docRef = doc(db, "system_settings", `translations_${lang}`);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.log(`Initializing Firestore translations for: ${lang}`);
      await setDoc(docRef, {
        data: translations,
        updatedAt: new Date().toISOString(),
        version: "1.0"
      });
    } else {
      console.log(`Deep merging translations for ${lang}...`);
      const firestoreData = docSnap.data().data;
      
      // translations (local JSON) is the base, firestoreData (user edits) overrides it
      const mergedData = deepMerge(translations, firestoreData);
      
      await setDoc(docRef, {
        data: mergedData,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  }
}