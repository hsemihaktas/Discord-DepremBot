const { Client, IntentsBitField } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');
const cheerio = require('cheerio');

const token = '"DISCORD BOT TOKEN"';
const clientId = 'DISCORD BOT CLIENT ID';
const channelId = ['CHANNEL ID'];

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.on('ready', (c) => {
  console.log(`✅ ${c.user.tag} is online.`);
  setInterval(checkEarthquakes,5000);
});

const commands = [
  new SlashCommandBuilder()
    .setName('deprem')
    .setDescription('Son depremleri gösterir')
    .addIntegerOption(option =>
      option.setName('count').setDescription('Gösterilecek deprem sayısını belirler')
    ),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Slash komutları kaydediliyor...');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log('Slash komutları başarıyla kaydedildi.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;
  const depremCount = options.getInteger('count') || 1;

  if (commandName === 'deprem') {
    const url = 'https://deprem.afad.gov.tr/last-earthquakes.html';
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      let depremler = "";
      let number = 0;
      $('table tr').each((index, element) => {
        if (index === 0) return;
        if (number < depremCount) {
          const columns = $(element).find('td');
          const tarih = $(columns[0]).text().trim();
          const enlem = $(columns[1]).text().trim();
          const boylam = $(columns[2]).text().trim();
          const derinlik = $(columns[3]).text().trim();
          const tip = $(columns[4]).text().trim();
          const buyukluk = $(columns[5]).text().trim();
          const yer = $(columns[6]).text().trim();
          depremler += `***Zaman:*** ${tarih} | ***Yer:*** ${yer} | ***Büyüklük:*** ${buyukluk} \n`;
          number++;
        }
      });
      if (depremler.length > 0) {
        const mesaj = depremler;
        await interaction.reply({ content: `Son ${depremCount} deprem:\n${mesaj}` });
      } else {
        await interaction.reply({ content: 'Deprem verisi bulunamadı.' });
      }
    } catch (error) {
      console.error('Hata:', error);
      await interaction.reply({ content: 'Deprem verisi alınırken bir hata oluştu.' });
    }
  }
});

let lastQuakeId = "Son Deprem ID"; // Elle son deprem ID yi giriniz. Kod çalıştırıldığı an o depremden sonra kontrol etmeye başlayacak. Kod durmadığı sürece buraya bir daha ellemeyeceksiniz.

// Deprem verilerini anlık olarak kontrol etmek için bir fonksiyon
async function checkEarthquakes() {
  const url = 'https://deprem.afad.gov.tr/last-earthquakes.html';

  try {
    const response = await axios.get(url);
    const $ = await cheerio.load(response.data);
    const earthquakeRows = $('table tr').slice(1); // İlk satırı atlayarak tüm depremleri al

    const newEarthquakes = []; // Yeni depremleri tutacak dizi

    earthquakeRows.each((index, row) => {
      const columns = $(row).find('td');
      const depremId = $(columns[7]).text().trim();

      if (depremId) {
        if (depremId > lastQuakeId) {
          const tarih = $(columns[0]).text().trim();
          const yer = $(columns[6]).text().trim();
          const siddet = parseFloat($(columns[5]).text().trim());

          const newEarthquake = { depremId, tarih, siddet, yer };
          newEarthquakes.push(newEarthquake);
        }
      }
    });

    if (newEarthquakes.length > 0) {
      const channel = client.channels.cache.get(channelId); // Tek kanalı aldık
      if (channel) {
        newEarthquakes.sort((a, b) => a.depremId - b.depremId);
        for (const earthquake of newEarthquakes) {
          const earthquakeInfo = `🚨 Yeni bir deprem! 🚨\n Deprem ID: ${earthquake.depremId}\n Tarih: ${earthquake.tarih}\n Şiddet: ${earthquake.siddet}\n Yer: ${earthquake.yer}`;
          if (earthquake.siddet > 4) {
            await channel.send('@everyone ' + earthquakeInfo); // Everyone etiketi ile gönder
          } else {
            await channel.send(earthquakeInfo);
          }
        }
      }
      lastQuakeId = newEarthquakes[newEarthquakes.length - 1].depremId;
      newEarthquakes.length = 0; // Gönderildikten sonra diziyi boşalt
    }
  } catch (error) {
    console.error('Deprem verisi alınırken bir hata oluştu:', error);
  }
}



client.login(token);