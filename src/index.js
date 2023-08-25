const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

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
      let mesaj = "";
      let number = 0;
      const newEarthquakes = [];

      $('table tr').each((index, element) => {
        if (index === 0) return;
        if (number < depremCount) {
          const columns = $(element).find('td');
          const depremId = $(columns[7]).text().trim();
          const tarih = $(columns[0]).text().trim();
          const yer = $(columns[6]).text().trim();
          const siddet = parseFloat($(columns[5]).text().trim());

          const newEarthquake = { depremId, tarih, siddet, yer };
          newEarthquakes.push(newEarthquake);
          number++;
        }
      });
      newEarthquakes.sort((a, b) => a.depremId - b.depremId);
      for (const earthquake of newEarthquakes) {
        mesaj += `***${earthquake.tarih} -  ${earthquake.yer} -${earthquake.siddet} ***\n`;
      }
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Depremler`,
          url: "https://deprem.afad.gov.tr/last-earthquakes.html",
          iconURL: "https://pbs.twimg.com/profile_images/1676519262561640450/1ffT91X7_400x400.jpg",
        })
        .setDescription(`${mesaj}`)
        .setColor("#37ff00")
        .setFooter({
          text: "DISCORD BOT NAME",
          iconURL: "DİSCORD BOT PROFİL PHOTO URL",
        })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] })


    } catch (error) {
      console.error('Hata:', error);
      await interaction.reply({ content: 'Deprem verisi alınırken bir hata oluştu.' });
    }
  }
});

async function fetchEarthquakeData() {
  try {
      const response = await axios.get('https://deprem.afad.gov.tr/last-earthquakes.html');
      const $ = cheerio.load(response.data);

      const earthquakeData = [];

      $('tbody tr').each((index, element) => {
          const columns = $(element).find('td');
          if (columns.length >= 8) {
              const time = $(columns[0]).text().trim();
              const location = $(columns[6]).text().trim();
              const magnitude = $(columns[5]).text().trim();
              const earthquakeId = $(columns[7]).text().trim();

              earthquakeData.push({ time, location, magnitude, earthquakeId });
          }
      });

      return earthquakeData;
  } catch (error) {
      console.error('Error fetching earthquake data:', error);
      return [];
  }
}

async function sendEarthquakeDataToDiscord() {
  const earthquakeData = await fetchEarthquakeData();

  if (earthquakeData.length === 0) return;

  earthquakeData.sort((a, b) => parseInt(a.earthquakeId) - parseInt(b.earthquakeId));

  let lastSavedId = null;
  try {
      const logData = fs.readFileSync('deprem.log', 'utf8');
      lastSavedId = parseInt(logData.trim());
  } catch (error) {
      console.error('Error reading earthquake log:', error);
  }

  for (const earthquake of earthquakeData) {
      const { earthquakeId, time, location, magnitude } = earthquake;

      if (lastSavedId === null || parseInt(earthquakeId) > lastSavedId) {
          const color = getColorForMagnitude(magnitude);
          const embed = new EmbedBuilder()
              .setAuthor({ name: `Yeni Deprem (ID: ${earthquakeId})`, iconURL: 'https://play-lh.googleusercontent.com/UwVDrdtJTUgZBM-7qVxrgEV14VYt50TXlC9SfgSaUJP4EcNzPbKuMx4Qv1fyMjsVsw=w240-h480-rw', url: 'https://deprem.afad.gov.tr/last-earthquakes.html' })
              .setColor(color)
              .setFooter({
                text: "DISCORD BOT NAME",
                iconURL: "DİSCORD BOT PROFİL PHOTO URL",
              })
              .addFields(
                  { name: 'Tarih', value: time, inline: true },
                  { name: 'Yer', value: location, inline: true },
                  { name: 'Büyüklük', value: magnitude, inline: true },
              )

          const channel = client.channels.cache.get(channelId);
          if (channel) {
              if (magnitude > 5.0)
                  channel.send({ content: "<@&1144528709206954024>", embeds: [embed] })
              else
                  channel.send({ embeds: [embed] });
          }

          lastSavedId = parseInt(earthquakeId);
      }
  }

  try {
      fs.writeFileSync('deprem.log', lastSavedId.toString());
  } catch (error) {
      console.error('Error writing earthquake log:', error);
  }
}

function getColorForMagnitude(magnitude) {
  if (magnitude < 3.0) return '#b0eb9a';
  else if (magnitude < 4.0) return '#8abdc0';
  else if (magnitude < 5.0) return '#24655c';
  else if (magnitude < 6.0) return '#cca36d';
  else if (magnitude < 7.0) return '#ce6f38';
  else return '#bf2e47';
}

setInterval(sendEarthquakeDataToDiscord, 10000);

client.login(token);