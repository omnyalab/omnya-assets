// "Comment your city": the cities and countries the Instagram bot knows, so the public reply can say
// the place back ("Dubai, nice 🙌🏻 check your DMs"). No AI and no guessing: a comment counts only when
// it is short (three words at most) and ALL of it is in this list, and what we write is the name as
// it is spelled HERE, never the commenter's own text.
//
// One line per place: 'Name as we write it|another spelling|another spelling'. Capitals, accents,
// emoji and punctuation in the comment don't matter ("DUBAI!!", "são paulo 🇧🇷", "#milano").
// Left out on purpose, because alone they are everyday words: Nice, Male, Split, Essen, Cork, Bath,
// Reading, Mobile, Victoria, Perm, Kobe, and the short forms Casa (Casablanca) and Dar (Dar es Salaam).

const CITIES = [
  // Gulf and Middle East
  'Dubai|DXB|دبي|Дубай', 'Abu Dhabi|Abudhabi|أبوظبي|ابوظبي', 'Sharjah', 'Ajman', 'Ras Al Khaimah|RAK', 'Al Ain', 'Fujairah',
  'Riyadh|Al Riyadh|Riad|الرياض', 'Jeddah|Jiddah|Jedda|جدة', 'Mecca|Makkah', 'Medina|Madinah', 'Dammam', 'Khobar|Al Khobar', 'Neom',
  'Doha|الدوحة', 'Kuwait City', 'Manama', 'Muscat', 'Salalah',
  'Tehran|Teheran', 'Mashhad', 'Isfahan|Esfahan', 'Shiraz', 'Tabriz', 'Karaj',
  'Baghdad', 'Basra', 'Erbil|Irbil|Arbil', 'Mosul', 'Sulaymaniyah|Sulaimani',
  'Amman', 'Beirut', 'Damascus', 'Aleppo', 'Jerusalem', 'Tel Aviv', 'Haifa', 'Ramallah', 'Sanaa|Sana’a', 'Aden',
  'Istanbul|İstanbul|Стамбул', 'Ankara', 'Izmir|İzmir', 'Bursa', 'Antalya', 'Adana', 'Gaziantep', 'Konya', 'Bodrum',
  // Central Asia and the Caucasus
  'Tashkent|Toshkent|Ташкент', 'Samarkand|Samarqand|Самарканд', 'Almaty|Алматы', 'Astana|Nur-Sultan|Астана', 'Shymkent',
  'Bishkek|Бишкек', 'Dushanbe|Душанбе', 'Ashgabat|Ashkhabad|Ашхабад', 'Baku|Bakı|Баку', 'Tbilisi|Тбилиси', 'Batumi', 'Yerevan|Ереван',
  // South Asia
  'Delhi|New Delhi', 'Mumbai|Bombay', 'Kolkata|Calcutta', 'Bangalore|Bengaluru', 'Chennai|Madras', 'Hyderabad', 'Ahmedabad', 'Pune',
  'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Patna', 'Vadodara|Baroda', 'Ludhiana', 'Agra', 'Nashik',
  'Coimbatore', 'Kochi|Cochin', 'Visakhapatnam|Vizag', 'Chandigarh', 'Thane', 'Gurgaon|Gurugram', 'Noida', 'Goa',
  'Thiruvananthapuram|Trivandrum', 'Varanasi', 'Rajkot', 'Mysore|Mysuru', 'Guwahati', 'Amritsar', 'Srinagar',
  'Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Islamabad', 'Multan', 'Peshawar', 'Gujranwala', 'Quetta', 'Sialkot',
  'Dhaka|Dacca', 'Chittagong|Chattogram', 'Khulna', 'Sylhet', 'Colombo', 'Kandy', 'Kathmandu', 'Kabul',
  // East Asia
  'Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kyoto', 'Kawasaki', 'Saitama', 'Hiroshima', 'Sendai',
  'Seoul', 'Busan|Pusan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju',
  'Beijing|Peking|北京', 'Shanghai|上海', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Chongqing', 'Tianjin', 'Wuhan', 'Hangzhou',
  'Xi’an|Xian', 'Nanjing', 'Suzhou', 'Dongguan', 'Foshan', 'Shenyang', 'Harbin', 'Qingdao', 'Dalian', 'Zhengzhou', 'Jinan',
  'Changsha', 'Kunming', 'Hefei', 'Xiamen', 'Ningbo', 'Fuzhou', 'Wuxi', 'Nanchang', 'Changchun', 'Taiyuan', 'Shijiazhuang',
  'Nanning', 'Guiyang', 'Urumqi', 'Lanzhou', 'Wenzhou', 'Shantou', 'Zhuhai', 'Sanya',
  'Hong Kong|Hongkong|香港', 'Macau|Macao', 'Taipei', 'Kaohsiung', 'Taichung', 'Ulaanbaatar|Ulan Bator', 'Pyongyang',
  // South-East Asia
  'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar', 'Palembang', 'Denpasar', 'Bali', 'Yogyakarta|Jogja',
  'Manila', 'Quezon City', 'Davao|Davao City', 'Cebu|Cebu City', 'Makati',
  'Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya',
  'Ho Chi Minh City|Ho Chi Minh|HCMC', 'Saigon|Sài Gòn', 'Hanoi|Ha Noi|Hà Nội', 'Da Nang|Danang', 'Hai Phong|Haiphong',
  'Kuala Lumpur', 'Johor Bahru', 'Penang|George Town', 'Singapore', 'Yangon|Rangoon', 'Mandalay', 'Phnom Penh', 'Siem Reap', 'Vientiane',
  // Africa
  'Cairo|القاهرة', 'Alexandria', 'Giza', 'Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City', 'Enugu', 'Kaduna',
  'Kinshasa', 'Lubumbashi', 'Luanda', 'Johannesburg|Joburg|Jozi', 'Cape Town|Capetown', 'Durban', 'Pretoria', 'Port Elizabeth|Gqeberha',
  'Nairobi', 'Mombasa', 'Dar es Salaam', 'Zanzibar', 'Addis Ababa|Addis', 'Khartoum', 'Accra', 'Kumasi', 'Abidjan', 'Dakar',
  'Bamako', 'Ouagadougou', 'Conakry', 'Kampala', 'Kigali', 'Lusaka', 'Harare', 'Bulawayo', 'Maputo', 'Antananarivo',
  'Algiers|Alger', 'Oran', 'Casablanca', 'Rabat', 'Marrakech|Marrakesh', 'Tangier|Tanger', 'Fes|Fez', 'Agadir',
  'Tunis', 'Tripoli', 'Benghazi', 'Douala', 'Yaounde|Yaoundé', 'Mogadishu', 'Hargeisa', 'Windhoek', 'Gaborone', 'Freetown',
  'Monrovia', 'Lome|Lomé', 'Cotonou', 'Niamey', 'N’Djamena|Ndjamena', 'Brazzaville', 'Libreville', 'Nouakchott', 'Asmara',
  'Juba', 'Lilongwe', 'Blantyre', 'Bujumbura', 'Port Louis',
  // Europe
  'London|Londra|Londres|Лондон', 'Birmingham', 'Manchester', 'Liverpool', 'Leeds', 'Glasgow', 'Edinburgh', 'Bristol', 'Sheffield',
  'Newcastle', 'Nottingham', 'Cardiff', 'Belfast', 'Dublin',
  'Paris|Parigi|Париж', 'Marseille|Marsiglia', 'Lyon|Lione', 'Toulouse', 'Bordeaux', 'Lille', 'Nantes', 'Strasbourg', 'Cannes', 'Monaco|Monte Carlo',
  'Berlin|Berlino', 'Hamburg|Amburgo', 'Munich|München|Monaco di Baviera', 'Cologne|Köln', 'Frankfurt|Francoforte', 'Stuttgart|Stoccarda',
  'Düsseldorf|Duesseldorf', 'Leipzig', 'Dresden', 'Hanover|Hannover', 'Nuremberg|Nürnberg', 'Bremen', 'Dortmund',
  'Madrid', 'Barcelona|Barcellona', 'Valencia', 'Seville|Sevilla|Siviglia', 'Malaga|Málaga', 'Bilbao', 'Zaragoza', 'Marbella', 'Ibiza',
  'Palma|Palma de Mallorca', 'Mallorca|Majorca', 'Tenerife',
  'Rome|Roma', 'Milan|Milano', 'Naples|Napoli', 'Turin|Torino', 'Florence|Firenze', 'Venice|Venezia', 'Bologna', 'Genoa|Genova',
  'Palermo', 'Bari', 'Verona', 'Catania', 'Padua|Padova', 'Treviso', 'Brescia', 'Bergamo', 'Trieste', 'Cagliari',
  'Lisbon|Lisboa|Lisbona', 'Porto|Oporto', 'Amsterdam', 'Rotterdam', 'The Hague|Den Haag', 'Utrecht', 'Eindhoven',
  'Brussels|Bruxelles|Brussel', 'Antwerp|Antwerpen|Anversa', 'Luxembourg City',
  'Zurich|Zürich|Zurigo', 'Geneva|Genève|Ginevra|Genf', 'Basel|Basilea', 'Bern|Berna', 'Lausanne|Losanna', 'Lugano',
  'Vienna|Wien', 'Salzburg|Salisburgo', 'Graz', 'Innsbruck',
  'Prague|Praha|Praga', 'Brno', 'Bratislava', 'Budapest', 'Warsaw|Warszawa|Varsavia', 'Krakow|Kraków|Cracow|Cracovia', 'Wroclaw|Wrocław',
  'Gdansk|Gdańsk|Danzica', 'Poznan|Poznań', 'Lodz|Łódź',
  'Copenhagen|København|Copenaghen', 'Stockholm|Stoccolma', 'Gothenburg|Göteborg', 'Malmo|Malmö', 'Oslo', 'Bergen', 'Helsinki',
  'Reykjavik|Reykjavík', 'Tallinn', 'Riga', 'Vilnius',
  'Athens|Atene|Athina', 'Thessaloniki|Salonicco', 'Sofia', 'Bucharest|București|Bucarest', 'Cluj|Cluj-Napoca', 'Belgrade|Beograd|Belgrado',
  'Zagreb|Zagabria', 'Ljubljana|Lubiana', 'Sarajevo', 'Skopje', 'Tirana|Tiranë', 'Pristina|Prishtina', 'Podgorica', 'Chisinau|Chișinău',
  'Nicosia', 'Limassol', 'Valletta',
  'Moscow|Moskva|Mosca|Москва', 'Saint Petersburg|St Petersburg|Petersburg|San Pietroburgo|Санкт-Петербург|Питер', 'Novosibirsk|Новосибирск',
  'Yekaterinburg|Ekaterinburg|Екатеринбург', 'Kazan|Казань', 'Nizhny Novgorod', 'Chelyabinsk', 'Samara', 'Omsk', 'Rostov|Rostov-on-Don',
  'Ufa', 'Krasnoyarsk', 'Voronezh', 'Volgograd', 'Krasnodar|Краснодар', 'Sochi|Сочи', 'Vladivostok', 'Grozny', 'Makhachkala',
  'Kyiv|Kiev|Київ|Киев', 'Kharkiv|Kharkov', 'Odesa|Odessa', 'Dnipro', 'Lviv', 'Minsk|Минск',
  // North and Central America, the Caribbean
  'New York|New York City|NYC', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia|Philly', 'San Antonio', 'San Diego', 'Dallas',
  'San Jose|San José', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco|San Fran', 'Indianapolis',
  'Seattle', 'Denver', 'Washington|Washington DC', 'Boston', 'Nashville', 'Detroit', 'Portland', 'Las Vegas|Vegas', 'Memphis',
  'Baltimore', 'Milwaukee', 'Atlanta', 'Miami', 'Fort Lauderdale', 'Orlando', 'Tampa', 'Minneapolis', 'New Orleans', 'Salt Lake City',
  'Honolulu', 'Pittsburgh', 'Cleveland', 'Cincinnati', 'Sacramento', 'Kansas City', 'St. Louis|Saint Louis', 'Raleigh', 'Scottsdale',
  'Oakland', 'Brooklyn', 'Manhattan', 'Beverly Hills', 'Malibu', 'Aspen',
  'Toronto', 'Montreal|Montréal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City|Quebec|Québec',
  'Mexico City|CDMX|Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'Cancun|Cancún', 'Merida|Mérida',
  'Queretaro|Querétaro', 'Tulum', 'Guatemala City', 'San Salvador', 'Tegucigalpa', 'San Pedro Sula', 'Managua', 'Panama City',
  'Havana|La Habana', 'Santo Domingo', 'Punta Cana', 'San Juan', 'Kingston', 'Port-au-Prince', 'Nassau', 'Port of Spain',
  // South America
  'São Paulo|Sao Paulo|San Paolo', 'Rio de Janeiro|Rio', 'Brasília|Brasilia', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus',
  'Curitiba', 'Recife', 'Porto Alegre', 'Goiânia', 'Belém', 'Campinas', 'Florianópolis|Floripa',
  'Buenos Aires', 'Córdoba|Cordoba', 'Rosario', 'Mendoza', 'Lima', 'Bogotá|Bogota', 'Medellín|Medellin', 'Cali', 'Barranquilla',
  'Cartagena', 'Santiago|Santiago de Chile', 'Caracas', 'Maracaibo', 'Quito', 'Guayaquil', 'La Paz', 'Santa Cruz', 'Asunción|Asuncion',
  'Montevideo', 'Punta del Este',
  // Oceania
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Auckland', 'Wellington', 'Christchurch',
];

