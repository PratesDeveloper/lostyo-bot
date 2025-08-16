const { translator: translateService } = require("@vitalets/google-translate-api");
const { private: priv } = require("../../config");
const log = require("../services/logger");
const { db } = require("../services/firebase");

/**
 * Traduz um texto com base nas configurações de idioma do servidor ou do membro.
 * @param {string} text O texto a ser traduzido.
 * @param {object} interaction O objeto de interação do Discord.
 * @returns {Promise<string>} O texto traduzido ou o original em caso de falha.
 */
const translate = async (text, interaction) => {
  // 1. Sai imediatamente se a funcionalidade estiver desativada na configuração.
  if (!priv.translator) {
    return text;
  }

  let guildLocale = null;
  let localeType = "default"; // Assume 'default' como padrão.

  // 2. Busca as configurações do servidor no Firebase, se houver um servidor.
  if (interaction?.guild) {
    try {
      const docRef = db.collection("guilds").doc(interaction.guild.id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const settings = docSnap.data().settings || {};
        guildLocale = settings.language;
        localeType = settings.localeType || "default";
      }
    } catch (err) {
      log.error(`Falha ao buscar configurações do servidor ${interaction.guild.id}: ${err.message}`);
      // Continua a execução para tentar usar o idioma do membro, se aplicável.
    }
  }
  
  // 3. Se o tipo for 'default', nenhuma tradução é necessária.
  if (localeType === "default") {
    return text;
  }

  let targetLang = null;

  // 4. Determina o idioma de destino com base no tipo de configuração.
  if (localeType === "member" && interaction?.member?.locale) {
    targetLang = interaction.member.locale.slice(0, 2); // Pega 'en' de 'en-US'
  } else if (localeType === "guild" && guildLocale) {
    targetLang = guildLocale.slice(0, 2); // Pega 'pt' de 'pt-BR'
  }

  // 5. Se nenhum idioma de destino foi encontrado, retorna o texto original.
  if (!targetLang) {
    return text;
  }

  // 6. Executa a tradução.
  try {
    // CORREÇÃO: Usa 'translateService' importado e desestrutura o resultado.
    const { text: translatedText } = await translateService(text, { to: targetLang });
    return translatedText || text; // Retorna o texto traduzido ou o original como fallback.
  } catch (err) {
    log.error(`Falha na tradução de "${text}" para "${targetLang}": ${err.message}`);
    return text; // Retorna o texto original em caso de erro na API.
  }
};

module.exports = { translate };