import axios from 'axios';
import { storeUserData, userData } from '../utils/storage';  
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  InteractionCollector,
} from 'discord.js';

async function safeReply(interaction: any, message: string) {
  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: message, ephemeral: true });
    } else {
      await interaction.followUp({ content: message, ephemeral: true });
    }
  } catch (err) {
    console.error('❌ Error enviando respuesta segura:', err);
  }
}



const RIOT_API_KEY = process.env.RIOT_API_KEY;

export const data = new SlashCommandBuilder()
  .setName('vincular')
  .setDescription('Vincula tu cuenta de LoL a Discord.');

export async function execute(interaction: ChatInputCommandInteraction) {
  const modal = new ModalBuilder()
    .setCustomId('vincularModal')
    .setTitle('Vincular cuenta LoL');

  const aliasInput = new TextInputBuilder()
    .setCustomId('alias')
    .setLabel('Alias (nombre de invocador)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ej: Faker')
    .setRequired(true);

  const tagInput = new TextInputBuilder()
    .setCustomId('tag')
    .setLabel('Tag (#1234)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ej: #EUW')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(aliasInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(tagInput)
  );

  await interaction.showModal(modal);
}

export async function handleModalSubmit(interaction: any) {
  if (interaction.customId === 'vincularModal') {
    const alias = interaction.fields.getTextInputValue('alias');
    const tag = interaction.fields.getTextInputValue('tag');

    try {
      // Paso 1: Obtener puuid
      const puuidResponse = await axios.get(
        `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${alias}/${tag}`,
        {
          headers: { 'X-Riot-Token': RIOT_API_KEY },
        }
      );
      const puuid = puuidResponse.data.puuid;

      // Paso 2: Obtener summoner
      const summonerResponse = await axios.get(
        `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
        {
          headers: { 'X-Riot-Token': RIOT_API_KEY },
        }
      );
      const summoner = summonerResponse.data;
      const summonerId = summoner.id;

      // Paso 3: Generar icono aleatorio
      const randomIconId = Math.floor(Math.random() * 28) + 1;
      const iconUrl = `https://ddragon.leagueoflegends.com/cdn/14.9.1/img/profileicon/${randomIconId}.png`;

      storeUserData(interaction.user.id, puuid, randomIconId);

      // Paso 4: Enviar embed con imagen y botón
      const embed = new EmbedBuilder()
        .setTitle('Verificación de icono')
        .setDescription(`Cambia tu icono de invocador al que ves abajo y luego pulsa "Confirmar".`)
        .setImage(iconUrl)
        .setColor('Blue');

      const button = new ButtonBuilder()
        .setCustomId(`confirmarIcono-${puuid}-${randomIconId}`)
        .setLabel('✅ Confirmar')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await interaction.reply({
        content: `Alias: ${alias} | Tag: ${tag}`,
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });

      // Crear un colector para esperar la interacción del botón
      const filter = (buttonInteraction: any) => buttonInteraction.customId === `confirmarIcono-${puuid}-${randomIconId}` && buttonInteraction.user.id === interaction.user.id;

      const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async (buttonInteraction: any) => {
        try {
          await buttonInteraction.deferReply({ ephemeral: true });
      
          // Verificar si el icono fue cambiado
          const updatedSummonerResponse = await axios.get(
            `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
            { headers: { 'X-Riot-Token': RIOT_API_KEY } }
          );
          const updatedIconId = updatedSummonerResponse.data.profileIconId;
      
          if (updatedIconId !== randomIconId) {
            await buttonInteraction.editReply({
              content: '❌ No has cambiado tu icono al correcto. Intenta de nuevo.',
            });
            return;
          }
      
          // Paso 5: Obtener rango
          const rankResponse = await axios.get(
            `https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`,
            { headers: { 'X-Riot-Token': RIOT_API_KEY } }
          );
          const rankData = rankResponse.data;
      
          const soloRank = rankData.find((entry: { queueType: string; }) => entry.queueType === 'RANKED_SOLO_5x5');
          const tier = soloRank ? soloRank.tier : 'UNRANKED';
      
          const tierRoleMap = {
            IRON: 'Iron',
            BRONZE: 'Bronze',
            SILVER: 'Silver',
            GOLD: 'Gold',
            PLATINUM: 'Platinum',
            DIAMOND: 'Diamond',
            MASTER: 'Master',
            GRANDMASTER: 'Grandmaster',
            CHALLENGER: 'Challenger',
            UNRANKED: 'Unranked',
          };
      
          const roleName = tierRoleMap[tier as keyof typeof tierRoleMap] || 'Rol No Clasificado';
      
          const guild = interaction.guild;
          const member = await guild.members.fetch(interaction.user.id);
          const role = guild.roles.cache.find((role: { name: string; }) => role && role.name === roleName);
      
          if (role) {
            await member.roles.add(role);
            console.log(`Rol ${roleName} asignado a ${interaction.user.username}`);
          } else {
            console.log(`No se encontró el rol ${roleName}`);
          }
      
          await buttonInteraction.editReply({
            content: `✅ Icono verificado correctamente. El rol ${roleName} ha sido asignado.`,
          });
        } catch (error) {
          console.error('Error durante la verificación:', error);
          try {
            await safeReply(buttonInteraction, '❌ Hubo un error al verificar o asignar el rol.');
          } catch (e) {
            console.error('No se pudo enviar respuesta segura:', e);
          }
        }
      });
      
      
      collector.on('end', () => {
        console.log('El colector de interacciones ha finalizado.');
      });

    } catch (error) {
      console.error('Error al vincular cuenta:', error);
      await safeReply(interaction, '❌ No se pudo vincular la cuenta. Verifica que los datos sean correctos.');

    }
  }
}
