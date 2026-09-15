// Lecture du profil de personnalisation et mise en forme pour le prompt système.
// Le préfixe "_" exclut ce dossier du routage Cloudflare Pages.
//
// La base ne stocke que des identifiants stables ({"age":"25_34"}) : c'est ici
// qu'ils redeviennent du français lisible pour l'IA. Toute évolution des
// libellés côté app doit être répercutée dans LABELS — jamais l'inverse.

import { supabaseHeaders } from "./auth.js";

const TABLE = "dropit_user_profile";

const LABELS = {
  age: { "-18": "moins de 18 ans", "18_24": "18-24 ans", "25_34": "25-34 ans", "35_44": "35-44 ans",
         "45_54": "45-54 ans", "55_64": "55-64 ans", "65": "65 ans et plus" },
  genre: { femme: "une femme", homme: "un homme", nsp: "" },
  statut: { etudiant: "étudiant(e)", salarie: "salarié(e)", freelance: "indépendant(e) / freelance",
            entrepreneur: "entrepreneur(e)", recherche: "en recherche d'emploi", retraite: "retraité(e)",
            sans: "sans activité pour le moment" },
  situation: { celibataire: "célibataire", couple: "en couple", marie: "marié(e)", pacse: "pacsé(e)",
               separe: "séparé(e)", divorce: "divorcé(e)", nsp: "" },
  enfants: { oui: "a des enfants", non: "n'a pas d'enfants" },
  enfants_ages: { "0_2": "0-2 ans", "3_5": "3-5 ans", "6_10": "6-10 ans", "11_14": "11-14 ans",
                  "15_17": "15-17 ans", "18_25": "18-25 ans", "26": "26 ans et plus" },
  quotidien: { tres: "très chargé", charge: "chargé", equilibre: "équilibré", tranquille: "plutôt tranquille",
               changement: "en pleine période de changement" },
  projets: { immo: "achat immobilier", voyage: "voyage", business: "lancer un business",
             travail: "changement de travail", sante: "améliorer sa santé", perso: "projet personnel" },
  reves: { voyager: "voyager", proprio: "devenir propriétaire", activite: "créer sa propre activité",
           temps: "plus de temps pour soi", sante: "être en bonne santé", liberte: "plus de liberté financière" },
  adore: { voyager: "voyager", resto: "aller au restaurant", lire: "lire", series: "séries et films",
           jeux: "jeux vidéo", cuisiner: "cuisiner", sport: "faire du sport", shopping: "faire du shopping",
           creer: "créer / bricoler" },
  motive: { objectifs: "atteindre ses objectifs", decouvrir: "découvrir de nouvelles choses",
            equilibre: "avoir un bon équilibre de vie", defis: "relever des défis", apprendre: "apprendre",
            concret: "créer quelque chose de concret" },
  fonctionne: { plan: "avec un plan précis", etape: "étape par étape", priorites: "en voyant ses priorités",
                flexible: "de façon flexible", guidance: "avec un peu de guidance",
                adapte: "en s'adaptant selon la situation" },
  fil: { tete: "trop de choses en tête", temps: "manque de temps", procrastine: "procrastination",
         disperse: "se disperse", commencer: "ne sait pas par où commencer", oublie: "oublie des choses",
         prioriser: "n'arrive pas à prioriser" },
  role: { organiser: "l'aider à s'organiser", action: "l'aider à passer à l'action",
          cerveau: "être son second cerveau", plan: "lui faire un plan", motiver: "le motiver",
          oublier: "lui éviter d'oublier" },
  taches: { une: "une seule prochaine action", tout: "tout voir pour ne rien oublier", projet: "par projet",
            priorite: "par priorité", melange: "un mélange" },
  temps: { projets: "faire avancer ses projets", moi: "prendre soin de soi", sport: "faire plus de sport",
           argent: "gagner plus d'argent", apprendre: "apprendre", profiter: "profiter davantage",
           rien: "ne rien faire" }
};

export async function fetchProfileAnswers(env, userId) {
  try {
    const res = await fetch(
      env.SUPABASE_URL + "/rest/v1/" + TABLE +
        "?user_id=eq." + encodeURIComponent(userId) + "&select=answers",
      { headers: supabaseHeaders(env) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0].answers || null;
  } catch {
    // Le profil est un bonus de contexte : son indisponibilité ne doit
    // jamais faire échouer un appel IA.
    return null;
  }
}

function labelOf(key, value) {
  const table = LABELS[key];
  if (!table) return "";
  if (Array.isArray(value)) {
    return value.map(function (v) { return table[v] || ""; }).filter(Boolean).join(", ");
  }
  return table[value] || "";
}

function freeText(value) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 300);
}

export function profileContext(answers) {
  if (!answers || typeof answers !== "object") return "";

  const lines = [];
  const add = function (prefix, key) {
    const text = labelOf(key, answers[key]);
    if (text) lines.push("- " + prefix + " : " + text);
  };

  const prenom = freeText(answers.prenom);
  if (prenom) lines.push("- Prénom : " + prenom);

  // Identité en une ligne : plus lisible qu'une liste de champs isolés.
  const identite = [labelOf("age", answers.age), labelOf("genre", answers.genre),
                    labelOf("statut", answers.statut), labelOf("situation", answers.situation)]
                    .filter(Boolean).join(", ");
  if (identite) lines.push("- Profil : " + identite);

  const enfants = labelOf("enfants", answers.enfants);
  const ages = labelOf("enfants_ages", answers.enfants_ages);
  if (enfants) lines.push("- Enfants : " + enfants + (ages ? " (" + ages + ")" : ""));

  add("Quotidien", "quotidien");
  add("Projets en cours", "projets");
  add("Rêves", "reves");
  add("Aime", "adore");
  add("Motivé par", "motive");
  add("Fonctionne mieux", "fonctionne");
  add("Perd le fil quand", "fil");
  add("Attend de Dropit", "role");
  add("Préfère voir ses tâches", "taches");
  add("Ferait de son temps libéré", "temps");

  const mot = freeText(answers.mot);
  if (mot) lines.push("- A tenu à préciser : " + mot);

  if (!lines.length) return "";

  return "Profil de l'utilisateur, renseigné par lui-même :\n" + lines.join("\n") +
    "\n\nAdapte le ton, le vocabulaire et les exemples à ce profil. " +
    "N'invente jamais une information qui n'y figure pas et ne fais pas remarquer que tu disposes de ce profil.";
}
