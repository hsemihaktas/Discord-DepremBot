const { Client, IntentsBitField } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const channelIds = ['CHANELL ID '];


const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

let lastEarthquake = null; // En son deprem verisini saklamak için bir değişken

// Deprem verilerini anlık olarak kontrol etmek için bir fonksiyon
async function checkEarthquakes() {
  const url = 'https://deprem.afad.gov.tr/last-earthquakes.html';

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const firstRow = $('table tr').eq(1); // İlk satır, yani en son deprem verisi
    const columns = firstRow.find('td');
    const tarih = $(columns[0]).text().trim();
    const enlem = $(columns[1]).text().trim();
    const boylam = $(columns[2]).text().trim();
    const derinlik = $(columns[3]).text().trim();
    const tip = $(columns[4]).text().trim();
    const buyukluk = $(columns[5]).text().trim();
    const yer = $(columns[6]).text().trim();

    let siddet = parseFloat($(columns[5]).text().trim());

    // Eğer daha önce bir deprem varsa ve yeni deprem ile aynı değilse, bildirim gönder
    if (!isNaN(siddet)) {
      if (!lastEarthquake || lastEarthquake.tarih !== tarih) {
        console.log("güncellendi")
        lastEarthquake = { tarih, siddet }; // En son depremi güncelle
        console.log(lastEarthquake)

        // Şiddet 4 veya üzerinde ise @everyone etiketi ile bildirim gönder
        let message = `🚨 Yeni bir deprem! 🚨\nTarih: ${tarih}\nYer: ${yer}\nŞiddet: ${siddet}`;
        if (siddet < 4) {
          // Şiddet 4'ten küçükse, normal bir mesaj gönder
          channelIds.forEach(channelId => {
            const channel = client.channels.cache.get(channelId);
            if (channel) {
              channel.send(message);
            }
          });
        } else {
          // Şiddet 4 veya daha büyükse, @everyone etiketi ile bildirim gönder
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

client.on('ready', (c) => {
  console.log(`✅ ${c.user.tag} is online.`);
  setInterval(checkEarthquakes, 5000); // 1 dakika aralıklarla kontrol et
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) {
    return;
  }



  if (message.content.startsWith('!deprem')) {
    const args = message.content.split(' ');
    if (args.length !== 2) {
      message.reply('Lütfen doğru bir komut formatı kullanın: `!deprem <kaç deprem gösterilecek>`');
      return;
    }

    const depremCount = parseInt(args[1]);

    if (isNaN(depremCount) || depremCount <= 0) {
      message.reply('Lütfen geçerli bir sayı girin.');
      return;
    }
    const url = 'https://deprem.afad.gov.tr/last-earthquakes.html'; // AFAD websitesi deprem listesi URL'i
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      let depremler = "";
      let number = 0;
      $('table tr').each((index, element) => {
        if (index === 0) return; // İlk satır başlık olduğu için atlanır
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

      // Son belirtilen sayıda depremi Discord'a mesaj olarak gönderme
      if (depremler.length > 0) {
        const mesaj = depremler;
        message.reply({ content: `Son ${depremCount} deprem:\n${mesaj}` });
      } else {
        message.reply({ content: 'Deprem verisi bulunamadı.' });
      }
    } catch (error) {
      console.error('Hata:', error);
      message.reply({ content: 'Deprem verisi alınırken bir hata oluştu.' });
    }
  }
});

client.login('DISCORD BOT TOKEN');
