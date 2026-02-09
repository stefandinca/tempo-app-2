export type CARSSeverity = 'none' | 'mild-moderate' | 'severe';

export interface CARSScore {
  value: number; // 1, 1.5, 2, 2.5, 3, 3.5, 4
  note: string;
  updatedAt: string;
}

export interface CARSItem {
  id: number;
  title: string;
  descriptions: {
    1: string; // Normal
    2: string; // Mildly abnormal
    3: string; // Moderately abnormal
    4: string; // Severely abnormal
  };
}

export interface CARSEvaluation {
  id: string;
  clientId: string;
  status: 'in_progress' | 'completed';
  evaluatorId: string;
  evaluatorName: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  scores: Record<string, CARSScore>; // Key is item id as string
  totalScore: number;
  severity: CARSSeverity;
}

export const CARS_ITEMS: CARSItem[] = [
  {
    id: 1,
    title: "Relating to People",
    descriptions: {
      1: "Age-appropriate behavior. Child's behavior is consistent with their age.",
      2: "Mildly abnormal relationships. Child may avoid looking at the adult, or may show some resistance to being held.",
      3: "Moderately abnormal relationships. Child appears aloof or unresponsive to adults.",
      4: "Severely abnormal relationships. Child is consistently aloof or unresponsive to what the adult is doing."
    }
  },
  {
    id: 2,
    title: "Imitation",
    descriptions: {
      1: "Appropriate imitation. Child can imitate sounds, words, and movements.",
      2: "Mildly abnormal imitation. Child imitates simple behaviors most of the time, though sometimes with delay.",
      3: "Moderately abnormal imitation. Child imitates only part of the time and require a great deal of persistence.",
      4: "Severely abnormal imitation. Child rarely or never imitates sounds, words, or movements."
    }
  },
  {
    id: 3,
    title: "Emotional Response",
    descriptions: {
      1: "Age-appropriate emotional response. Responses are appropriate to the situation.",
      2: "Mildly abnormal emotional response. Sometimes shows inappropriate type or degree of emotional response.",
      3: "Moderately abnormal emotional response. Shows definite signs of inappropriate emotional responses.",
      4: "Severely abnormal emotional response. Responses are seldom appropriate to the situation; extreme moods."
    }
  },
  {
    id: 4,
    title: "Body Use",
    descriptions: {
      1: "Age-appropriate body use. Moves with same ease and coordination as a child of the same age.",
      2: "Mildly abnormal body use. Some minor peculiarities (e.g., clumsiness, repetitive movements).",
      3: "Moderately abnormal body use. Clearly strange or unusual movements (e.g., finger-flicking, posturing).",
      4: "Severely abnormal body use. Intense or frequent movements of the type listed above."
    }
  },
  {
    id: 5,
    title: "Object Use",
    descriptions: {
      1: "Appropriate interest in and use of objects. Normal interest in toys and other objects.",
      2: "Mildly abnormal interest in or use of objects. May show unusual interest in a toy or play with it inappropriately.",
      3: "Moderately abnormal interest in or use of objects. Child may show very little interest in toys or objects.",
      4: "Severely abnormal interest in or use of objects. May be preoccupied with certain objects or repetitive use."
    }
  },
  {
    id: 6,
    title: "Adaptation to Change",
    descriptions: {
      1: "Age-appropriate response to change. While noting changes in routine, accepts them without undue distress.",
      2: "Mildly abnormal adaptation to change. When adult tries to change tasks, child may continue same activity.",
      3: "Moderately abnormal adaptation to change. Child actively resists changes in routine; becomes distressed.",
      4: "Severely abnormal adaptation to change. Shows severe reactions to change; becomes extremely distressed."
    }
  },
  {
    id: 7,
    title: "Visual Response",
    descriptions: {
      1: "Age-appropriate visual response. Visual behavior is normal and appropriate for age.",
      2: "Mildly abnormal visual response. Must be reminded to look at objects; may look into space.",
      3: "Moderately abnormal visual response. Child must be reminded frequently to look at what they are doing.",
      4: "Severely abnormal visual response. Persistent avoidance of eye contact; extreme peculiarities."
    }
  },
  {
    id: 8,
    title: "Listening Response",
    descriptions: {
      1: "Age-appropriate listening response. Normal listening behavior for age.",
      2: "Mildly abnormal listening response. There may be some lack of response or mild over-reaction to certain sounds.",
      3: "Moderately abnormal listening response. Responses to sounds vary; may ignore a sound or be startled by it.",
      4: "Severely abnormal listening response. Over-reacts or under-reacts to sounds to an extreme degree."
    }
  },
  {
    id: 9,
    title: "Taste, Smell, and Touch Response and Use",
    descriptions: {
      1: "Normal use of and response to taste, smell, and touch. Explores new objects in age-appropriate manner.",
      2: "Mildly abnormal use of taste, smell, or touch. May persist in putting objects in mouth; may smell objects.",
      3: "Moderately abnormal use of taste, smell, or touch. May be moderately preoccupied with smelling/tasting/touching.",
      4: "Severely abnormal use of taste, smell, or touch. Preoccupied with smelling, tasting, or feeling objects."
    }
  },
  {
    id: 10,
    title: "Fear or Nervousness",
    descriptions: {
      1: "Age-appropriate fear or nervousness. Behavior is consistent with the situation.",
      2: "Mildly abnormal fear or nervousness. Shows occasionally either too much or too little fear.",
      3: "Moderately abnormal fear or nervousness. Shows somewhat more or somewhat less fear than expected.",
      4: "Severely abnormal fear or nervousness. Fear persists even after repeated experience with harmless events."
    }
  },
  {
    id: 11,
    title: "Verbal Communication",
    descriptions: {
      1: "Normal verbal communication, age-appropriate. Speech is normal for age.",
      2: "Mildly abnormal verbal communication. Speech shows some delay; ecolalia or pronoun reversal.",
      3: "Moderately abnormal verbal communication. Speech may be absent; when present, it is a mix of ecolalia and jargon.",
      4: "Severely abnormal verbal communication. Does not use meaningful speech; peculiar sounds or noises."
    }
  },
  {
    id: 12,
    title: "Nonverbal Communication",
    descriptions: {
      1: "Normal use of nonverbal communication, age-appropriate. Normal use of gestures and facial expressions.",
      2: "Mildly abnormal nonverbal communication. Immature use of gestures; may point vaguely.",
      3: "Moderately abnormal nonverbal communication. Child is generally unable to express needs or desires nonverbally.",
      4: "Severely abnormal nonverbal communication. Uses only peculiar or bizarre gestures which have no apparent meaning."
    }
  },
  {
    id: 13,
    title: "Activity Level",
    descriptions: {
      1: "Normal activity level for age. Child is neither more active nor less active than a child of the same age.",
      2: "Mildly abnormal activity level. Child may be slightly restless or somewhat 'sluggish'.",
      3: "Moderately abnormal activity level. Child may be quite active and difficult to restrain.",
      4: "Severely abnormal activity level. Exhibits extremes of activity or inactivity; may shift from one to other."
    }
  },
  {
    id: 14,
    title: "Level and Consistency of Intellectual Response",
    descriptions: {
      1: "Intellectual functioning is normal and consistent across various areas. No unusual intellectual abilities.",
      2: "Mildly abnormal intellectual functioning. Not as smart as children of same age; skills fairly even.",
      3: "Moderately abnormal intellectual functioning. Generally child is not as smart as children of same age.",
      4: "Severely abnormal intellectual functioning. Even though child is generally not as smart, they may function better in some areas."
    }
  },
  {
    id: 15,
    title: "General Impressions",
    descriptions: {
      1: "No autism. Child shows none of the symptoms characteristic of autism.",
      2: "Mild autism. Child shows only a few symptoms or only a mild degree of autism.",
      3: "Moderate autism. Child shows a number of symptoms or a moderate degree of autism.",
      4: "Severe autism. Child shows many symptoms or an extreme degree of autism."
    }
  }
];