const COUNTRIES = [
  'Afghanistan', 'Albania|Shqipëri', 'Algeria|Algérie', 'Andorra', 'Angola', 'Antigua and Barbuda|Antigua', 'Argentina', 'Armenia',
  'Australia', 'Austria|Österreich', 'Azerbaijan', 'Bahamas|The Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium|Belgique|België|Belgio',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia|Bosnia and Herzegovina|Bosnia Herzegovina', 'Botswana', 'Brazil|Brasil|Brasile', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon|Cameroun', 'Canada', 'Cape Verde|Cabo Verde', 'Central African Republic',
  'Chad|Tchad', 'Chile', 'China|Cina', 'Colombia', 'Comoros', 'Congo|DR Congo|DRC|Congo Kinshasa|Congo Brazzaville', 'Costa Rica',
  'Croatia|Hrvatska|Croazia', 'Cuba', 'Cyprus|Cipro', 'Czech Republic|Czechia|Czech', 'Denmark|Danmark|Danimarca', 'Djibouti', 'Dominica',
  'Dominican Republic|República Dominicana', 'Ecuador', 'Egypt|Egitto|مصر', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
  'Eswatini|Swaziland', 'Ethiopia', 'Fiji', 'Finland|Suomi|Finlandia', 'France|Francia', 'Gabon', 'Gambia|The Gambia', 'Georgia',
  'Germany|Deutschland|Germania|Alemania', 'Ghana', 'Greece|Grecia|Hellas', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary|Ungheria|Magyarország', 'Iceland|Islanda', 'India|Bharat', 'Indonesia', 'Iran', 'Iraq', 'Ireland|Irlanda',
  'Israel', 'Italy|Italia', 'Ivory Coast|Côte d’Ivoire', 'Jamaica', 'Japan|Giappone|Nippon', 'Jordan', 'Kazakhstan|Казахстан', 'Kenya',
  'Kiribati', 'Kosovo|Kosova', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon|Libano', 'Lesotho', 'Liberia', 'Libya|Libia',
  'Liechtenstein', 'Lithuania', 'Luxembourg|Lussemburgo', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives|Maldive', 'Mali', 'Malta',
  'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico|México|Messico', 'Micronesia', 'Moldova', 'Mongolia', 'Montenegro',
  'Morocco|Maroc|Marocco|Marruecos|المغرب', 'Mozambique|Moçambique', 'Myanmar', 'Burma', 'Namibia', 'Nauru', 'Nepal',
  'Netherlands|The Netherlands|Nederland|Olanda', 'Holland', 'New Zealand|Nuova Zelanda', 'Nicaragua', 'Niger', 'Nigeria|Naija',
  'North Korea', 'North Macedonia', 'Macedonia', 'Norway|Norge|Norvegia', 'Oman', 'Pakistan', 'Palau', 'Palestine|Palestina|فلسطين', 'Panama|Panamá',
  'Papua New Guinea', 'Paraguay', 'Peru|Perú', 'Philippines|The Philippines|Filipinas|Pilipinas', 'Poland|Polska|Polonia',
  'Portugal|Portogallo', 'Qatar|قطر', 'Romania|România', 'Russia|Россия', 'Rwanda', 'Saint Lucia|St Lucia', 'Samoa', 'San Marino',
  'Saudi Arabia|Saudi|KSA|Arabia Saudita|السعودية', 'Senegal|Sénégal', 'Serbia|Srbija', 'Seychelles', 'Sierra Leone', 'Slovakia|Slovacchia',
  'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa|Sudafrica|Mzansi', 'South Korea', 'Korea|Corea', 'South Sudan',
  'Spain|España|Spagna', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden|Sverige|Svezia', 'Switzerland|Schweiz|Suisse|Svizzera', 'Syria|Siria',
  'Taiwan', 'Tajikistan|Таджикистан', 'Tanzania', 'Thailand|Thailandia|Tailandia', 'Timor-Leste|East Timor', 'Togo', 'Tonga',
  'Trinidad and Tobago|Trinidad', 'Tunisia|Tunisie', 'Turkey|Türkiye|Turchia', 'Turkmenistan|Туркменистан', 'Tuvalu', 'Uganda',
  'Ukraine|Ucraina|Україна|Украина', 'UAE|United Arab Emirates|Emirates|Emirati Arabi|الإمارات|ОАЭ', 'UK|United Kingdom|Great Britain|Britain|Regno Unito',
  'USA|United States|Stati Uniti|Estados Unidos|США', 'Uruguay', 'Uzbekistan|Oʻzbekiston|Узбекистан', 'Vanuatu', 'Vatican City|Vatican',
  'Venezuela', 'Vietnam|Viet Nam|Việt Nam', 'Yemen', 'Zambia', 'Zimbabwe|Zim',
  // not countries, but what people answer all the same
  'England|Inghilterra', 'Scotland|Scozia', 'Wales', 'Northern Ireland', 'Puerto Rico', 'Greenland', 'Curaçao|Curacao', 'Aruba',
  'California', 'Florida', 'Texas', 'Hawaii', 'Sicily|Sicilia', 'Sardinia|Sardegna', 'Punjab', 'Kerala',
];

