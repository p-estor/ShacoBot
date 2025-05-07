import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('button')
  .setDescription('Muestra un botón interactivo');

export async function execute(interaction: ChatInputCommandInteraction) {
  const button = new ButtonBuilder()
    .setCustomId('test_button')
    .setLabel('Haz clic aquí')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await interaction.reply({ content: 'Pulsa el botón:', components: [row] });

  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15_000, // 15 segundos
  });

  collector?.on('collect', async (i) => {
    if (i.customId === 'test_button') {
      await i.reply({ content: `¡Has pulsado el botón!`, ephemeral: true });
    }
  });
}
