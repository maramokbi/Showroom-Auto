const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const url = 'https://www.automobile.tn/fr/neuf';
async function main() {
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const response = await fetch(url, {
    headers: { 'User-Agent': 'ShowroomAuto-student-project' },
  });
  console.log('Status :', response.status);

  const html = await response.text();
const $ = cheerio.load(html);
const brands = [];

$('a[href^="/fr/neuf/"]').has('img').each((i, el) => {
  brands.push({
    name: $(el).find('img').attr('alt'),
    path: $(el).attr('href'),
  });
});

const all = [];

for (const brand of brands) {
  try {
    const models = await getModels(brand);
    all.push(...models);
    console.log(brand.name, ':', models.length, 'modèles');
  } catch (error) {
    console.log(brand.name, ': erreur', error.message);
  }
  await pause(1500);
}

const unique = all.filter((m, i) => all.findIndex(x => x.id === m.id) === i);
console.log(all.length, 'modèles récupérés,', unique.length, 'sans doublons');
const scrapedAt = new Date().toISOString();
const result = unique.map(m => ({
  id: Number(m.id),
  brand: m.brand,
  model: m.name.startsWith(m.brand) ? m.name.slice(m.brand.length).trim() : m.name,
  price: m.price,
  url: m.url,
  scrapedAt,
}));

const folder = path.join(__dirname, '..', 'public', 'data');
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(path.join(folder, 'autos.json'), JSON.stringify(result, null, 2));

console.log('Fichier écrit :', result.length, 'modèles');
console.log('Sans prix :', result.filter(m => m.price === null).length);
}
async function getModels(brand) {
  const response = await fetch('https://www.automobile.tn' + brand.path, {
    headers: { 'User-Agent': 'ShowroomAuto-student-project' },
  });
  if (!response.ok) throw new Error('Status ' + response.status);
  const html = await response.text();
  const $ = cheerio.load(html);
  const models = [];

  $('.versions-item').each((i, el) => {
    const digits = $(el).find('.price').text().replace(/\D/g, '');
    models.push({
      id: $(el).parent().attr('data-key'),
      brand: brand.name,
      name: $(el).find('h2').text().trim(),
      price: Number(digits) || null,
      url: 'https://www.automobile.tn' + $(el).find('a').attr('href'),
    });
  });

  return models;
}
main();