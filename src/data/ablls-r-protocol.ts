import categoryA from './ablls-r/category-a.json';
import categoryB from './ablls-r/category-b.json';
import categoryC from './ablls-r/category-c.json';
import categoryD from './ablls-r/category-d.json';
import categoryE from './ablls-r/category-e.json';
import categoryF from './ablls-r/category-f.json';
import categoryG from './ablls-r/category-g.json';
import categoryH from './ablls-r/category-h.json';
import categoryI from './ablls-r/category-i.json';
import categoryJ from './ablls-r/category-j.json';
import categoryK from './ablls-r/category-k.json';
import categoryL from './ablls-r/category-l.json';
import categoryM from './ablls-r/category-m.json';
import categoryN from './ablls-r/category-n.json';
import categoryP from './ablls-r/category-p.json';
import categoryQ from './ablls-r/category-q.json';
import categoryR from './ablls-r/category-r.json';
import categoryS from './ablls-r/category-s.json';
import categoryT from './ablls-r/category-t.json';
import categoryU from './ablls-r/category-u.json';
import categoryV from './ablls-r/category-v.json';
import categoryW from './ablls-r/category-w.json';
import categoryX from './ablls-r/category-x.json';
import categoryY from './ablls-r/category-y.json';
import categoryZ from './ablls-r/category-z.json';

export interface AbllsItem {
  id: string;
  text: string;
  objective?: string | null;
  sd?: string | null;
  response?: string | null;
  maxScore: number;
  criteria: { score: number; text: string }[];
}

export interface AbllsCategory {
  id: string;
  title: string;
  items: AbllsItem[];
}

export const ABLLS_PROTOCOL: AbllsCategory[] = [
  categoryA,
  categoryB,
  categoryC,
  categoryD,
  categoryE,
  categoryF,
  categoryG,
  categoryH,
  categoryI,
  categoryJ,
  categoryK,
  categoryL,
  categoryM,
  categoryN,
  categoryP,
  categoryQ,
  categoryR,
  categoryS,
  categoryT,
  categoryU,
  categoryV,
  categoryW,
  categoryX,
  categoryY,
  categoryZ,
];

export const getCategory = (id: string) => ABLLS_PROTOCOL.find((c) => c.id === id);
export const getItem = (id: string) => {
  const catId = id.charAt(0);
  const category = getCategory(catId);
  return category?.items.find((i) => i.id === id);
};
