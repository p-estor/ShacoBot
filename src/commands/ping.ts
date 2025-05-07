import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Responde con Pong!');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply('Pong!');
}
