// The sound(s) each well-known artist is known for — what the
// recommendations use to find "more like this". An artist can sit in
// several. Artists not listed here (anything a user types in themselves)
// still get recommended through other Disko users' ratings.

export const GENRES = [
  "House",
  "Tech House",
  "Melodic",
  "Techno",
  "Hard Techno",
  "Afro House",
  "Disco",
  "Underground",
  "UK Sound",
  "Electronica",
  "Trance",
  "EDM",
  "Bass",
  "Drum & Bass",
  "Hard Dance",
  "Psytrance",
  "Hip-Hop",
] as const;

export type Genre = (typeof GENRES)[number];

const BY_GENRE: Record<Genre, string[]> = {
  House: [
    "Peggy Gou", "Honey Dijon", "Black Coffee", "Kerri Chandler", "Jamie Jones", "Hot Since 82", "Claptone",
    "Gorgon City", "Purple Disco Machine", "ANOTR", "Chris Stussy", "Mochakk", "Wax Motif", "Walker & Royce",
    "Mau P", "Dom Dolla", "Sonny Fodera", "Prospa", "MK", "Disclosure", "Duke Dumont", "Kaytranada", "Pete Tong",
    "Erick Morillo", "Roger Sanchez", "Bob Sinclar", "David Morales", "Frankie Knuckles", "Derrick Carter",
    "DJ Sneak", "Mark Farina", "Marshall Jefferson", "Louie Vega", "Kenny Dope", "Danny Tenaglia", "Josh Wink",
    "Seth Troxler", "Fred again..", "Jayda G", "HoneyLuv", "Sidney Charles", "Franky Rizardo", "Ferreck Dawn",
    "Low Steppa", "Danny Howard", "Oliver Heldens", "Jax Jones", "Eats Everything", "Yousef", "Basement Jaxx",
    "Groove Armada", "Fatboy Slim", "Hannah Wants", "Camelphat", "John Summit", "Annie Mac", "Keinemusik",
    "Adam Port", "Folamour", "Vintage Culture",
  ],
  "Tech House": [
    "Fisher", "Chris Lake", "John Summit", "Green Velvet", "Camelphat", "Patrick Topping", "Hot Since 82",
    "Hannah Wants", "Jamie Jones", "Mau P", "Pawsa", "Michael Bibi", "Dennis Cruz", "Biscits", "CID",
    "Franky Rizardo", "Dom Dolla", "Cloonee", "Sonny Fodera", "James Hype", "Danny Howard", "Ferreck Dawn",
    "Low Steppa", "Sidney Charles", "Marco Faraone", "Danny Daze", "HoneyLuv", "Walker & Royce", "Mochakk",
    "Eats Everything", "Joseph Capriati", "Marco Carola", "Paco Osuna", "Loco Dice", "Vintage Culture",
    "Wax Motif", "Chris Stussy",
  ],
  Melodic: [
    "Ben Böhmer", "Tale Of Us", "Artbat", "Innellea", "Monolink", "Boris Brejcha", "Argy", "Massano",
    "Miss Monique", "Mind Against", "Recondite", "Yotto", "Lane 8", "Nils Hoffmann", "Tinlicker", "Marsh",
    "Cristoph", "Enamour", "Guy J", "Guy Mantzur", "Stephan Bodzin", "Adriatique", "WhoMadeWho", "Maceo Plex",
    "Jan Blomqvist", "Frank Walker", "Rüfüs Du Sol", "Solomun", "Âme", "Dixon", "Damian Lazarus", "Kx5",
    "Vintage Culture", "Eric Prydz", "Sasha", "John Digweed", "Black Coffee", "Camelphat", "Bonobo", "&ME",
    "Rampa", "Keinemusik", "Adam Port",
  ],
  Techno: [
    "Carl Cox", "Charlotte de Witte", "Amelie Lens", "Nina Kraviz", "Adam Beyer", "Richie Hawtin", "Sven Väth",
    "Vtss", "I Hate Models", "Sara Landry", "Sam Paganini", "Reinier Zonneveld", "Enrico Sangiuliano",
    "Layton Giordani", "Ilario Alicante", "Fjaak", "Lewis Fautzi", "Klangkuenstler", "Deborah De Luca",
    "Anfisa Letyago", "ANNA", "Julian Jeweil", "Oscar Mulero", "Blawan", "Objekt", "Ben Sims", "Jeff Mills",
    "Dave Clarke", "Laurent Garnier", "Chris Liebing", "Ben Klock", "Marcel Dettmann", "Helena Hauff", "DVS1",
    "Rebekah", "Perc", "Umek", "Joseph Capriati", "Marco Carola", "Paco Osuna", "Ricardo Villalobos",
    "Boris Brejcha", "Maceo Plex", "Stephan Bodzin", "Josh Wink", "Green Velvet", "B Traits", "Marlon Hoffstadt",
  ],
  "Hard Techno": [
    "Vtss", "I Hate Models", "Sara Landry", "Klangkuenstler", "Rebekah", "Perc", "Amelie Lens",
    "Charlotte de Witte", "Reinier Zonneveld", "Nina Kraviz", "Marlon Hoffstadt", "Lewis Fautzi",
  ],
  "Afro House": [
    "Black Coffee", "Culoe De Song", "Shimza", "Caiiro", "Uncle Waffles", "DJ Maphorisa", "Kabza De Small",
    "Sun-El Musician", "Black Motion", "DBN Gogo", "Musa Keys", "Tyler ICU", "Da Capo", "Vigro Deep",
    "Damian Lazarus", "Keinemusik", "&ME", "Rampa", "Adam Port", "Mochakk",
  ],
  Disco: [
    "Purple Disco Machine", "Dr Packer", "Late Nite Tuff Guy", "Todd Terje", "DJ Harvey", "Louie Vega",
    "Kenny Dope", "Honey Dijon", "Young Marco", "Palms Trax", "Motor City Drum Ensemble", "Session Victim",
    "Confidence Man", "Daft Punk", "Bob Sinclar", "Jayda G", "Peggy Gou", "Gilles Peterson", "Folamour",
    "Horse Meat Disco",
  ],
  Underground: [
    "Ricardo Villalobos", "Move D", "DJ Koze", "Dixon", "Âme", "Seth Troxler", "Loco Dice", "Job Jobse",
    "DJ Tennis", "Mall Grab", "DJ Seinfeld", "DJ Boring", "Ross from Friends", "Palms Trax", "Young Marco",
    "Motor City Drum Ensemble", "Session Victim", "Denis Sulta", "Jasper James", "Or:la", "Saoirse",
    "Floating Points", "Four Tet", "Joy Orbison", "Kerri Chandler", "Derrick Carter", "DJ Harvey",
    "Gilles Peterson", "Chris Stussy", "ANOTR", "Danny Daze", "Objekt", "Helena Hauff", "DVS1",
  ],
  "UK Sound": [
    "Sammy Virji", "Interplanetary Criminal", "Overmono", "Joy Orbison", "Skream", "Benga", "Mala", "Kode9",
    "Disclosure", "Mall Grab", "Ross from Friends", "Fred again..", "Jamie xx", "Bicep", "Four Tet",
    "Nia Archives", "Denis Sulta", "Jasper James", "Or:la", "Saoirse", "Bou", "Chase & Status", "Gorgon City",
    "Hannah Wants", "Patrick Topping", "Annie Mac",
  ],
  Electronica: [
    "Fred again..", "Jamie xx", "Four Tet", "Bicep", "Bonobo", "Caribou", "Floating Points", "Kaytranada",
    "Disclosure", "Flume", "ODESZA", "Porter Robinson", "Madeon", "The Chemical Brothers", "Underworld",
    "Orbital", "Leftfield", "Moby", "Justice", "Daft Punk", "Todd Terje", "Tiga", "Overmono", "Ross from Friends",
    "DJ Koze", "Rüfüs Du Sol", "Confidence Man", "Jayda G", "DJ Shadow", "Monolink", "WhoMadeWho",
    "Nightmares On Wax", "Fatboy Slim", "Basement Jaxx", "Groove Armada", "Rob da Bank", "Gilles Peterson",
  ],
  Trance: [
    "Paul van Dyk", "Armin van Buuren", "Ferry Corsten", "Paul Oakenfold", "Sasha", "John Digweed",
    "Danny Howells", "James Zabiela", "Above & Beyond", "Eric Prydz", "Cosmic Gate", "Aly & Fila",
    "Gareth Emery", "Markus Schulz", "ATB", "Nifra", "Tiësto", "Marlon Hoffstadt", "Vini Vici",
  ],
  EDM: [
    "David Guetta", "Calvin Harris", "Tiësto", "Marshmello", "Zedd", "Martin Garrix", "Deadmau5", "Diplo",
    "Skrillex", "DJ Snake", "Steve Aoki", "Kaskade", "Afrojack", "R3hab", "Don Diablo", "Oliver Heldens",
    "Nicky Romero", "W&W", "Jonas Blue", "Robin Schulz", "Jax Jones", "MK", "The Chainsmokers", "Alesso",
    "Alan Walker", "Kygo", "Galantis", "Timmy Trumpet", "Steve Angello", "Axwell", "Sebastian Ingrosso",
    "Otto Knows", "Illenium", "Porter Robinson", "Madeon", "Zeds Dead", "Kx5", "Fisher", "John Summit",
  ],
  Bass: [
    "Excision", "Illenium", "Seven Lions", "Rezz", "Alison Wonderland", "What So Not", "RL Grime", "Baauer",
    "Zomboy", "Skream", "Benga", "Mala", "Kode9", "Zeds Dead", "Flux Pavilion", "Nero", "Subtronics",
    "Ganja White Night", "Boogie T", "Svdden Death", "Kompany", "NGHTMRE", "Slander", "Skrillex", "Diplo",
    "Flume", "Chase & Status",
  ],
  "Drum & Bass": [
    "Chase & Status", "Sub Focus", "Andy C", "Goldie", "Netsky", "Wilkinson", "Hybrid Minds", "Bou",
    "Etherwood", "High Contrast", "Camo & Krooked", "Friction", "Metrik", "Dimension", "Nia Archives",
    "Pendulum",
  ],
  "Hard Dance": [
    "Headhunterz", "Wildstylez", "Sub Zero Project", "Da Tweekaz", "Coone", "D-Block & S-te-Fan", "Angerfist",
    "Timmy Trumpet", "W&W",
  ],
  Psytrance: ["Astrix", "Vini Vici", "Infected Mushroom", "Ace Ventura", "Captain Hook"],
  "Hip-Hop": [
    "DJ Jazzy Jeff", "Grandmaster Flash", "Afrika Bambaataa", "DJ Premier", "DJ Shadow", "A-Trak", "DJ Qbert",
    "Diplo", "Baauer", "RL Grime", "Kaytranada",
  ],
};

export const normalizeArtist = (name: string) => name.trim().toLowerCase();

const GENRES_OF = new Map<string, Genre[]>();
const CANONICAL = new Map<string, string>();
for (const genre of GENRES) {
  for (const artist of BY_GENRE[genre]) {
    const key = normalizeArtist(artist);
    CANONICAL.set(key, artist);
    const list = GENRES_OF.get(key) ?? [];
    if (!list.includes(genre)) list.push(genre);
    GENRES_OF.set(key, list);
  }
}

export function genresOf(artist: string): Genre[] {
  return GENRES_OF.get(normalizeArtist(artist)) ?? [];
}

/** Every artist we know the sound of, by its proper spelling. */
export function taggedArtists(): string[] {
  return [...CANONICAL.values()];
}

export function artistsIn(genre: Genre): string[] {
  return BY_GENRE[genre];
}
