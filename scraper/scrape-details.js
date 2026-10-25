const BRANDS = ['audi', 'bmw', 'mercedes-benz', 'porsche', 'land-rover', 'jaguar', 'volvo']; // slugs d'URL
const MAX_PER_BRAND = 4;      // 7 marques x 4 = 28 modèles maximum
const PAUSE_MS = 1500;        // pause entre deux requêtes (politesse envers le site)
const INPUT = 'public/data/autos.json';              // produit par scrape.js
const OUTPUT = 'public/data/showroom-autos.json';    // fichier que lira Angular
const PHOTO_DIR = 'public/scraped-photos';           // photos locales (ignorées par git)
const HEADERS = { 'User-Agent': 'ShowroomAuto-student-project' };

let fs, path;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
class Blocked extends Error {}

// ---------- Requête HTTP : on s'arrête si le site refuse ----------
async function get(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 403 || res.status === 429) throw new Blocked('Le site refuse (' + res.status + ')');
  if (!res.ok) throw new Error('HTTP ' + res.status + ' pour ' + url);
  return res;
}

// ---------- Traductions pour les descriptions en anglais ----------
const EN = {
  carrosserie: { suv: 'SUV', berline: 'sedan', 'coupé': 'coupe', cabriolet: 'convertible', break: 'estate', monospace: 'MPV' },
  energie: { essence: 'petrol', diesel: 'diesel', hybride: 'hybrid', 'hybride rechargeable': 'plug-in hybrid', 'électrique': 'electric' },
  boite: { automatique: 'automatic', manuelle: 'manual' },
  trans: { traction: 'front-wheel drive', propulsion: 'rear-wheel drive', 'intégrale': 'all-wheel drive', '4x4': 'four-wheel drive' },
};
const tr = (map, v) => (v ? map[v.toLowerCase()] || v.toLowerCase() : '');
const num = (v) => {
  const m = String(v || '').replace(',', '.').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
};

// ---------- 1. Choisir les modèles : un par modèle, prix « à partir de » = le plus bas ----------
function choisirModeles(autos) {
  const groupes = {};
  for (const a of autos) {
    const p = (a.url || '').split('/'); // [https:, '', host, fr, neuf, marque, modele, version]
    const marque = p[5], modele = p[6];
    if (!BRANDS.includes(marque) || !modele) continue;
    const prix = Number(String(a.price).replace(/\D/g, ''));
    if (!prix) continue;
    const cle = marque + '/' + modele;
    if (!groupes[cle]) groupes[cle] = { marque, modele, brand: a.brand, minPrice: prix, version: a };
    else if (prix < groupes[cle].minPrice) { groupes[cle].minPrice = prix; groupes[cle].version = a; }
  }
  const choisis = [];
  for (const b of BRANDS) {
    const deLaMarque = Object.values(groupes).filter((g) => g.marque === b);
    deLaMarque.sort((x, y) => y.minPrice - x.minPrice); // les plus chers d'abord
    choisis.push(...deLaMarque.slice(0, MAX_PER_BRAND));
  }
  return choisis;
}

// ---------- 2. Lire la page d'une version : fiche technique, nom du modèle, photo ----------
async function lireModele(g, cheerio) {
  const res = await get(g.version.url);
  const $ = cheerio.load(await res.text());

  const fiche = {};
  $('table tbody tr').each((i, tr) => {
    const label = $(tr).find('th').text().trim();
    const valeur = $(tr).find('td').text().replace(/\s+/g, ' ').trim();
    if (label) fiche[label] = valeur;
  });

  // nom propre du modèle (ex. « Q2 ») : texte du lien /fr/neuf/marque/modele
  const chemin = '/fr/neuf/' + g.marque + '/' + g.modele;
  let nom = $('a')
    .filter((i, a) => ($(a).attr('href') || '').endsWith(chemin))
    .first().text().replace(/\s+/g, ' ').trim();
  if (!nom || nom.length > 25) nom = g.modele.replace(/-/g, ' ').toUpperCase();

  const image = $('meta[property="og:image"], meta[name="og:image"]').attr('content') || '';
  return { fiche, nom, image };
}

