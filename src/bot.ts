import { Client, GatewayIntentBits, REST, Routes, Interaction } from 'discord.js';
import 'dotenv/config';
import axios from 'axios';
import { getPuuid, getRandomIconId } from './utils/storage';  // Asegúrate de importar la función
import { data as pingCommand, execute as executePing } from './commands/ping';
import { data as buttonCommand, execute as executeButton } from './commands/button';
import { data as vincularCommand, execute as executeVincular } from './commands/vincular';
import { handleModalSubmit } from './commands/vincular'; // Importa la función que maneja el submit del modal

// Crear cliente de Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Crear cliente REST para registrar comandos
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

// Comandos a registrar
const commands = [pingCommand, buttonCommand, vincularCommand].map(command => command.toJSON());

// Registrar comandos al iniciar
client.once('ready', async () => {
  try {
    console.log('✅ Bot iniciado como ' + client.user?.tag);
    console.log('Eliminando comandos globales...');

    // 1) Borrar todos los comandos globales
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      { body: [] }
    );

    console.log('🔄 Registrando comandos en el servidor de pruebas...');

    // 2) Registrar solo en el guild de pruebas
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID!,
        process.env.GUILD_ID!
      ),
      { body: commands }
    );

    console.log('✅ Comandos registrados correctamente en el servidor de pruebas');
  } catch (error) {
    console.error('❌ Error al (re)registrar los comandos:', error);
  }
});

// Responder a interacciones de los comandos
client.on('interactionCreate', async (interaction: Interaction) => {
  // Comandos slash
  if (interaction.isCommand()) {
    const { commandName } = interaction;

    if (commandName === 'ping') {
      if (interaction.isChatInputCommand()) {
        await executePing(interaction);
      }
    }

    if (commandName === 'button') {
      if (interaction.isChatInputCommand()) {
        await executeButton(interaction);
      }
    }

    if (commandName === 'vincular') {
      if (interaction.isChatInputCommand()) {
        await executeVincular(interaction); // Ejecutar comando vincular
      }
    }
  }

  // Responder al modal de vinculación
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'vincularModal') {
      await handleModalSubmit(interaction); // Llamar a la función para manejar la validación
    }
  }

  // Responder al botón de verificación de icono
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('confirmarIcono-')) {
      const discordId = interaction.user.id;
      const puuid = getPuuid(discordId);
  
      console.log(`PUIID ${puuid}"`);
  
      try {
        const response = await axios.get(
          `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
          {
            headers: {
              'X-Riot-Token': process.env.RIOT_API_KEY!,
            },
          }
        );
  
        const profileIconIdActual = response.data.profileIconId;
        const iconEsperado = getRandomIconId(discordId);
  
        const message = profileIconIdActual === iconEsperado
          ? `✅ ¡Verificación completada! Has cambiado correctamente tu icono al número ${iconEsperado}.`
          : `❌ El icono no coincide. Asegúrate de cambiarlo al número **${iconEsperado}** y vuelve a intentarlo.`;
  
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: message, ephemeral: true });
        } else {
          await interaction.followUp({ content: message, ephemeral: true });
        }
      } catch (error) {
        console.error('Error al verificar el icono:', error);
        const errorMessage = '❌ Hubo un error al comprobar el icono. Intenta de nuevo más tarde.';
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        }
      }
    }
  }
  


});

client.login(process.env.DISCORD_TOKEN);
