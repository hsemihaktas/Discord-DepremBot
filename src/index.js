const { Client, IntentsBitField } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');
const cheerio = require('cheerio');

const token = '"DISCORD BOT TOKEN"';
const clientId = 'DISCORD BOT CLIENT ID';
const channelIds = ['CHANNEL ID'];

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
  setInterval(checkEarthquakes, 5000);
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

let lastEarthquake = null;

// Deprem verilerini anlık olarak kontrol etmek için bir fonksiyon
async function checkEarthquakes() {
  const url = 'https://deprem.afad.gov.tr/last-earthquakes.html';

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const firstRow = $('table tr').eq(1);
    const columns = firstRow.find('td');
    const tarih = $(columns[0]).text().trim();
    const enlem = $(columns[1]).text().trim();
    const boylam = $(columns[2]).text().trim();
    const derinlik = $(columns[3]).text().trim();
    const tip = $(columns[4]).text().trim();
    const buyukluk = $(columns[5]).text().trim();
    const yer = $(columns[6]).text().trim();

    let siddet = parseFloat($(columns[5]).text().trim());

    if (!isNaN(siddet)) {
      if (!lastEarthquake || lastEarthquake.tarih !== tarih) {
        lastEarthquake = { tarih, siddet };

        let message = `🚨 Yeni bir deprem! 🚨\nTarih: ${tarih}\nYer: ${yer}\nŞiddet: ${siddet}`;
        if (siddet < 4) {
          channelIds.forEach(channelId => {
            const channel = client.channels.cache.get(channelId);
            if (channel) {
              channel.send(message);
            }
          });
        } else {
          message = '@everyone ' + message;
          channelIds.forEach(channelId => {
            const channel = client.channels.cache.get(channelId);
            if (channel) {
              channel.send(message);
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Deprem verisi alınırken bir hata oluştu:', error);
  }
}



client.login(token);