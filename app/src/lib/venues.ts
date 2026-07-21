// A seed list of well-known nightclubs and festivals, used to make venue
// search/autocomplete useful before you've logged anything yourself.
// Deliberately global — DJ sets happen everywhere, not just near you —
// so this isn't location-biased the way a "search near me" places API
// would be. Anything not listed can still just be typed in freely.
export interface SeedVenue {
  name: string;
  city: string;
}

export const SEED_VENUES: SeedVenue[] = [
  // Nightclubs — North America
  { name: "Output", city: "Brooklyn, NY" },
  { name: "Elsewhere", city: "Brooklyn, NY" },
  { name: "Good Room", city: "Brooklyn, NY" },
  { name: "Nowadays", city: "Queens, NY" },
  { name: "Basement", city: "New York, NY" },
  { name: "Public Records", city: "Brooklyn, NY" },
  { name: "Brooklyn Mirage", city: "Brooklyn, NY" },
  { name: "Knockdown Center", city: "Queens, NY" },
  { name: "Smartbar", city: "Chicago, IL" },
  { name: "Spybar", city: "Chicago, IL" },
  { name: "The Mid", city: "Chicago, IL" },
  { name: "Sound Nightclub", city: "Los Angeles, CA" },
  { name: "Exchange LA", city: "Los Angeles, CA" },
  { name: "Academy LA", city: "Los Angeles, CA" },
  { name: "1015 Folsom", city: "San Francisco, CA" },
  { name: "Monarch", city: "San Francisco, CA" },
  { name: "Halcyon", city: "San Francisco, CA" },
  { name: "Space Miami", city: "Miami, FL" },
  { name: "E11EVEN Miami", city: "Miami, FL" },
  { name: "LIV Miami", city: "Miami Beach, FL" },
  { name: "Story Miami", city: "Miami Beach, FL" },
  { name: "Factory Town", city: "Miami, FL" },
  { name: "OMNIA", city: "Las Vegas, NV" },
  { name: "XS Nightclub", city: "Las Vegas, NV" },
  { name: "Marquee Nightclub", city: "Las Vegas, NV" },
  { name: "Hakkasan", city: "Las Vegas, NV" },
  { name: "Zouk Las Vegas", city: "Las Vegas, NV" },
  { name: "Tao Nightclub", city: "Las Vegas, NV" },

  // Nightclubs — Mexico / Latin America
  { name: "Vagalume", city: "Tulum, Mexico" },
  { name: "Papaya Playa Project", city: "Tulum, Mexico" },
  { name: "Warung Beach Club", city: "Santa Catarina, Brazil" },
  { name: "Green Valley", city: "Camboriú, Brazil" },
  { name: "D-Edge", city: "São Paulo, Brazil" },

  // Nightclubs — UK / Ireland
  { name: "fabric", city: "London, UK" },
  { name: "Printworks", city: "London, UK" },
  { name: "Ministry of Sound", city: "London, UK" },
  { name: "Egg London", city: "London, UK" },
  { name: "XOYO", city: "London, UK" },
  { name: "Studio 338", city: "London, UK" },
  { name: "E1", city: "London, UK" },
  { name: "The Cause", city: "London, UK" },
  { name: "Corsica Studios", city: "London, UK" },
  { name: "Village Underground", city: "London, UK" },
  { name: "Fold", city: "London, UK" },
  { name: "Warehouse Project", city: "Manchester, UK" },
  { name: "Sub Club", city: "Glasgow, UK" },

  // Nightclubs — Ibiza / Spain
  { name: "Pacha", city: "Ibiza, Spain" },
  { name: "Amnesia", city: "Ibiza, Spain" },
  { name: "DC10", city: "Ibiza, Spain" },
  { name: "Ushuaïa", city: "Ibiza, Spain" },
  { name: "Hï Ibiza", city: "Ibiza, Spain" },
  { name: "Blue Marlin Ibiza", city: "Ibiza, Spain" },
  { name: "Privilege", city: "Ibiza, Spain" },

  // Nightclubs — Continental Europe
  { name: "Berghain", city: "Berlin, Germany" },
  { name: "Tresor", city: "Berlin, Germany" },
  { name: "Watergate", city: "Berlin, Germany" },
  { name: "Kater Blau", city: "Berlin, Germany" },
  { name: "://about blank", city: "Berlin, Germany" },
  { name: "Sisyphos", city: "Berlin, Germany" },
  { name: "Robert Johnson", city: "Frankfurt, Germany" },
  { name: "Cocoon Club", city: "Frankfurt, Germany" },
  { name: "Rex Club", city: "Paris, France" },
  { name: "Concrete", city: "Paris, France" },
  { name: "De School", city: "Amsterdam, Netherlands" },
  { name: "Shelter", city: "Amsterdam, Netherlands" },
  { name: "RADION", city: "Amsterdam, Netherlands" },
  { name: "Trouw", city: "Amsterdam, Netherlands" },
  { name: "Paradiso", city: "Amsterdam, Netherlands" },
  { name: "Melkweg", city: "Amsterdam, Netherlands" },
  { name: "Toffler", city: "Rotterdam, Netherlands" },
  { name: "Fuse", city: "Brussels, Belgium" },
  { name: "La Rocca", city: "Antwerp, Belgium" },
  { name: "Club Bassiani", city: "Tbilisi, Georgia" },
  { name: "Khidi", city: "Tbilisi, Georgia" },

  // Nightclubs — Asia
  { name: "Womb", city: "Tokyo, Japan" },
  { name: "Contact Tokyo", city: "Tokyo, Japan" },
  { name: "ageHa", city: "Tokyo, Japan" },
  { name: "Circus Osaka", city: "Osaka, Japan" },
  { name: "Zouk Singapore", city: "Singapore" },
  { name: "Marquee Singapore", city: "Singapore" },

  // Festivals — North America
  { name: "Ultra Music Festival", city: "Miami, FL" },
  { name: "Electric Daisy Carnival (EDC Las Vegas)", city: "Las Vegas, NV" },
  { name: "Electric Forest", city: "Rothbury, MI" },
  { name: "Coachella", city: "Indio, CA" },
  { name: "Movement Detroit", city: "Detroit, MI" },
  { name: "Hard Summer", city: "Los Angeles, CA" },
  { name: "Beyond Wonderland", city: "San Bernardino, CA" },
  { name: "Lightning in a Bottle", city: "Buena Vista Lake, CA" },
  { name: "CRSSD Festival", city: "San Diego, CA" },
  { name: "Desert Hearts Festival", city: "Los Angeles, CA" },
  { name: "Shambhala Music Festival", city: "Salmo, BC" },
  { name: "Bass Coast Festival", city: "Merritt, BC" },
  { name: "Piknic Électronik", city: "Montreal, Canada" },
  { name: "MUTEK", city: "Montreal, Canada" },
  { name: "Burning Man", city: "Black Rock City, NV" },

  // Festivals — Mexico / Latin America
  { name: "Zamna Festival", city: "Tulum, Mexico" },
  { name: "Day Zero", city: "Tulum, Mexico" },
  { name: "APOKALIPSIS", city: "Tulum, Mexico" },

  // Festivals — UK / Ireland
  { name: "Creamfields", city: "Daresbury, UK" },
  { name: "Parklife", city: "Manchester, UK" },
  { name: "Boomtown Fair", city: "Winchester, UK" },
  { name: "We Are FSTVL", city: "Essex, UK" },
  { name: "Junction 2", city: "London, UK" },
  { name: "Glastonbury (Block9)", city: "Glastonbury, UK" },

  // Festivals — Continental Europe
  { name: "Tomorrowland", city: "Boom, Belgium" },
  { name: "Awakenings", city: "Amsterdam, Netherlands" },
  { name: "Time Warp", city: "Mannheim, Germany" },
  { name: "DGTL", city: "Amsterdam, Netherlands" },
  { name: "Dekmantel", city: "Amsterdam, Netherlands" },
  { name: "Sónar", city: "Barcelona, Spain" },
  { name: "Dour Festival", city: "Dour, Belgium" },
  { name: "Exit Festival", city: "Novi Sad, Serbia" },
  { name: "Balaton Sound", city: "Zamárdi, Hungary" },
  { name: "Kappa FuturFestival", city: "Turin, Italy" },
  { name: "Music On Festival", city: "Amsterdam, Netherlands" },
  { name: "Mysteryland", city: "Haarlemmermeer, Netherlands" },
  { name: "Loveland Festival", city: "Amsterdam, Netherlands" },
  { name: "Untold Festival", city: "Cluj-Napoca, Romania" },
  { name: "Airbeat One", city: "Neustadt-Glewe, Germany" },
  { name: "Nature One", city: "Kastellaun, Germany" },
  { name: "Fusion Festival", city: "Lärz, Germany" },
  { name: "Nuits Sonores", city: "Lyon, France" },
  { name: "Weather Festival", city: "Paris, France" },
  { name: "We Love Green", city: "Paris, France" },
  { name: "Sensation", city: "Amsterdam, Netherlands" },
  { name: "Defqon.1", city: "Biddinghuizen, Netherlands" },
  { name: "Decibel", city: "Netherlands" },

  // Festivals — Africa / Asia / Oceania
  { name: "Ultra South Africa", city: "Cape Town, South Africa" },
  { name: "Rocking the Daisies", city: "Cape Town, South Africa" },
  { name: "Wonderfruit", city: "Pattaya, Thailand" },
  { name: "ZoukOut", city: "Singapore" },
  { name: "Djakarta Warehouse Project", city: "Jakarta, Indonesia" },
  { name: "Road to Ultra Australia", city: "Melbourne, Australia" },
  { name: "Listen Out", city: "Sydney, Australia" },
];