/**
 * Short forms that are also everyday words in small letters ("la", "us", "ny"): they count only when
 * the comment has them in capitals ("LA", "L.A.", "NYC 🔥").
 */
const CAPITALS = { LA: 'LA', NY: 'New York', SF: 'San Francisco', DC: 'Washington', KL: 'Kuala Lumpur', HK: 'Hong Kong', US: 'USA', NZ: 'New Zealand' };

const ODD = { ı: 'i', ø: 'o', đ: 'd', ł: 'l', æ: 'ae', œ: 'oe', ß: 'ss', ʻ: '' };

/** A comment or a name as plain small letters: no accents, no emoji, no punctuation, one space between words. */
const plain = (s) =>
  String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ıøđłæœßʻ]/g, (c) => ODD[c])
    .replace(/[’'`.]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** every spelling → the name as we write it (the first place that takes a spelling keeps it) */
const NAMES = new Map();
for (const line of [...CITIES, ...COUNTRIES]) {
  const [name, ...others] = line.split('|');
  for (const spelling of [name, ...others]) {
    const key = plain(spelling);
    if (key && !NAMES.has(key)) NAMES.set(key, name);
  }
}

/** How many places and spellings the list has (for the tests and the guide). */
export const PLACE_COUNT = { cities: CITIES.length, countries: COUNTRIES.length, spellings: NAMES.size };

/** The longest comment that can be a place, in words. */
export const PLACE_WORDS = 3;

/**
 * The city or country a comment is, as WE spell it, or null.
 * Only when the whole comment is a place of the list ("dubai!!" → "Dubai", "São Paulo 🇧🇷" → "São Paulo"),
 * or a city followed by its country, both in the list ("Milan, Italy" → "Milan"). Three words at most.
 * Anything else, a mention, a sentence, one word we don't know ("Dubai baby") → null: nothing of the
 * comment is ever said back unless it is in the list. Never throws.
 */
export function placeIn(comment) {
  try {
    const raw = String(comment || '');
    if (!raw || raw.length > 80 || raw.includes('@')) return null;
    const letters = raw.replace(/[^\p{L}\p{N}]+/gu, '');
    if (Object.hasOwn(CAPITALS, letters)) return CAPITALS[letters];
    const words = plain(raw).split(' ').filter(Boolean);
    if (!words.length || words.length > PLACE_WORDS) return null;
    const whole = NAMES.get(words.join(' '));
    if (whole) return whole;
    for (let i = 1; i < words.length; i++) {
      const first = NAMES.get(words.slice(0, i).join(' '));
      if (first && NAMES.get(words.slice(i).join(' '))) return first;
    }
    return null;
  } catch {
    return null;
  }
}
