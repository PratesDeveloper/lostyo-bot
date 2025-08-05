/*
 * ┌──────────────────────────────────────────────┐
 * │ 📄 EXEMPLO DE COMANDO - Lostyo Bot Base      │
 * └──────────────────────────────────────────────┘
 * 
 * 💡 COMO FUNCIONA:
 * 
 * - Este é um exemplo de como você pode estruturar seus comandos de barra (/comandos)
 * - Usa SlashCommandBuilder para registrar o comando
 * - Usa EmbedBuilder para responder com um embed visual
 * - Usa "pub" como objeto de configuração central, que você pode importar do seu sistema
 * - Usa flags: 64 para tornar a resposta apenas visível ao usuário que executou o comando quando nescessario
 * - Mostra como usar tanto `pub.embedColor` (cor padrão) quanto `pub.embedColorError` (cor de erro)
 * - geralmente tem avatar + Requested by username no footer
 * - não user author na embed
 * 
 * 📁 PUB DEVE CONTER:
 *  - embedColor: Cor principal dos embeds (ex: "#00ffcc")
 *  - embedColorError: Cor para erros (ex: "#ff0000")
 *  - botIcon: Ícone do bot (URL)
 *  - appName: Nome do bot/aplicação
 *  - baseUrl: URL base do bot 
 *  - supportUrl: URL do servidor de suporte 
 */

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  // 🔧 Construção do comando
  data: new SlashCommandBuilder()
    .setName("example")
    .setDescription("Shows how to structure a basic command with embeds.")
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  // 🚀 Execução do comando
  async execute(interaction) {
    const pub = module.exports.config;

    // ✅ Embed de sucesso
    const successEmbed = new EmbedBuilder()
      .setColor(pub.embedColor)
      .setTitle("✅ Success Embed")
      .setDescription("This embed uses `pub.embedColor` as the main color.")
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ extension: "png", size: 64 })
      })

    // ❌ Embed de erro (exemplo)
    const errorEmbed = new EmbedBuilder()
      .setColor(pub.embedColorError)
      .setTitle("❌ Error Embed")
      .setDescription("This embed uses `pub.embedColorError` for error states.")
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ extension: "png", size: 64 })
      })

    // Envia ambos os embeds como exemplo (poderia ser um ou outro baseado em lógica)
    await interaction.reply({
      embeds: [successEmbed, errorEmbed],
      flags: 64 // 👁️ Visível apenas para quem executou
    });
  }
};
