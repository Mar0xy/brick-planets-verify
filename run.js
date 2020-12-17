require('dotenv').config();
const mysql = require('mysql2');
const Discord = require('discord.js');

const bpv = new Discord.Client();

bpv.list = new Discord.Collection();

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'user',
    password: 'password',
    database: 'name'
});

function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

async function checkCode(message, user) {
    connection.query(
        'SELECT * FROM `discord` WHERE `code` = "' + message.content + '" AND `uid` = ' +  user.uid,
        function(err, results, fields) {
            if(err || results.length == 0) {
                connection.query('SELECT * FROM `discord` WHERE `uid` = ' +  user.uid,
                function(err, results, fields) {
                    if(err || results.length == 0) {
                        message.channel.send('Seems like you haven\'t started verification yet.\nPlease visit https://brickplanets.com/discord-verification/ to start.')
                    } else {
                        connection.query(
                            'UPDATE `discord` SET `code` = "' + randomString(5, "0123456789") + '" WHERE `uid` = "' + user.uid + '"',
                            function(err, results, fields) {
                                    message.channel.send('Seems like the code you entered is incorrect.\nWe have refreshed the code Please use the new code.')
                            }
                        );
                    }
                }
                );
            } else {
                connection.query(
                    'UPDATE `discord` SET `did` = "' + user.id + '" WHERE `uid` = "' + user.uid + '"',
                    function(err, results, fields) {
                        connection.query(
                            'INSERT INTO `inventory` (itemID, userID, itemType, purchaseDate) VALUES ("242", "' + user.uid + '", "hats", "1602627180")',
                            function(err, results, fields) {
                                message.channel.send('You have now been verified.\nI have set your nickname and added the role.');
                                bpv.guilds.cache.find(guild => guild.id === 'GuildID').members.cache.find(member => member.id == user.id).roles.add('VerifiedroleID');
                                bpv.guilds.cache.find(guild => guild.id === 'GuildID').members.cache.find(member => member.id == user.id).setNickname(user.username);
                                bpv.list.delete(message.channel.id);
                            }
                        );
                    }
                );
            }
        }
    );
}

async function getUID(message) {
    connection.query(
        'SELECT * FROM `users` WHERE `username` = "' + message.content + '"',
        function(err, results, fields) {
            if(err) {
                message.channel.send('Seems like the user doesn\'t exist.\nPlease provide another Username')
            } else {
                bpv.list.set(message.channel.id, { id: message.author.id, uid: results[0].id, step: 2, username: results[0].username })
                message.channel.send('User was found!\nPlease provide the code you got from https://brickplanets.com/discord-verification/')
            }
        }
    );
}

bpv.on('message', async message => {
    if (message.channel.type == "text" || message.author.bot || bpv.guilds.cache.find(guild => guild.id === 'GuildID').members.cache.find(member => member.id == message.author.id).roles.cache.has('VerifiedroleID')) return
    const args = message.content.slice(process.env.prefix.length).trim().split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);

    args.forEach((part, index) => {
        args[index] = args[index].replace(/([()[{}*+$^\\])/g, '')
        args[index] = args[index].replace(/"/g, '')
    });

    const command = args.shift().toLowerCase();

    const active = bpv.list.find(channel => channel.id == message.author.id);

    if(active) {
        if(active.step == 1) {
            await getUID(message)
        } else if (active.step == 2) {
            await checkCode(message, active)
        }
    }
    
    if(command == "start") {
        message.channel.send('Starting Verification Process.')
        bpv.list.set(message.channel.id, { id: message.author.id, uid: 0, step: 1 })
        message.channel.send('Please provide me your username')
    }
})

bpv.login(process.env.key)