// ---------- 3. Description originale, composée à partir des faits de la fiche ----------
function decrire(brand, nom, f) {
  const corps = tr(EN.carrosserie, f['Carrosserie']) || 'car';
  const places = f['Nombre de places'];
  const energie = tr(EN.energie, f['Energie']);
  const ch = num(f['Puissance (ch.din)']);
  const boite = tr(EN.boite, f['Boîte']);
  const trans = tr(EN.trans, f['Transmission']);
  const acc = num(f['0-100 Km/h']);
  const vmax = num(f['Vitesse maxi']);
  const conso = num(f['Consommation mixte']);
  const coffre = num(f['Volume du coffre']);

  const phrases = [];
  let p1 = 'The ' + brand + ' ' + nom + ' is a ' + (places ? places + '-seat ' : '') + corps;
  if (energie) p1 += ' with a ' + energie + ' powertrain';
  if (ch) p1 += ' delivering ' + ch + ' hp';
  phrases.push(p1 + '.');
  if (boite || trans) phrases.push('It features ' + [boite && boite + ' transmission', trans].filter(Boolean).join(' and ') + '.');
  if (acc) phrases.push('It accelerates from 0 to 100 km/h in ' + acc + ' seconds' + (vmax ? ' and reaches ' + vmax + ' km/h.' : '.'));
  if (conso) phrases.push('Combined fuel consumption is ' + conso + ' L/100 km.');
  if (coffre) phrases.push('The boot offers ' + coffre + ' litres of space.');
  return phrases.join(' ');
}

// ---------- 4. Programme principal ----------
async function main() {
  fs = await import('node:fs');
  path = await import('node:path');
  const cheerio = await import('cheerio');

  const autos = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  let modeles = choisirModeles(autos);
  const limite = parseInt(process.argv[2]);
  if (limite) modeles = modeles.slice(0, limite);
  console.log(modeles.length + ' modèles à traiter');

  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const resultat = [];

  for (const g of modeles) {
    try {
      const { fiche, nom, image } = await lireModele(g, cheerio);
      await wait(PAUSE_MS);

      let fichierPhoto;
      if (image) {
        const m = image.split('?')[0].match(/\.(png|jpe?g|webp)$/i);
        fichierPhoto = g.marque + '-' + g.modele + (m ? m[0].toLowerCase() : '.png');
        const chemin = path.join(PHOTO_DIR, fichierPhoto);
        if (!fs.existsSync(chemin)) {
          const res = await get(image);
          fs.writeFileSync(chemin, Buffer.from(await res.arrayBuffer()));
          await wait(PAUSE_MS);
        }
      }

      resultat.push({
        id: g.version.id,
        brand: g.brand,
        model: nom,
        price: g.minPrice,                       // prix « à partir de »
        power: num(fiche['Puissance fiscale']) || undefined,   // en CV, comme tes 16 voitures
        photo: fichierPhoto,
        description: decrire(g.brand, nom, fiche),
        url: g.version.url,
        scrapedAt: new Date().toISOString(),
        specs: {
          body: fiche['Carrosserie'], energy: fiche['Energie'], hp: fiche['Puissance (ch.din)'],
          gearbox: fiche['Boîte'], acceleration: fiche['0-100 Km/h'],
          consumption: fiche['Consommation mixte'], trunk: fiche['Volume du coffre'],
        },
      });
      console.log('OK  ' + g.brand + ' ' + nom + ' — à partir de ' + g.minPrice + ' DT' + (fichierPhoto ? '' : ' (sans photo)'));
    } catch (e) {
      if (e instanceof Blocked) { console.log('ARRÊT : ' + e.message); break; }
      console.log('Ignoré ' + g.marque + '/' + g.modele + ' : ' + e.message);
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(resultat, null, 2));
  console.log(resultat.length + ' modèles écrits dans ' + OUTPUT);
}

main();