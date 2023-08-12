const { Client: SSHClient } = require('ssh2');
const Discord = require('discord.js');
const config = require('./config.json');

const client = new Discord.Client();

let statusMessage = null;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Code by 约 - Wick`);

  const channel = client.channels.cache.get(config.statusChannelId);
  if (!channel) {
    console.error('Channel not found.');
    return;
  }

  sendServerStatus(channel);

  // Update the status message every 30 seconds
  setInterval(() => {
    console.log('Triggering sendServerStatus...');
    sendServerStatus(channel);
  }, 30000); // 30000 = 30 seconds
});

client.login(config.discordToken);

async function sendServerStatus(channel) {
  console.log('Inside sendServerStatus...');

  const ssh = new SSHClient();
  let output = '';
  const serverConfig = config.server;

  ssh.on('ready', () => {
    ssh.exec('uptime', (err, stream) => {
      if (err) {
        console.error('Error executing command on server:', err);
        ssh.end();
        return;
      }

      stream.on('data', (data) => {
        output += data.toString();
      });

      stream.on('end', () => {
        if (!output.trim()) {
          console.error('Server status output is empty.');
          ssh.end();
          return;
        }

        console.log('Server status:', output);

       
        const uptimeInfo = parseUptime(output);

        
        if (!statusMessage) {
          
          channel.send(createEmbed(uptimeInfo)).then((message) => {
            statusMessage = message;
          });
        } else {
         
          statusMessage.edit(createEmbed(uptimeInfo));
        }

        ssh.end();
      });
    });
  });

  ssh.on('error', (err) => {
    console.error('Error connecting to the server:', err);
  });

  ssh.connect({
    host: serverConfig.ip,
    port: serverConfig.port,
    username: serverConfig.username,
    password: serverConfig.password,
  });
}

function createEmbed(uptimeInfo) {
  return new Discord.MessageEmbed()
    .setColor('#7289DA')
    .setTitle('Server Status Report')
    .setDescription(`\`\`\`\n${uptimeInfo}\n\`\`\``)
    .addField(`System is`, `🟢 online`, true)
    .addField(`Database Ping`, `📊 1ms`, true);
}

function parseUptime(output) {
  const uptimeArray = output.split(' up ');
  if (uptimeArray.length < 2) {
    console.error('Unable to parse server uptime.');
    return '';
  }

  const uptimeInfo = uptimeArray[1].split(',')[0].trim();
  const users = uptimeArray[1].split(',')[1].trim();
  const loadAverage = uptimeArray[1].split(',')[2].trim();

  return `
Date and Time: ${uptimeInfo}
Users Online: ${users}
Load Average: ${loadAverage}
`;
}
